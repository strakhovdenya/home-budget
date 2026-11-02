import 'server-only';
import { and, eq } from 'drizzle-orm';
import type { AuthorizedScope, CanonicalValue } from '@/domain/updates/contracts';
import type { FundingProof } from '@/domain/transitions/contracts';
import { sameDocument } from '@/domain/transitions/planning';
import { exactKeys } from '@/domain/checkpoints/validation';
import { validUuid } from '@/domain/updates/validation';
import { rejectBatch } from './commit';
import type { createDatabase } from './client';
import * as s from './schema';
import type { HistoryReadContext } from './history-read-context';
type Connection=Pick<ReturnType<typeof createDatabase>['db'],'select'>;
/** Evidence is loaded at the same K as the full state, never inferred from amount deltas. */
export async function loadFundingEvidence(db:Connection,scope:AuthorizedScope,cut:bigint,e:{id:string;transitionDecisionId?:string|null;budgetUpdateId:string;recordedSeq:bigint;positionId:string;previousRevisionId:string|null;fundingPeriodId:string;beforeState:unknown},state:CanonicalValue,context?:HistoryReadContext):Promise<FundingProof>{
  const d=context ? context.decisions.get(e.transitionDecisionId??'') : (await db.select().from(s.transitionDecisions).where(and(eq(s.transitionDecisions.ownerUserId,scope.ownerUserId),eq(s.transitionDecisions.accountId,scope.accountId),eq(s.transitionDecisions.id,e.transitionDecisionId??''))))[0];
  if(!d||d.recordedSeq>cut||d.recordedSeq!==e.recordedSeq||d.budgetUpdateId!==e.budgetUpdateId||d.positionId!==e.positionId||!['CARRY','FRESH_START'].includes(d.mode))return rejectBatch('HISTORICAL_FUNDING_CONFLICT');
  const manifest=d.manifest as {funding?:unknown[]};
  if(!manifest||!Array.isArray(manifest.funding))return rejectBatch('HISTORICAL_FUNDING_CONFLICT');
  const entries=manifest.funding.filter(x=>x&&typeof x==='object'&&'afterRevisionId' in x&&x.afterRevisionId===e.id);
  const p=entries[0];
  if(entries.length!==1||!exactKeys(p,['decisionId','budgetUpdateId','positionId','sourcePeriodId','targetPeriodId','beforeRevisionId','afterRevisionId'])||Object.values(p).some(v=>!validUuid(v))
    ||p.decisionId!==d.id||p.budgetUpdateId!==e.budgetUpdateId||p.positionId!==e.positionId||p.beforeRevisionId!==e.previousRevisionId||p.targetPeriodId!==e.fundingPeriodId)return rejectBatch('HISTORICAL_FUNDING_CONFLICT');
  const audits=context ? context.auditByBatch.get(d.budgetUpdateId)??[] : await db.select().from(s.auditEvents).where(and(eq(s.auditEvents.ownerUserId,scope.ownerUserId),eq(s.auditEvents.accountId,scope.accountId),eq(s.auditEvents.budgetUpdateId,d.budgetUpdateId)));
  const matches=audits.filter(a=>{const v=a.beforeAfter as {entity?:{type?:string;id?:string}};return v?.entity?.type==='FUNDING_TRANSFER'&&v.entity.id===e.id;});
  const doc=matches[0]?.beforeAfter as {before?:unknown;after?:unknown};
  if(matches.length!==1||matches[0].recordedSeq!==e.recordedSeq||!sameDocument(doc.before,e.beforeState)||!sameDocument(doc.after,{state,proof:p}))return rejectBatch('HISTORICAL_FUNDING_CONFLICT');
  if(state&&typeof state==='object'&&!Array.isArray(state)&&'obligationId' in state){
    const states=audits.filter(a=>{const v=a.beforeAfter as {entity?:{type?:string;id?:string}};return v?.entity?.type==='OBLIGATION_STATE'&&v.entity.id===e.id;});
    const d=states[0]?.beforeAfter as {before?:unknown;after?:{state?:unknown;payment?:unknown}};
    if(states.length!==1||states[0].recordedSeq!==e.recordedSeq||!sameDocument(d.before,e.beforeState)||!sameDocument(d.after?.state,state)||d.after?.payment!==null)return rejectBatch('HISTORICAL_FUNDING_CONFLICT');
  }
  return p as FundingProof;
}
