import { expect, it } from 'vitest';
import { planBudgetUpdate } from '@/domain/budget-update/planning';
import { parseBudgetDraft } from '@/domain/budget-update/validation';
import { assembleSnapshot } from '@/domain/forecast/assembly';
import { projectAccount } from '@/domain/forecast/budget';
import { planConfirmation } from '@/domain/checkpoints/confirmation';
import { parseCheckpoint } from '@/domain/checkpoints/validation';
import { date, ids, instant, value } from './fixtures/checkpoints';
import { emptyContext, draft, checkpoint, createObligation, createSaving, coordinates, applied, transitionDraft } from './fixtures/budget-update';

it('HBH-002 S0 existing daily assembler preserves October K0 and late K2 with November head', () => {
  const empty = emptyContext();
  const initial = applied(empty, value(planBudgetUpdate(empty, value(parseBudgetDraft(draft(empty,
    checkpoint('2026-10-20','80000',{'2026-10':'60000','2026-11':'20000'}),
    [createObligation('20000','2026-10')], [createSaving('10000','2026-10')]))), coordinates())));
  const transition = transitionDraft(initial,'FRESH_START','100000',{'2026-11':'80000','2026-12':'20000'});
  const reviewed = {...transition, allocationChange:{...transition.allocationChange, futureEdits:[{period:'2026-12',beforeAmountCents:'0',afterAmountCents:'20000',explicitConsent:true}]}};
  const moved = applied(initial, value(planBudgetUpdate(initial, value(parseBudgetDraft(reviewed)), coordinates(2n))));
  const late = value(planConfirmation(moved.history, value(parseCheckpoint(checkpoint('2026-10-31','76000',
    {'2026-10':'56000','2026-11':'20000'}))),3n,ids(),date('2026-11-08'),instant('2026-11-08T12:00:00Z')));
  for (const [cut,balance,allocated,free] of [[1n,80000n,60000n,30000n],[3n,76000n,56000n,26000n]] as const) {
    const history = {...late.history, knowledgeCut:cut};
    const snapshot = assembleSnapshot({scope:moved.scope,asOfDate:date('2026-10-31'),capturedSeq:3n,
      capturedAggregateRevision:3n,activeAllocationRevisionId:late.activeVectorId,
      obligationHistory:{...history,events:moved.obligations.filter(e=>e.recordedSeq<=cut)},
      savingHistory:{...history,savings:moved.savings.filter(e=>e.recordedSeq<=cut)},
      obligationIdentities:initial.obligations.map(e=>({id:e.obligationId,...moved.scope,originatingPeriodId:e.originatingPeriodId,recordedSeq:e.recordedSeq})),
      savingIdentities:initial.savings.map(e=>({id:e.savingsId,...moved.scope,originatingPeriodId:e.originatingPeriodId,recordedSeq:e.recordedSeq})),
      periods:moved.periods.map(p=>({...p,...moved.scope}))});
    const projection = value(projectAccount(snapshot,'2026-10-31'));
    expect(projection.kind).toBe('ACCOUNT_ESTIMATE');
    if(projection.kind!=='ACCOUNT_ESTIMATE')throw Error('estimate');
    expect(projection.bank.balance).toBe(balance);
    expect(projection.periods.find(p=>p.period==='2026-10')).toMatchObject({allocated,reserved:20000n,savings:10000n,free});
    expect(late.activeVectorId).toBe(moved.activeVectorId);
  }
});
