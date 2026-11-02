import { expect, it, vi } from 'vitest';
import { createProjectionReader } from '@/features/budget-projection/read-account';
import { assembleSnapshot, type AssemblyInput } from '@/domain/forecast/assembly';
import { checkProjectionBudget } from '@/infrastructure/db/projection-reader';
import { projectAccount } from '@/domain/forecast/budget';
import { encodeProjection } from '@/domain/forecast/serialization';
import { state, value, day, id, saving } from './fixtures/forecast';
import { observe, emptyHistory } from './fixtures/checkpoints';
import type { ProjectionSnapshotReader } from '@/domain/forecast/ports';
import type { SavingEvent } from '@/domain/savings/contracts';

function input(): AssemblyInput {
  const history=observe(emptyHistory(),'2026-10-05','50000').history;
  return {scope:{accountId:id(1),ownerUserId:id(2)},asOfDate:day('2026-11-02'),capturedSeq:history.knowledgeCut,capturedAggregateRevision:9n,
    activeAllocationRevisionId:history.vectors[0].id,obligationHistory:{...history,events:[]},savingHistory:{...history,savings:[]},
    obligationIdentities:[],savingIdentities:[],periods:[]};
}
it('HB14-043/056 active pointer guard applies only to full current cut; chronological H and old K remain valid',()=>{
  const base=input(),first=assembleSnapshot(base);expect(first.kind).toBe('ACTIVE_COMPLETE');
  expect(()=>assembleSnapshot({...base,activeAllocationRevisionId:id(999)})).toThrow('HISTORICAL_STATE_CONFLICT');
  const next=observe(base.obligationHistory,'2026-10-10','45000').history;
  const later={...base,capturedSeq:next.knowledgeCut,activeAllocationRevisionId:next.vectors.at(-1)!.id,
    obligationHistory:{...next,events:[]},savingHistory:{...next,savings:[]}};
  const oldH=assembleSnapshot({...later,asOfDate:day('2026-10-05')});expect(oldH.kind==='ACTIVE_COMPLETE'&&oldH.checkpoint.balance).toBe(50000n);
  const oldK=assembleSnapshot({...base,capturedSeq:next.knowledgeCut,activeAllocationRevisionId:later.activeAllocationRevisionId});
  expect(oldK.kind==='ACTIVE_COMPLETE'&&oldK.checkpoint.balance).toBe(50000n);
  expect(()=>assembleSnapshot({...base,savingHistory:{...base.savingHistory,knowledgeCut:99n}})).toThrow('INVALID_INPUT');
});
it('HB14 identity completeness is independent of event JOIN and period mapping never silently disappears',()=>{
  const base=input(),identity={id:id(30),...base.scope,originatingPeriodId:id(31),recordedSeq:1n};
  expect(()=>assembleSnapshot({...base,obligationIdentities:[identity],periods:[{id:id(31),...base.scope,period:'2026-10'}]})).toThrow('HISTORICAL_STATE_CONFLICT');
  expect(()=>assembleSnapshot({...base,savingIdentities:[identity],periods:[{id:id(31),...base.scope,period:'2026-10'}]})).toThrow('HISTORICAL_STATE_CONFLICT');
  expect(()=>assembleSnapshot({...base,savingIdentities:[identity]})).toThrow('HISTORICAL_FUNDING_CONFLICT');
  expect(()=>assembleSnapshot({...base,periods:[{id:id(31),...base.scope,accountId:id(999),period:'2026-10'}]})).toThrow('SCOPE_MISMATCH');
});
it('HB14-043 genuine saving correction changes only new K; identity created after H remains absent',()=>{
  const base=input(),positionId=id(50),event:SavingEvent={id:id(51),savingsId:id(52),logicalFactId:id(51),supersedesId:null,previousRevisionId:null,beforeState:null,
    positionId,effectiveDate:day('2026-10-06'),confirmedAt:'2026-11-02T00:00:00.000000Z',recordedSeq:2n,budgetUpdateId:id(53),action:'CREATE',
    originatingPeriodId:id(54),fundingPeriodId:id(54),title:'Synthetic',amountCents:1000n,status:'ACTIVE',confirmedIncreaseAmount:null,confirmedReleasedAmount:null};
  const corrected={...event,id:id(55),supersedesId:event.id,amountCents:2000n,recordedSeq:3n};
  const history={...base.obligationHistory,knowledgeCut:3n,positions:[...base.obligationHistory.positions,{id:positionId,historicalDate:event.effectiveDate,recordedSeq:2n}],
    orderings:[...base.obligationHistory.orderings,{id:id(56),historicalDate:event.effectiveDate,recordedSeq:2n,previousRevisionId:null,positionIds:[positionId],edges:[]}]};
  const withSavings={...base,capturedSeq:3n,obligationHistory:history,savingHistory:{...history,savings:[event,corrected]},
    savingIdentities:[{id:event.savingsId,...base.scope,originatingPeriodId:id(54),recordedSeq:2n}],periods:[{id:id(54),...base.scope,period:'2026-11'}]};
  const older=assembleSnapshot({...withSavings,obligationHistory:{...history,knowledgeCut:2n},savingHistory:{...withSavings.savingHistory,knowledgeCut:2n}});
  const newer=assembleSnapshot(withSavings);
  expect(older.kind==='ACTIVE_COMPLETE'&&older.savings[0].amount).toBe(1000n);expect(newer.kind==='ACTIVE_COMPLETE'&&newer.savings[0].amount).toBe(2000n);
  const oldH=assembleSnapshot({...withSavings,asOfDate:day('2026-10-05')});expect(oldH.kind==='ACTIVE_COMPLETE'&&oldH.savings).toEqual([]);
});
it('HB14-056 correction reposition resolves before H and never resurrects old observation',()=>{
  const base=input(),a=observe(emptyHistory(),'2026-10-05','50000'),b=observe(a.history,'2026-10-10','45000');
  const c=observe(b.history,'2026-10-11','51000',{correction:{checkpointId:a.checkpoint.id,allocationRevisionId:a.vector.id,reposition:true}});
  const changed={...base,capturedSeq:3n,activeAllocationRevisionId:c.activeVectorId,obligationHistory:{...c.history,events:[]},savingHistory:{...c.history,savings:[]},asOfDate:day('2026-10-07')};
  expect(assembleSnapshot(changed).kind).toBe('NO_OBSERVATION');
  const old=assembleSnapshot({...changed,obligationHistory:{...changed.obligationHistory,knowledgeCut:2n},savingHistory:{...changed.savingHistory,knowledgeCut:2n}});
  expect(old.kind==='ACTIVE_COMPLETE'&&old.checkpoint.balance).toBe(50000n);
});
it('HB14-045/063 captured immutable query and safe auth/storage failures',async()=>{
  let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});
  const authorize=vi.fn(async()=>{await gate;return {ownerUserId:id(2),accountId:id(1)};});
  const reader:ProjectionSnapshotReader={read:vi.fn(async()=>({ok:true as const,value:{snapshot:state(),asOfDate:day('2026-11-28')}}))};
  const read=createProjectionReader(authorize,reader),query={targetPeriod:'2026-12'},promise=read(id(1),query);query.targetPeriod='2026-10';release();
  const result=value(await promise);expect(result.kind==='PERIOD_ESTIMATE'&&result.budget.period).toBe('2026-12');expect(Object.isFrozen(result)).toBe(true);
  const deniedReader={read:vi.fn()};expect(await createProjectionReader(async()=>{throw Error('UNAUTHORIZED');},deniedReader)(id(1),{targetPeriod:null})).toEqual({ok:false,code:'UNAUTHORIZED'});
  expect(deniedReader.read).not.toHaveBeenCalled();
  expect(await createProjectionReader(async()=>({ownerUserId:id(2),accountId:id(1)}),{read:async()=>{throw Error('SQL private financial secret');}})(id(1),{targetPeriod:null})).toEqual({ok:false,code:'STORAGE_ERROR'});
});
it.each([{targetPeriod:null,knowledgeCut:'1'},{targetPeriod:null,asOfDate:'2026-11-01'},{targetPeriod:null,ownerUserId:id(2)},{targetPeriod:'bad'}])('HB14 H/K/clock are not public query inputs %j',async query=>{
  const reader={read:vi.fn()};const read=createProjectionReader(async()=>({ownerUserId:id(2),accountId:id(1)}),reader);
  expect(await read(id(1),query)).toEqual({ok:false,code:'INVALID_INPUT'});expect(reader.read).not.toHaveBeenCalled();
});
it('HB14-060 preflight exact limits/limit+1 and bounded legacy validation work',()=>{
  expect(()=>checkProjectionBudget(20000n,8388608n,2000n,1200n)).not.toThrow();
  for(const values of [[20001n,0n,0n,0n],[0n,8388609n,0n,0n],[0n,0n,2001n,0n],[0n,0n,0n,1201n]] as const)
    expect(()=>checkProjectionBudget(values[0],values[1],values[2],values[3])).toThrow('PROJECTION_LIMIT_EXCEEDED');
});
it('HB14-060 actual wire DTO >1MiB refuses without partial success',()=>{
  const ss=Array.from({length:1000},(_,i)=>({...saving(1n,'2026-11',1000+i),title:'😀'.repeat(200)}));
  const r=value(projectAccount(state(10000n,undefined,[],ss),'2026-11-28'));
  const encoded=encodeProjection(r);expect(encoded.ok).toBe(false);if(!encoded.ok)expect(encoded.code).toBe('PROJECTION_LIMIT_EXCEEDED');
});
