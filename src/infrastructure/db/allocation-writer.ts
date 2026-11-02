import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { selectState, validateHistoricalStates } from '@/domain/checkpoints/history';
import { planConfirmation } from '@/domain/checkpoints/confirmation';
import type { TransitionInput } from '@/domain/transitions/contracts';
import type { History } from '@/domain/checkpoints/contracts';
import type { AuditDescriptor } from '@/domain/updates/contracts';
import { insertHistoricalPosition } from './historical-placement';
import { persistCheckpointPlan } from './checkpoint-persistence';
import { rejectBatch, type Transaction, type BatchContext } from './commit';
import type { databaseToday } from './transition-state';
import * as s from './schema';
export async function ensurePeriod(tx:Transaction,scope:{ownerUserId:string;accountId:string},period:string){let [p]=await tx.select().from(s.budgetPeriods).where(and(eq(s.budgetPeriods.ownerUserId,scope.ownerUserId),eq(s.budgetPeriods.accountId,scope.accountId),eq(s.budgetPeriods.period,period)));if(!p)[p]=await tx.insert(s.budgetPeriods).values({...scope,id:randomUUID(),period}).returning();return p.id;}
/** Uses caller's locked batch. ACTUAL always passes the final vector to the HB-010 engine. */
export async function persistAllocation(tx:Transaction,batch:BatchContext,history:History,input:TransitionInput,clock:Awaited<ReturnType<typeof databaseToday>>){
  const before=selectState(history,clock.today);if(!before.ok)return rejectBatch(before.code);
  if(before.value.vector?.id!==batch.account.activeAllocationRevisionId)return rejectBatch('HISTORICAL_STATE_CONFLICT');
  const positionId=randomUUID(),vectorId=randomUUID();
  if(input.checkpoint){
    const p=planConfirmation(history,input.checkpoint,batch.recordedSeq,{checkpointId:randomUUID(),vectorId,positionId,orderingId:randomUUID(),oldDayOrderingId:randomUUID()},clock.today,clock.now);
    if(!p.ok)return rejectBatch(p.code);
    const audit=await persistCheckpointPlan(tx,batch,history,p.value,before.value,false);
    return {history:p.value.history,positionId:p.value.vector.positionId,vectorId,checkpointId:p.value.checkpoint.id,audit};
  }
  const placed=await insertHistoricalPosition(tx,batch,history,input.effectiveDate,positionId,input.placement,'ALLOCATION');
  const vector={id:vectorId,logicalFactId:vectorId,supersedesId:null,recordedSeq:batch.recordedSeq,positionId,checkpointId:input.expectedCheckpointRevisionId,
    previousRevisionId:input.expectedAllocationRevisionId,effectiveDate:input.effectiveDate,allocations:input.allocations};
  const candidate={...placed.history,vectors:[...history.vectors,vector]};const valid=validateHistoricalStates(candidate);if(!valid.ok)return rejectBatch(valid.code);
  const selected=selectState(candidate,clock.today);if(!selected.ok)return rejectBatch(selected.code);
  const scope={ownerUserId:batch.account.ownerUserId,accountId:batch.account.id},base={...scope,budgetUpdateId:batch.id,recordedSeq:batch.recordedSeq};
  await tx.insert(s.allocationRevisions).values({...base,...vector,changeKind:input.mode,confirmedAt:batch.recordedAt});
  for(const a of input.allocations){const periodId=await ensurePeriod(tx,scope,a.period);await tx.insert(s.periodAllocations).values({...scope,id:randomUUID(),allocationRevisionId:vectorId,periodId,amountCents:a.amountCents});}
  if(selected.value.vector?.id!==batch.account.activeAllocationRevisionId)await tx.update(s.accounts).set({activeAllocationRevisionId:selected.value.vector?.id??null}).where(and(eq(s.accounts.id,scope.accountId),eq(s.accounts.ownerUserId,scope.ownerUserId)));
  const audit:AuditDescriptor[]=[placed.audit,{entityType:'ALLOCATION_REVISION',entityId:vectorId,before:{...before.value.vector},after:{...vector}},
    {entityType:'BANK_HEAD',entityId:scope.accountId,before:{allocationRevisionId:batch.account.activeAllocationRevisionId},after:{allocationRevisionId:selected.value.vector?.id??null}}];
  return {history:candidate,positionId,vectorId,checkpointId:input.expectedCheckpointRevisionId,audit};
}
