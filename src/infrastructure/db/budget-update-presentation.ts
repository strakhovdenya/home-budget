import { assembleSnapshot } from '@/domain/forecast/assembly';
import { projectAccount } from '@/domain/forecast/budget';
import { selectState } from '@/domain/checkpoints/history';
import type { BudgetContext, BudgetDraft, CandidatePlan } from '@/domain/budget-update/contracts';
import { rejectBatch } from './commit';

/** Copied review facts only. Existing selectors/formulas own all amounts.
 * No new historical endpoint, financial rule, persistence entity or write. */
export function budgetPresentation(c:BudgetContext,d:BudgetDraft,p:CandidatePlan) {
  function at(after:boolean){
    const history=after?p.history:c.history,events=after?[...c.obligations,...p.obligations]:c.obligations,
      savings=after?[...c.savings,...p.savings]:c.savings,periods=after?p.periods:c.periods;
    const selected=selectState(history,c.today);if(!selected.ok)return rejectBatch(selected.code);
    const os=[...new Map(events.filter(e=>e.action==='CREATE').map(e=>[e.obligationId,e])).values()],
      ss=[...new Map(savings.filter(e=>e.action==='CREATE').map(e=>[e.savingsId,e])).values()];
    const snapshot=assembleSnapshot({scope:c.scope,asOfDate:d.effectiveDate,capturedSeq:history.knowledgeCut,
      capturedAggregateRevision:c.revision+(after?1n:0n),activeAllocationRevisionId:selected.value.vector?.id??null,
      obligationHistory:{...history,events},savingHistory:{...history,savings},
      obligationIdentities:os.map(e=>({id:e.obligationId,...c.scope,originatingPeriodId:e.originatingPeriodId,recordedSeq:e.recordedSeq})),
      savingIdentities:ss.map(e=>({id:e.savingsId,...c.scope,originatingPeriodId:e.originatingPeriodId,recordedSeq:e.recordedSeq})),
      periods:periods.map(e=>({...e,...c.scope}))});
    const result=projectAccount(snapshot,d.effectiveDate);if(!result.ok)return rejectBatch(result.code==='MONEY_RANGE'?'MONEY_RANGE':'HISTORICAL_STATE_CONFLICT');
    const v=result.value;
    return v.kind==='ACCOUNT_ESTIMATE'?{kind:'CONFIRMED_STATE',bank:{balanceCents:v.bank.balance,observedDate:v.bank.observedDate},
      periods:v.periods.map(({period,allocated,reserved,savings,free,deficit})=>({period,allocated,reserved,savings,free,deficit})),
      identities:[...v.provenance.obligationSources.map(o=>({title:o.title,origin:o.originPeriod,funding:o.fundingPeriod,status:o.status,amount:o.outstanding})),
        ...v.provenance.savingSources.map(s=>({title:s.title,origin:s.originPeriod,funding:s.fundingPeriod,status:s.status,amount:s.amount}))]}:{kind:'UNAVAILABLE'};
  }
  return {schemaVersion:1,effectiveDate:d.effectiveDate,before:at(false),after:at(true)};
}
