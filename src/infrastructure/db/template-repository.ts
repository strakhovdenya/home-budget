import 'server-only';
import {createHash} from 'node:crypto';
import {and,eq,lte,inArray,sql,getTableColumns} from 'drizzle-orm';
import type {NodePgDatabase} from 'drizzle-orm/node-postgres';
import {encodeCanonical,normalizeValue} from '@/domain/updates/canonical-value';
import {prepareCommand,parseReceipt,validUuid} from '@/domain/updates/validation';
import {exactKeys} from '@/domain/checkpoints/validation';
import {parseTemplateInput,acceptedObligationPayload,commandDocument,type Template,type TemplateInput} from '@/domain/recurring/templates';
import {parsePeriod} from '@/domain/periods/period';
import {sameDocument} from '@/domain/transitions/planning';
import {snapshot} from '@/domain/obligations/lifecycle';
import type {AuthorizedScope,PreparedCommand,CommitReceipt,AuditDescriptor} from '@/domain/updates/contracts';
import {berlinDateFromEpochMilliseconds} from '@/shared/pure/berlin-date';
import {commitBatch,BatchFailure,rejectBatch,type Transaction} from './commit';
import {writeObligations} from './obligation-writer';
import {loadBudgetContext} from './budget-update-reader';
import {readProjectionContext} from './projection-reader';
import {jsonDocument,databaseToday} from './transition-state';
import * as s from './schema';
const kinds=['TEMPLATE_CONFIG','TEMPLATE_ACCEPT','TEMPLATE_DECLINE'];
export const TEMPLATE_LIMITS=Object.freeze({updates:2048,audits:12000,bytes:4*1024*1024,templates:64});
function hash(value:unknown){return createHash('sha256').update(encodeCanonical(normalizeValue(value))).digest('hex');}
function key(id:string,period:string){return id+':'+period;}
function parsed(c:PreparedCommand):TemplateInput{try{return parseTemplateInput(c.payload);}catch{return rejectBatch('INVALID_INPUT');}}
type Proof={receipt:CommitReceipt;input:TemplateInput;document:unknown};
type State={bytes:bigint;auditCount:number;configs:Map<string,Template>;decisions:Map<string,Proof>;proofs:Map<string,Proof>};
/** Complete at-K lookup, never a latest page. Preflight refuses before JSON materialization. */
export async function verifyTemplateHistory(tx:Transaction,scope:AuthorizedScope,cut:bigint):Promise<State>{
  await tx.execute(sql.raw("SET LOCAL statement_timeout='10000ms'"));
  const where=and(eq(s.budgetUpdates.ownerUserId,scope.ownerUserId),eq(s.budgetUpdates.accountId,scope.accountId),lte(s.budgetUpdates.recordedSeq,cut),inArray(s.budgetUpdates.kind,kinds));
  const pre=await tx.execute<{n:string;audits:string;bytes:string}>(sql`SELECT count(DISTINCT u.id)::text n,count(a.id)::text audits,
    coalesce(sum(octet_length(to_jsonb(u)::text)+coalesce(octet_length(to_jsonb(a)::text),0)),0)::text bytes
    FROM budget_updates u LEFT JOIN audit_events a ON a.owner_user_id=u.owner_user_id AND a.account_id=u.account_id AND a.budget_update_id=u.id
    WHERE u.owner_user_id=${scope.ownerUserId} AND u.account_id=${scope.accountId} AND u.recorded_seq<=${cut}
      AND u.kind IN ('TEMPLATE_CONFIG','TEMPLATE_ACCEPT','TEMPLATE_DECLINE')`);
  if(BigInt(pre.rows[0].n)>BigInt(TEMPLATE_LIMITS.updates)||BigInt(pre.rows[0].audits)>BigInt(TEMPLATE_LIMITS.audits)
    ||BigInt(pre.rows[0].bytes)>BigInt(TEMPLATE_LIMITS.bytes))return rejectBatch('STORAGE_ERROR');
  const misplaced=await tx.execute<{bad:boolean}>(sql`SELECT EXISTS(SELECT 1 FROM audit_events a JOIN budget_updates u
    ON u.owner_user_id=a.owner_user_id AND u.account_id=a.account_id AND u.id=a.budget_update_id
    WHERE a.owner_user_id=${scope.ownerUserId} AND a.account_id=${scope.accountId} AND a.recorded_seq<=${cut}
    AND a.before_after->'entity'->>'type' IN ('TEMPLATE_CONFIG','TEMPLATE_DECISION')
    AND u.kind NOT IN ('TEMPLATE_CONFIG','TEMPLATE_ACCEPT','TEMPLATE_DECLINE')) bad`);
  if(misplaced.rows[0].bad)return rejectBatch('STORAGE_ERROR');
  const updates=await tx.select({...getTableColumns(s.budgetUpdates),recordedAt:sql<string>`to_char(${s.budgetUpdates.recordedAt} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`}).from(s.budgetUpdates).where(where).orderBy(s.budgetUpdates.recordedSeq);
  const verificationClock=await databaseToday(tx);
  if(BigInt(updates.length)!==BigInt(pre.rows[0].n))return rejectBatch('STORAGE_ERROR');
  const result:State={bytes:BigInt(pre.rows[0].bytes),auditCount:Number(pre.rows[0].audits),configs:new Map(),decisions:new Map(),proofs:new Map()};if(!updates.length)return result;
  const audits=await tx.select().from(s.auditEvents).where(and(eq(s.auditEvents.ownerUserId,scope.ownerUserId),eq(s.auditEvents.accountId,scope.accountId),
    inArray(s.auditEvents.budgetUpdateId,updates.map(u=>u.id))));
  if(BigInt(audits.length)!==BigInt(pre.rows[0].audits))return rejectBatch('STORAGE_ERROR');
  let financial:Awaited<ReturnType<typeof readProjectionContext>>|null=null;
  if(updates.some(u=>u.kind==='TEMPLATE_ACCEPT')){
    const [a]=await tx.select().from(s.accounts).where(and(eq(s.accounts.ownerUserId,scope.ownerUserId),eq(s.accounts.id,scope.accountId)));
    if(!a)return rejectBatch('FORBIDDEN');const clock=await databaseToday(tx);
    financial=await readProjectionContext(tx,scope,a,clock.today,cut);
    const work=financial.history.positions.length+financial.history.orderings.length+financial.history.checkpoints.length+financial.history.vectors.length+financial.obligationHistory.events.length+1;
    if(updates.length*work>4000000)return rejectBatch('STORAGE_ERROR');
  }
  const byBatch=new Map<string,typeof audits>();for(const a of audits){const g=byBatch.get(a.budgetUpdateId)??[];g.push(a);byBatch.set(a.budgetUpdateId,g);}
  for(const u of updates){
    const group=byBatch.get(u.id)??[],indices=new Set<number>();
    for(const a of group){
      const d=a.beforeAfter;
      if(a.recordedSeq!==u.recordedSeq||a.eventKind!==u.kind||!exactKeys(d,['schemaVersion','eventIndex','entity','before','after'])
        ||d.schemaVersion!==1||!exactKeys(d.entity,['type','id'])||!validUuid(d.entity.id)||!Number.isSafeInteger(d.eventIndex)
        ||(d.eventIndex as number)<0||(d.eventIndex as number)>=group.length||indices.has(d.eventIndex as number))return rejectBatch('STORAGE_ERROR');
      indices.add(d.eventIndex as number);
    }
    const controls=group.filter(a=>['TEMPLATE_CONFIG','TEMPLATE_DECISION'].includes((a.beforeAfter as {entity:{type:string}}).entity.type));
    if(controls.length!==1)return rejectBatch('STORAGE_ERROR');
    const doc=controls[0].beforeAfter as {entity:{type:string;id:string};before:unknown;after:unknown};
    if(!exactKeys(doc.after,['schemaVersion','command','source','mapping'])||doc.after.schemaVersion!==1
      ||!exactKeys(doc.after.command,['expectedRevision','effectiveDate','reason','payload']))return rejectBatch('STORAGE_ERROR');
    const command=prepareCommand({requestId:u.requestId,...doc.after.command});
    if(!command.ok||command.value.expectedRevision!==u.expectedRevision||u.actorId!==scope.ownerUserId
      ||hash({owner:scope.ownerUserId,account:scope.accountId,kind:u.kind,...commandDocument(command.value)})!==u.payloadIdentity)return rejectBatch('STORAGE_ERROR');
    const c=command.value,receipt=parseReceipt(u.result);let input:TemplateInput;
    try{input=parseTemplateInput(c.payload);}catch{return rejectBatch('STORAGE_ERROR');}
    if(!receipt.ok||receipt.value.updateId!==u.id||receipt.value.recordedSeq!==u.recordedSeq.toString()||receipt.value.aggregateRevision!==(u.expectedRevision+1n).toString()
      ||u.kind!=='TEMPLATE_'+input.action||group.some(a=>a.effectiveDate!==c.effectiveDate||a.reason!==c.reason))return rejectBatch('STORAGE_ERROR');
    const day=berlinDateFromEpochMilliseconds(Date.parse(u.recordedAt));
    if(!day.ok||u.recordedAt>verificationClock.now||c.effectiveDate!==day.value)return rejectBatch('STORAGE_ERROR');
    const prior=result.configs.get(input.templateId)??null;
    if(input.action==='CONFIG'){
      const config:Template={id:input.templateId,version:u.id,title:input.title,amountCents:input.amountCents,enabled:input.enabled};
      if(doc.entity.type!=='TEMPLATE_CONFIG'||doc.entity.id!==input.templateId||group.length!==1||input.expectedVersion!==(prior?.version??null)
        ||!sameDocument(doc.before,prior)||!sameDocument(doc.after.source,config)||doc.after.mapping!==null)return rejectBatch('STORAGE_ERROR');
      result.configs.set(config.id,config);
    }else{
      if(doc.entity.type!=='TEMPLATE_DECISION'||doc.entity.id!==u.id||doc.before!==null||!prior||!prior.enabled||input.templateVersion!==prior.version
        ||!sameDocument(doc.after.source,prior)||result.decisions.has(key(input.templateId,input.originPeriod)))return rejectBatch('STORAGE_ERROR');
      if(input.action==='DECLINE'){
        if(group.length!==1||doc.after.mapping!==null)return rejectBatch('STORAGE_ERROR');
      }else{
        if(input.fundingPeriod!==input.originPeriod||!exactKeys(doc.after.mapping,['inner','obligationId','eventId','positionId']))return rejectBatch('STORAGE_ERROR');
        const mapping=doc.after.mapping,inner=acceptedObligationPayload(input,prior,c.effectiveDate);
        if(!sameDocument(mapping.inner,{...commandDocument(c),payload:inner}))return rejectBatch('STORAGE_ERROR');
        const events=await tx.select({...getTableColumns(s.obligationEvents),confirmedAt:sql<string>`to_char(${s.obligationEvents.confirmedAt} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`}).from(s.obligationEvents).where(and(eq(s.obligationEvents.ownerUserId,scope.ownerUserId),
          eq(s.obligationEvents.accountId,scope.accountId),eq(s.obligationEvents.budgetUpdateId,u.id)));
        const e=events[0],stateAudits=group.filter(a=>(a.beforeAfter as {entity:{type:string}}).entity.type==='OBLIGATION_STATE');
        if(events.length!==1||!e||stateAudits.length!==1||e.id!==mapping.eventId||e.obligationId!==mapping.obligationId||e.positionId!==mapping.positionId
          ||e.recordedSeq!==u.recordedSeq||e.confirmedAt!==u.recordedAt||e.action!=='CREATE'||e.logicalFactId!==e.id||e.previousRevisionId!==null||e.supersedesId!==null||e.beforeState!==null
          ||e.transitionDecisionId!==null||e.effectiveDate!==c.effectiveDate||e.bankDate!==null||e.dueDate!==null||e.title!==prior.title
          ||e.originalCents.toString()!==input.amountCents||e.outstandingCents!==e.originalCents||e.status!=='UNPAID'||e.isPossible||!e.reserveFull)return rejectBatch('STORAGE_ERROR');
        const identities=await tx.select().from(s.obligations).where(and(eq(s.obligations.ownerUserId,scope.ownerUserId),eq(s.obligations.accountId,scope.accountId),eq(s.obligations.budgetUpdateId,u.id)));
        const identity=identities[0];if(identities.length!==1||identity.id!==e.obligationId)return rejectBatch('STORAGE_ERROR');
        if(!financial)return rejectBatch('STORAGE_ERROR');
        const positions=financial.history.positions.filter(p=>p.recordedSeq===u.recordedSeq),orders=financial.history.orderings.filter(o=>o.recordedSeq===u.recordedSeq);
        const originalOrder=financial.history.orderings.filter(o=>o.historicalDate===c.effectiveDate&&o.recordedSeq<u.recordedSeq).sort((a,b)=>a.recordedSeq<b.recordedSeq?-1:1).at(-1);
        const members=[...(originalOrder?.positionIds??[])],placement=input.placement,at=placement?.afterPositionId?members.indexOf(placement.afterPositionId)+1:0;
        if(positions.length!==1||positions[0].id!==e.positionId||positions[0].historicalDate!==c.effectiveDate||orders.length!==1
          ||(!placement&&members.length)||(placement&&(placement.expectedOrderingRevisionId!==(originalOrder?.id??null)||(placement.afterPositionId&&!at)||(members[at]??null)!==placement.beforePositionId)))return rejectBatch('STORAGE_ERROR');
        members.splice(at,0,e.positionId);
        const order=orders[0];
        if(order.historicalDate!==c.effectiveDate||order.previousRevisionId!==(originalOrder?.id??null)||!sameDocument(order.positionIds,members)||!sameDocument(order.edges,originalOrder?.edges??[]))return rejectBatch('STORAGE_ERROR');
        if(group.some(a=>!['TEMPLATE_DECISION','OBLIGATION_STATE','DAY_ORDERING','REPORT_REVIEW_REQUIRED'].includes((a.beforeAfter as {entity:{type:string}}).entity.type)))return rejectBatch('STORAGE_ERROR');

        if(!identity||identity.budgetUpdateId!==u.id||identity.recordedSeq!==u.recordedSeq)return rejectBatch('STORAGE_ERROR');
        const periods=await tx.select().from(s.budgetPeriods).where(and(eq(s.budgetPeriods.ownerUserId,scope.ownerUserId),eq(s.budgetPeriods.accountId,scope.accountId),
          inArray(s.budgetPeriods.id,[identity.originatingPeriodId,e.fundingPeriodId])));
        if(periods.find(p=>p.id===identity.originatingPeriodId)?.period!==input.originPeriod||periods.find(p=>p.id===e.fundingPeriodId)?.period!==input.fundingPeriod)return rejectBatch('STORAGE_ERROR');
        const state=stateAudits[0].beforeAfter as {entity:{id:string};before:unknown;after:unknown};
        if(state.entity.id!==e.id||state.before!==null||!sameDocument(state.after,{state:snapshot({...e,originatingPeriodId:identity.originatingPeriodId,effectiveDate:c.effectiveDate,bankDate:null,dueDate:null,action:'CREATE',status:'UNPAID',beforeState:null,payment:null}),payment:null,
          effectiveDate:e.effectiveDate,positionId:e.positionId,bankDate:null,supersedesId:null,confirmedAt:e.confirmedAt}))return rejectBatch('STORAGE_ERROR');


      }
      result.decisions.set(key(input.templateId,input.originPeriod),{receipt:receipt.value,input,document:doc.after});
    }
    result.proofs.set(u.id,{receipt:receipt.value,input,document:doc.after});
    if(result.configs.size>TEMPLATE_LIMITS.templates)return rejectBatch('STORAGE_ERROR');
  }
  const prohibited=[s.balanceCheckpoints,s.allocationRevisions,s.savingsGoals,s.savingsEvents,s.transitionDecisions,s.budgetTransfers,s.monthClosings];
  for(const table of prohibited){const found=await tx.select({id:table.id}).from(table).where(and(eq(table.ownerUserId,scope.ownerUserId),eq(table.accountId,scope.accountId),inArray(table.budgetUpdateId,updates.map(u=>u.id)))).limit(1);if(found.length)return rejectBatch('STORAGE_ERROR');}
  const controlIds=updates.filter(u=>u.kind!=='TEMPLATE_ACCEPT').map(u=>u.id);
  if(controlIds.length){
    const tables=[s.historicalPositions,s.orderingRevisions,s.balanceCheckpoints,s.allocationRevisions,s.obligations,s.obligationEvents,
      s.savingsGoals,s.savingsEvents,s.transitionDecisions,s.budgetTransfers,s.monthClosings];
    for(const table of tables){
      const rows=await tx.select({id:table.id}).from(table).where(and(eq(table.ownerUserId,scope.ownerUserId),eq(table.accountId,scope.accountId),inArray(table.budgetUpdateId,controlIds))).limit(1);
      if(rows.length)return rejectBatch('STORAGE_ERROR');
    }
  }
  return result;
}
export function createTemplateRepository(database:{db:NodePgDatabase<typeof s>}){
  async function safe<T>(run:()=>Promise<T>){try{return {ok:true as const,value:await run()};}catch(e){return {ok:false as const,code:e instanceof BatchFailure?e.code:'STORAGE_ERROR' as const};}}
  return {
    load:(scope:AuthorizedScope,originPeriod:string)=>safe(()=>database.db.transaction(async tx=>{
      if(!parsePeriod(originPeriod).ok)return rejectBatch('INVALID_INPUT');
      const [account]=await tx.select().from(s.accounts).where(and(eq(s.accounts.ownerUserId,scope.ownerUserId),eq(s.accounts.id,scope.accountId)));
      if(!account)return rejectBatch('FORBIDDEN');
      const clock=await databaseToday(tx),history=await verifyTemplateHistory(tx,scope,account.recordedSeq),configs=[...history.configs.values()];
      const context=await loadBudgetContext(tx,scope,account),ordering=context.history.orderings.filter(o=>o.historicalDate===clock.today).sort((a,b)=>a.recordedSeq<b.recordedSeq?-1:1).at(-1);
      const placement=ordering?{expectedOrderingRevisionId:ordering.id,afterPositionId:ordering.positionIds.at(-1)??null,beforePositionId:null}:null;
      return jsonDocument({schemaVersion:1,revision:account.aggregateRevision,today:clock.today,originPeriod,configs,placement,
        offers:configs.filter(t=>t.enabled&&!history.decisions.has(key(t.id,originPeriod))),
        decisions:[...history.decisions.values()].filter(p=>p.input.action!=='CONFIG'&&p.input.originPeriod===originPeriod).map(p=>({input:p.input,receipt:p.receipt,title:(p.document as {source:Template}).source.title}))});
    },{isolationLevel:'repeatable read',accessMode:'read only'})),
    commit:(scope:AuthorizedScope,command:PreparedCommand)=>safe(async()=>{
      const input=parsed(command),kind='TEMPLATE_'+input.action;let history:State|null=null;
      return commitBatch(database.db,{scope,command,kind,
        verifyReplay:async(tx,_a,prior)=>{const h=await verifyTemplateHistory(tx,scope,prior.recordedSeq);if(!h.proofs.has(prior.id))return rejectBatch('STORAGE_ERROR');},
        ...(input.action==='CONFIG'?{}:{replay:async(tx:Transaction,a:typeof s.accounts.$inferSelect)=>{
          history=await verifyTemplateHistory(tx,scope,a.recordedSeq);
          const prior=history.decisions.get(key(input.templateId,input.originPeriod));
          if(prior){if(input.action==='DECLINE'&&prior.input.action==='DECLINE')return prior.receipt;
            return rejectBatch(prior.input.action==='ACCEPT'?'TEMPLATE_ALREADY_ACCEPTED':'TEMPLATE_ALREADY_DECLINED');}
          return null;
        }})},async(tx,batch)=>{
          const clock=await databaseToday(tx);
          if(command.effectiveDate!==clock.today||!batch.account.activeAllocationRevisionId)return rejectBatch('INVALID_INPUT');
          const h=history??await verifyTemplateHistory(tx,scope,batch.account.recordedSeq),prior=h.configs.get(input.templateId)??null;
          if(h.proofs.size>=TEMPLATE_LIMITS.updates||h.auditCount+128>TEMPLATE_LIMITS.audits||h.bytes>BigInt(TEMPLATE_LIMITS.bytes-1048576))return rejectBatch('STORAGE_ERROR');
          let descriptors:readonly AuditDescriptor[]=[],source:Template,mapping:AuditDescriptor['after']=null;
          if(input.action==='CONFIG'){
            if(input.expectedVersion!==(prior?.version??null))return rejectBatch('STALE_TEMPLATE');
            if(!prior&&h.configs.size>=TEMPLATE_LIMITS.templates)return rejectBatch('STORAGE_ERROR');
            source={id:input.templateId,version:batch.id,title:input.title,amountCents:input.amountCents,enabled:input.enabled};
          }else{
            if(!prior||!prior.enabled||prior.version!==input.templateVersion)return rejectBatch('STALE_TEMPLATE');
            const decided=h.decisions.get(key(input.templateId,input.originPeriod));
            if(decided)return rejectBatch(decided.input.action==='ACCEPT'?'TEMPLATE_ALREADY_ACCEPTED':'TEMPLATE_ALREADY_DECLINED');
            source=prior;
            if(input.action==='ACCEPT'){
              if(input.fundingPeriod!==input.originPeriod)return rejectBatch('INVALID_INPUT');
              const payload=acceptedObligationPayload(input,source,command.effectiveDate),inner=prepareCommand({...command,payload});
              if(!inner.ok)return rejectBatch('INVALID_INPUT');
              descriptors=await writeObligations(tx,{...batch,command:inner.value});
              const [event]=await tx.select().from(s.obligationEvents).where(and(eq(s.obligationEvents.ownerUserId,scope.ownerUserId),
                eq(s.obligationEvents.accountId,scope.accountId),eq(s.obligationEvents.budgetUpdateId,batch.id)));
              if(!event)return rejectBatch('STORAGE_ERROR');
              mapping=jsonDocument({inner:commandDocument(inner.value),obligationId:event.obligationId,eventId:event.id,positionId:event.positionId});
            }
          }
          if(descriptors.length>127||Buffer.byteLength(JSON.stringify(jsonDocument(descriptors)),'utf8')>262144)return rejectBatch('STORAGE_ERROR');
          return [...descriptors,{entityType:input.action==='CONFIG'?'TEMPLATE_CONFIG':'TEMPLATE_DECISION',entityId:input.action==='CONFIG'?input.templateId:batch.id,
            before:input.action==='CONFIG'?jsonDocument(prior):null,after:jsonDocument({schemaVersion:1,command:commandDocument(command),source,mapping})}];
        });
    }),
    status:(scope:AuthorizedScope,requestId:string)=>safe(()=>database.db.transaction(async tx=>{
      if(!validUuid(requestId))return rejectBatch('INVALID_INPUT');
      const [a]=await tx.select().from(s.accounts).where(and(eq(s.accounts.ownerUserId,scope.ownerUserId),eq(s.accounts.id,scope.accountId)));
      if(!a)return rejectBatch('FORBIDDEN');
      const h=await verifyTemplateHistory(tx,scope,a.recordedSeq),[u]=await tx.select().from(s.budgetUpdates).where(and(eq(s.budgetUpdates.ownerUserId,scope.ownerUserId),
        eq(s.budgetUpdates.accountId,scope.accountId),eq(s.budgetUpdates.requestId,requestId)));
      if(!u)return null;return h.proofs.get(u.id)?.receipt??rejectBatch('STORAGE_ERROR');
    },{isolationLevel:'repeatable read',accessMode:'read only'})),
  };
}
