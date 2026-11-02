import 'server-only';
import { parseTransition } from '@/domain/transitions/validation';
import { rejectBatch, type BatchWriter } from './commit';
import { databaseToday, loadTransitionState, reviewTransition } from './transition-state';
import { persistAllocation } from './allocation-writer';
import { transitionReportImpact } from './transition-reports';
export const writeRedistribution:BatchWriter=async(tx,batch)=>{
  const input=parseTransition(batch.command.payload);if(!input.ok)return rejectBatch(input.code);if(input.value.mode!=='REDISTRIBUTE'||input.value.effectiveDate!==batch.command.effectiveDate)return rejectBatch('TRANSITION_CONFIRMATION_REQUIRED');
  const scope={ownerUserId:batch.account.ownerUserId,accountId:batch.account.id},clock=await databaseToday(tx),state=await loadTransitionState(tx,scope,batch.account.recordedSeq,clock.today);
  const reviewed=reviewTransition(state,input.value,clock.today),p=await persistAllocation(tx,batch,state.oh,input.value,clock);
  const audits=await transitionReportImpact(tx,scope,state.oh,{...p.history,events:state.oh.events},state.sh,{...p.history,savings:state.sh.savings});
  return [...p.audit,...audits,{entityType:'ALLOCATION_ONLY_REVIEW',entityId:p.vectorId,before:null,after:reviewed.review}];
};
