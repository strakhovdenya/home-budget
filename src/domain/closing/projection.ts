import type { Snapshot } from '@/domain/forecast/contracts';
import { validateSnapshot } from '@/domain/forecast/validation';
import { periodBudget } from '@/domain/forecast/budget';
import { sumCents } from '@/domain/money/money';
import { endOfMonth, parsePeriod } from '@/domain/periods/period';
import type { BerlinDate } from '@/shared/pure/calendar';
import { fail, reportJson } from './serialization';

export function calendarState(period:string,today:BerlinDate,hasReport:boolean){
  const p=parsePeriod(period);if(!p.ok)fail('REPORT_PROOF_INVALID');
  return period>today.slice(0,7)?'FUTURE':period===today.slice(0,7)?'OPEN':hasReport?'CLOSED':'AWAITING_CLOSE';
}
/** Input is still checked; histories/evidence are independently selected by the owned adapter. */
export function makeClosing(raw:Snapshot,period:string){
  const p=parsePeriod(period);if(!p.ok)fail('REPORT_PROOF_INVALID');
  const h=endOfMonth(p.value),{state:s}=validateSnapshot(raw,h);
  if(s.kind!=='ACTIVE_COMPLETE'&&s.kind!=='NO_OBSERVATION')fail('REPORT_PROOF_INVALID');
  const os=s.kind==='ACTIVE_COMPLETE'?s.obligations:s.knownObligations;
  const ss=s.kind==='ACTIVE_COMPLETE'?s.savings:s.knownSavings;
  function sum(a:readonly bigint[]){const r=sumCents(a);if(!r.ok)fail('REPORT_PROOF_INVALID');return r.value.toString();}
  const budget=s.kind==='ACTIVE_COMPLETE'?periodBudget(s,h,p.value):null;
  const observed=s.kind==='ACTIVE_COMPLETE'?s.checkpoint:null;
  const selected={...s,provenance:{selectionVersion:1,historicalThroughDate:h,orderingRevisionIds:s.provenance.orderingRevisionIds}};
  const snapshot=reportJson(JSON.parse(JSON.stringify(selected,(_,v)=>typeof v==='bigint'?v.toString():v)));
  return {
    historicalThroughDate:h,lastCheckpointId:observed?.revisionId??null,lastBankObservedDate:observed?.observedDate??null,
    lastBankObservedAt:observed?.observedAt??null,lastObservedBalanceCents:observed?.balance.toString()??null,
    historicalAllocationRevisionId:s.kind==='ACTIVE_COMPLETE'?s.allocationRevisionId:null,
    allocationEffectiveDate:s.kind==='ACTIVE_COMPLETE'?s.allocationEffectiveDate:null,
    endCheckpointId:observed?.observedDate===h?observed.revisionId:null,
    endBalanceCents:observed?.observedDate===h?observed.balance.toString():null,
    bankDataCompleteness:observed?(observed.observedDate===h?'END_DATE_OBSERVED':'INCOMPLETE'):'NO_OBSERVATION',
    operationDetailStatus:'NOT_PROVIDED',historicalAllocatedCents:budget?.allocated.toString()??null,
    historicalReservedCents:budget?.reserved.toString()??sum(os.filter(o=>o.fundingPeriod===period&&o.status==='UNPAID'&&o.reserveFull).map(o=>o.outstanding)),
    historicalSavingsCents:budget?.savings.toString()??sum(ss.filter(x=>x.fundingPeriod===period&&x.status==='ACTIVE').map(x=>x.amount)),
    historicalFreeCents:budget?.free.toString()??null,snapshotSchemaVersion:1,selectionContractVersion:1,snapshot,
    obligationRevisionIds:os.map(x=>x.revisionId).sort(),savingsRevisionIds:ss.map(x=>x.revisionId).sort(),orderingRevisionRefs:[...s.provenance.orderingRevisionIds].sort(),
  };
}
