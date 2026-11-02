import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { selectState } from '@/domain/checkpoints/history';
import { selectObligationState, calculatePeriodReserves } from '@/domain/obligations/history';
import { selectSavingState, calculatePeriodSavings } from '@/domain/savings/history';
import { snapshot as obligationSnapshot } from '@/domain/obligations/lifecycle';
import { snapshot as savingSnapshot } from '@/domain/savings/lifecycle';
import { planAllocationChange, periodFree } from '@/domain/transitions/planning';
import { sumCents } from '@/domain/money/money';
import type { AllocationBase, FundingState, TransitionInput } from '@/domain/transitions/contracts';
import type { AuthorizedScope, CanonicalValue } from '@/domain/updates/contracts';
import type { BerlinDate } from '@/shared/pure/calendar';
import { berlinDateOfInstant, parseInstant } from '@/shared/pure/instant';
import { loadObligationHistory } from './obligation-history';
import { loadSavingHistory } from './savings-history';
import { rejectBatch, type Transaction } from './commit';
import * as s from './schema';
export function jsonDocument(value:unknown):CanonicalValue{return JSON.parse(JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v)) as CanonicalValue;}
export async function databaseToday(tx:Transaction){const r=await tx.execute<{now:string}>(sql`SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS now`);const now=parseInstant(r.rows[0].now);if(!now.ok)return rejectBatch('STORAGE_ERROR');const today=berlinDateOfInstant(now.value);if(!today.ok)return rejectBatch('STORAGE_ERROR');return {now:now.value,today:today.value};}
export async function loadTransitionState(tx:Transaction,scope:AuthorizedScope,cut:bigint,today:BerlinDate){
  const oh=await loadObligationHistory(tx,scope,cut),sh=await loadSavingHistory(tx,scope,cut);
  const bank=selectState(oh,today),obligations=selectObligationState(oh,today),savings=selectSavingState(sh,today);
  if(!bank.ok)return rejectBatch(bank.code);if(!obligations.ok)return rejectBatch(obligations.code);if(!savings.ok)return rejectBatch(savings.code);
  if(bank.value.status!=='OBSERVED')return rejectBatch('HISTORICAL_STATE_CONFLICT');
  const periods=await tx.select().from(s.budgetPeriods).where(and(eq(s.budgetPeriods.ownerUserId,scope.ownerUserId),eq(s.budgetPeriods.accountId,scope.accountId)));
  const periodById=new Map(periods.map(p=>[p.id,p.period]));
  const funding:FundingState[]=[...obligations.value.states.filter(e=>e.status==='UNPAID').map(e=>({kind:'OBLIGATION' as const,identityId:e.obligationId,revisionId:e.id,period:periodById.get(e.fundingPeriodId)!,state:obligationSnapshot(e)})),
    ...savings.value.states.filter(e=>e.status==='ACTIVE').map(e=>({kind:'SAVING' as const,identityId:e.savingsId,revisionId:e.id,period:periodById.get(e.fundingPeriodId)!,state:savingSnapshot(e)}))];
  if(funding.some(f=>!f.period))return rejectBatch('HISTORICAL_FUNDING_CONFLICT');
  const base:AllocationBase={balanceCents:bank.value.checkpoint.balanceCents,allocations:bank.value.vector.allocations,checkpointId:bank.value.checkpoint.id,vectorId:bank.value.vector.id,funding};
  return {oh,sh,bank:bank.value,obligations:obligations.value.states,savings:savings.value.states,periods,base};
}
export type TransitionState=Awaited<ReturnType<typeof loadTransitionState>>;
export function reviewTransition(state:TransitionState,input:TransitionInput,today:BerlinDate){
  if(input.target!==today.slice(0,7))return rejectBatch('TARGET_PERIOD_CHANGED');
  if(input.effectiveDate>today)return rejectBatch('INVALID_INPUT');
  if(input.mode!=='REDISTRIBUTE'&&input.effectiveDate.slice(0,7)!==input.target)return rejectBatch('HISTORICAL_FUNDING_CONFLICT');
  if(input.expectedCheckpointRevisionId!==state.base.checkpointId||input.expectedAllocationRevisionId!==state.base.vectorId)return rejectBatch('STALE_PROPOSAL');
  const plan=planAllocationChange(state.base,input);if(!plan.ok)return rejectBatch(plan.code);
  const r=calculatePeriodReserves(state.obligations),sv=calculatePeriodSavings(state.savings);if(!r.ok)return rejectBatch(r.code);if(!sv.ok)return rejectBatch(sv.code);
  const totalR=sumCents([...r.value.values()]),totalS=sumCents([...sv.value.values()]);if(!totalR.ok||!totalS.ok)return rejectBatch('MONEY_RANGE');
  const movedIds=new Set(plan.value.moving.map(f=>f.revisionId));
  const afterOb=state.obligations.map(e=>movedIds.has(e.id)?{...e,fundingPeriodId:'TARGET'}:e),afterSv=state.savings.map(e=>movedIds.has(e.id)?{...e,fundingPeriodId:'TARGET'}:e);
  const rr=calculatePeriodReserves(afterOb),ss=calculatePeriodSavings(afterSv);if(!rr.ok)return rejectBatch(rr.code);if(!ss.ok)return rejectBatch(ss.code);
  const ids=new Map(state.periods.map(p=>[p.id,p.period]));ids.set('TARGET',input.target);
  const allocations=new Map(input.allocations.map(a=>[String(a.period),a.amountCents]));
  const R=new Map<string,bigint>(),S=new Map<string,bigint>();
  for(const [id,v] of rr.value)R.set(ids.get(id)!,v);for(const [id,v] of ss.value)S.set(ids.get(id)!,v);
  const preview=[...new Set([...allocations.keys(),...R.keys(),...S.keys()])].sort().map(period=>{const allocated=allocations.get(period)??0n,reserved=R.get(period)??0n,savings=S.get(period)??0n,f=periodFree(allocated,reserved,savings);if(!f.ok)return rejectBatch('MONEY_RANGE');return {period,allocated,reserved,savings,free:f.value};});
  const totalFree=sumCents(preview.map(p=>p.free));if(!totalFree.ok)return rejectBatch('MONEY_RANGE');
  const review=jsonDocument({schemaVersion:1,baseCheckpointRevisionId:state.base.checkpointId,baseAllocationRevisionId:state.base.vectorId,currentVector:state.base.allocations,
    affectedPast:plan.value.affectedPast.map(period=>({period,periodId:state.periods.find(p=>p.period===period)?.id??null,priorAmountCents:state.base.allocations.find(a=>a.period===period)?.amountCents??0n,baseAllocationRevisionId:state.base.vectorId})),
    preservedFuture:plan.value.preservedFuture.map(a=>({...a,periodId:state.periods.find(p=>p.period===a.period)?.id??null,baseAllocationRevisionId:state.base.vectorId})),
    reviewedFutureEdits:input.futureEdits.map(e=>({...e,periodId:state.periods.find(p=>p.period===e.period)?.id??null,baseAllocationRevisionId:state.base.vectorId})),
    target:{period:input.target,beforeAmountCents:state.base.allocations.find(a=>a.period===input.target)?.amountCents??0n,finalAmountCents:allocations.get(input.target)??0n},
    funding:plan.value.moving.map(f=>({...f,draftRef:`${f.kind}:${f.identityId}`,afterState:{...f.state as object,fundingPeriodId:input.target}})),
    retainedFunding:state.base.funding.filter(f=>!movedIds.has(f.revisionId)),completeFinalVector:input.allocations,preview});
  return {plan:plan.value,review};
}
