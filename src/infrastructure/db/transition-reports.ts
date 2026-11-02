import 'server-only';
import { and, eq } from 'drizzle-orm';
import { selectObligationState, calculatePeriodReserves } from '@/domain/obligations/history';
import type { ObligationHistory } from '@/domain/obligations/contracts';
import type { SavingHistory } from '@/domain/savings/contracts';
import type { AuthorizedScope, AuditDescriptor } from '@/domain/updates/contracts';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { affectedReports } from './checkpoint-persistence';
import { markSavingReportImpact } from './report-impact';
import { rejectBatch, type Transaction } from './commit';
import * as s from './schema';
/** Prove all original bases before sibling pending writes can obscure drift. */
export async function transitionReportImpact(tx:Transaction,scope:AuthorizedScope,original:ObligationHistory,after:ObligationHistory,oldSavings:SavingHistory,newSavings:SavingHistory){
  const reports=await tx.select({head:s.reportHeads,closing:s.monthClosings}).from(s.reportHeads).innerJoin(s.monthClosings,eq(s.monthClosings.id,s.reportHeads.closingId)).where(and(eq(s.reportHeads.ownerUserId,scope.ownerUserId),eq(s.reportHeads.accountId,scope.accountId)));
  const pending=new Map(reports.map(r=>[r.head.id,r.head.correctionPending]));
  const bank=await affectedReports(tx,original,after,scope.ownerUserId,scope.accountId),changed=new Set(bank.map(r=>r.head.id));
  for(const {head,closing:c} of reports){
    const date=parseBerlinDate(c.historicalThroughDate),m=c.sourceManifest as {obligationRevisionIds?:unknown};
    if(!date.ok||!m||!Array.isArray(m.obligationRevisionIds))return rejectBatch('REPORT_IMPACT_REVIEW_REQUIRED');
    const pinned=selectObligationState({...original,knowledgeCut:c.evidenceRecordedCutoffSeq},date.value),before=selectObligationState(original,date.value),next=selectObligationState(after,date.value);
    if(!pinned.ok||!before.ok||!next.ok)return rejectBatch('REPORT_IMPACT_REVIEW_REQUIRED');
    const ids=(a:typeof pinned.value.states)=>a.map(e=>e.id).sort().join('|'),relevant=(a:typeof pinned.value.states)=>ids(a.filter(e=>e.fundingPeriodId===c.periodId));
    const r=calculatePeriodReserves(pinned.value.states),refs=m.obligationRevisionIds;
    if(!r.ok||(r.value.get(c.periodId)??0n)!==c.historicalReservedCents||refs.some(x=>typeof x!=='string')||new Set(refs).size!==refs.length||[...refs].sort().join('|')!==ids(pinned.value.states)||(!head.correctionPending&&relevant(pinned.value.states)!==relevant(before.value.states)))return rejectBatch('REPORT_IMPACT_REVIEW_REQUIRED');
    if(relevant(before.value.states)!==relevant(next.value.states))changed.add(head.id);
  }
  // Savings validates its original pinned basis using the flags captured above.
  const audits:AuditDescriptor[]=await markSavingReportImpact(tx,oldSavings,newSavings,scope,pending);
  for(const {head} of reports)if(changed.has(head.id)&&!head.correctionPending&&!audits.some(a=>a.entityId===head.id)){
    await tx.update(s.reportHeads).set({correctionPending:true}).where(and(eq(s.reportHeads.ownerUserId,scope.ownerUserId),eq(s.reportHeads.accountId,scope.accountId),eq(s.reportHeads.id,head.id)));
    audits.push({entityType:'REPORT_REVIEW_REQUIRED',entityId:head.id,before:{closingId:head.closingId,correctionPending:false},after:{closingId:head.closingId,correctionPending:true}});
  }
  return audits;
}
