import 'server-only';
import {createHash} from 'node:crypto';
import {and,eq,sql} from 'drizzle-orm';
import {parseBudgetDraft} from '@/domain/budget-update/validation';
import type {BudgetContext,BudgetDraft} from '@/domain/budget-update/contracts';
import type {PreparedCommand,AuthorizedScope} from '@/domain/updates/contracts';
import {isPreparedCommand,validUuid,prepareCommand} from '@/domain/updates/validation';
import {exactKeys} from '@/domain/checkpoints/validation';
import {sameDocument} from '@/domain/transitions/planning';
import {validSubject} from '../auth/policy';
import {databaseToday,jsonDocument} from './transition-state';
import {commitBatchInTransaction,BatchFailure,classifyTransactionError,rejectBatch,type Transaction} from './commit';
import {originalEvidence,planReviewedBudget} from './budget-update-repository';
import {persistBudgetPlan} from './budget-update-writer';
import type {NodePgDatabase} from 'drizzle-orm/node-postgres';
import * as s from './schema';

/** Stable server-only namespace; a draft identifier confers no ownership. */
function accountId(owner:string){
  const h=createHash('sha256').update('HB020:initial-account:v1:'+owner).digest('hex');
  return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-8'+h.slice(17,20)+'-'+h.slice(20,32);
}
function initialDraft(command:PreparedCommand,reviewed:boolean):BudgetDraft {
  if(!isPreparedCommand(command)||command.expectedRevision!==0n)return rejectBatch('INVALID_INPUT');
  const payload=command.payload;
  if(reviewed&&(!exactKeys(payload,['schemaVersion','draft','review','proposalId'])||payload.schemaVersion!==1||payload.proposalId!==null))return rejectBatch('INVALID_INPUT');
  const rawDraft=reviewed?(payload as {draft:unknown}).draft:payload;
  const draft=parseBudgetDraft(rawDraft);
  if(!draft.ok)return rejectBatch(draft.code);
  const d=draft.value;
  // The public wire uses decimal strings. Preserving that representation keeps
  // the original command hash reproducible from immutable JSON evidence.
  const wire=(rawDraft as {checkpoint:{balanceCents:unknown;allocations:{amountCents:unknown}[]}}).checkpoint;
  if(!wire||typeof wire.balanceCents!=='string'||wire.allocations.some(a=>typeof a.amountCents!=='string'))return rejectBatch('INVALID_INPUT');
  if(d.knowledgeCut!==0n||d.baseCheckpointId!==null||d.baseVectorId!==null||!d.checkpoint||d.allocationChange!==null
    ||d.obligations.length||d.savings.length||d.checkpoint.correction!==null||d.checkpoint.placement!==null||d.effectiveDate!==command.effectiveDate)return rejectBatch('INVALID_INPUT');
  return d;
}
async function discovery(tx:Transaction,owner:string,lock:boolean){
  if(!validUuid(owner))return rejectBatch('FORBIDDEN');
  await tx.execute(sql.raw("SET LOCAL lock_timeout='3000ms'"));
  await tx.execute(sql.raw("SET LOCAL statement_timeout='10000ms'"));
  const query=tx.select().from(s.users).where(eq(s.users.id,owner));
  const [user]=lock?await query.for('update'):await query;
  if(!user||!user.emailVerified||!validSubject(user.googleSubject))return rejectBatch('FORBIDDEN');
  // Lock ordering: owner before discovery, then account, never the reverse.
  const accounts=await tx.select().from(s.accounts).where(eq(s.accounts.ownerUserId,owner)).limit(2);
  if(accounts.length>1)return rejectBatch('ACCOUNT_SELECTION_REQUIRED');
  return accounts[0]??null;
}
async function emptyContext(tx:Transaction,scope:AuthorizedScope):Promise<BudgetContext>{
  const clock=await databaseToday(tx);
  return {scope,revision:0n,recordedSeq:0n,activeVectorId:null,...clock,
    history:{knowledgeCut:0n,checkpoints:[],vectors:[],positions:[],orderings:[]},obligations:[],savings:[],periods:[]};
}
export async function verifyInitialBudgetEvidence(tx:Transaction,scope:AuthorizedScope,update:typeof s.budgetUpdates.$inferSelect){
  const proof=await originalEvidence(tx,scope,update);
  const original=proof.evidence.command;
  const prepared=prepareCommand({requestId:update.requestId,...original as object});
  if(!prepared.ok)return rejectBatch('STORAGE_ERROR');initialDraft(prepared.value,true);
  const allowed=new Set(['DAY_ORDERING','BANK_CHECKPOINT','ALLOCATION_REVISION','BANK_HEAD','BUDGET_UPDATE_REVIEW','ACCOUNT_CREATED']);
  const types=proof.audits.map(a=>(a.beforeAfter as {entity:{type:string}}).entity.type);
  if(types.length!==6||new Set(types).size!==6||types.some(type=>!allowed.has(type)))return rejectBatch('STORAGE_ERROR');
  const created=proof.audits.filter(a=>(a.beforeAfter as {entity?:{type?:string}})?.entity?.type==='ACCOUNT_CREATED');
  if(created.length!==1||update.expectedRevision!==0n||update.recordedSeq!==1n||update.kind!=='BUDGET_UPDATE')return rejectBatch('STORAGE_ERROR');
  const doc=created[0].beforeAfter as {entity:{id:string};before:unknown;after:unknown};
  if(doc.entity.id!==scope.accountId||doc.before!==null||!sameDocument(doc.after,{...scope,currency:'EUR',displayName:'Home Budget',internalLabelVersion:1,initialUpdateId:update.id})
    ||scope.accountId!==accountId(scope.ownerUserId))return rejectBatch('STORAGE_ERROR');
  return proof.receipt;
}
export function createOnboardingRepository(database:{db:NodePgDatabase<typeof s>}){
  async function safe<T>(run:()=>Promise<T>){
    try{return {ok:true as const,value:await run()};}
    catch(e){return {ok:false as const,code:e instanceof BatchFailure?e.code:'STORAGE_ERROR' as const};}
  }
  return {
    preview:(owner:string,command:PreparedCommand)=>safe(async()=>{
      owner=owner.toLowerCase();const draft=initialDraft(command,false);
      return database.db.transaction(async tx=>{
        const existing=await discovery(tx,owner,false);
        if(existing)return rejectBatch(existing.activeAllocationRevisionId?'ALREADY_INITIALIZED':'EXISTING_EMPTY_ACCOUNT');
        const scope={ownerUserId:owner,accountId:accountId(owner)},context=await emptyContext(tx,scope);
        const plan=await planReviewedBudget(tx,scope,command,context,draft,command.requestId,context.now);
        return jsonDocument({requestId:command.requestId,expectedRevision:command.expectedRevision,effectiveDate:command.effectiveDate,reason:command.reason,
          payload:{schemaVersion:1,draft:command.payload,review:plan.review,proposalId:null}});
      },{isolationLevel:'repeatable read',accessMode:'read only'});
    }),
    confirm:(owner:string,command:PreparedCommand)=>safe(async()=>{
      owner=owner.toLowerCase();const draft=initialDraft(command,true);let callbackCompleted=false;
      try{
        return await database.db.transaction(async tx=>{
          const existing=await discovery(tx,owner,true);
          const scope={ownerUserId:owner,accountId:existing?.id??accountId(owner)};
          if(existing){
            const [prior]=await tx.select().from(s.budgetUpdates).where(and(eq(s.budgetUpdates.ownerUserId,owner),
              eq(s.budgetUpdates.accountId,existing.id),eq(s.budgetUpdates.requestId,command.requestId)));
            if(!prior)return rejectBatch(existing.activeAllocationRevisionId?'ALREADY_INITIALIZED':'EXISTING_EMPTY_ACCOUNT');
          }else await tx.insert(s.accounts).values({id:scope.accountId,ownerUserId:owner,currency:'EUR',displayName:'Home Budget'});
          const receipt=await commitBatchInTransaction(tx,{scope,kind:'BUDGET_UPDATE',command,verifyReplay:async(tx,_account,prior)=>{await verifyInitialBudgetEvidence(tx,scope,prior);}},async(tx,batch)=>{
            const context=await emptyContext(tx,scope);
            const plan=await planReviewedBudget(tx,scope,command,context,draft,batch.id,batch.recordedAt);
            if(!sameDocument(plan.review,(command.payload as {review:unknown}).review))return rejectBatch('STALE_PROPOSAL');
            const audits=await persistBudgetPlan(tx,batch,context,draft,plan,null);
            return [...audits,{entityType:'ACCOUNT_CREATED',entityId:scope.accountId,before:null,
              after:{...scope,currency:'EUR',displayName:'Home Budget',internalLabelVersion:1,initialUpdateId:batch.id}}];
          });
          callbackCompleted=true;return receipt;
        },{isolationLevel:'read committed'});
      }catch(error){throw new BatchFailure(classifyTransactionError(error,callbackCompleted));}
    }),
    status:(owner:string,requestId:string)=>safe(async()=>{
      owner=owner.toLowerCase();if(!validUuid(requestId))return rejectBatch('INVALID_INPUT');
      return database.db.transaction(async tx=>{
        const account=await discovery(tx,owner,false);if(!account)return null;
        const scope={ownerUserId:owner,accountId:account.id};
        const [update]=await tx.select().from(s.budgetUpdates).where(and(eq(s.budgetUpdates.ownerUserId,owner),
          eq(s.budgetUpdates.accountId,account.id),eq(s.budgetUpdates.requestId,requestId)));
        return update?verifyInitialBudgetEvidence(tx,scope,update):null;
      },{isolationLevel:'repeatable read',accessMode:'read only'});
    }),
  };
}
