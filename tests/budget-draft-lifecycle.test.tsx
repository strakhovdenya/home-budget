// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { catalogs } from '@/shared/i18n/catalogs';
import { AppThemeProvider } from '@/shared/ui/app-theme-provider';
import { BudgetDraftProvider } from '@/features/budget-updates/budget-draft-provider';
import { UpdateBudgetScreen } from '@/features/budget-updates/update-budget-screen';
import type { BudgetActions, UpdateSeed } from '@/features/budget-updates/presentation';
import type { CanonicalValue } from '@/domain/updates/contracts';
import { fixtureD, coordinates } from './fixtures/budget-update';
import { value, id } from './fixtures/checkpoints';
import { parseBudgetDraft } from '@/domain/budget-update/validation';
import { planBudgetUpdate } from '@/domain/budget-update/planning';

afterEach(cleanup);
beforeEach(()=>{window.matchMedia=vi.fn(query=>({media:query,matches:false,onchange:null,addListener:vi.fn(),removeListener:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn(),dispatchEvent:vi.fn()}));});
const wire=(v:unknown):CanonicalValue=>JSON.parse(JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x));
const t=catalogs.en.budgetUpdate;
function setup(unknown=false){
  const context=fixtureD(),periods=new Map(context.periods.map(p=>[p.id,p.period]));
  const first=wire({revision:'1',knowledgeCut:'1',today:context.today,baseCheckpointId:context.history.checkpoints[0].id,baseVectorId:context.activeVectorId,
    bank:{balanceCents:'50000',observedDate:'2026-10-30'},allocations:context.history.vectors[0].allocations,placement:null,
    obligations:context.obligations.map(o=>({...o,fundingPeriod:periods.get(o.fundingPeriodId)})),savings:context.savings.map(s=>({...s,fundingPeriod:periods.get(s.fundingPeriodId)}))})as unknown as UpdateSeed;
  const fresh:UpdateSeed={...first,revision:'2',knowledgeCut:'2',baseCheckpointId:id(),baseVectorId:id(),bank:{balanceCents:'60000',observedDate:'2026-11-03'},
    allocations:[{period:'2026-11',amountCents:'50000'},{period:'2026-12',amountCents:'10000'}]};
  const receipt={updateId:id(),recordedSeq:'2',aggregateRevision:'2'};
  const a:BudgetActions={load:vi.fn(),preview:vi.fn(async(input:unknown)=>{
    const command=input as {payload:unknown},plan=value(planBudgetUpdate(context,value(parseBudgetDraft(command.payload)),coordinates(2n)));
    return {ok:true as const,value:wire({...input as object,payload:{schemaVersion:1,draft:command.payload,review:{financial:plan.review,reportImpact:[]},proposalId:null}})};
  }),confirm:vi.fn(async()=>unknown?{ok:false as const,code:'COMMIT_OUTCOME_UNKNOWN' as const}:{ok:true as const,value:receipt}),
  status:vi.fn(async()=>({ok:true as const,value:null})),history:vi.fn(async()=>({ok:true as const,value:[]}))};
  function Routes(){const [shown,setShown]=useState(true),[seed,setSeed]=useState(first),[scope,setScope]=useState('owner-a:account-a');
    return <><button onClick={()=>setShown(false)}>leave route</button><button onClick={()=>{setSeed(fresh);setShown(true);}}>reopen route</button>
      <button onClick={()=>{setScope('owner-b:account-a');setSeed(fresh);}}>change owner</button>
      <button onClick={()=>{setScope('owner-a:account-b');setSeed(fresh);}}>change account</button>
      {shown?<UpdateBudgetScreen initialSeed={seed} actions={a} scopeKey={scope}/>:null}</>;}
  render(<NextIntlClientProvider locale="en" messages={catalogs.en} timeZone="Europe/Berlin"><AppThemeProvider><BudgetDraftProvider><Routes/></BudgetDraftProvider></AppThemeProvider></NextIntlClientProvider>);
  return {a,receipt,user:userEvent.setup()};
}
const balance=()=>screen.getByRole('textbox',{name:t.balance})as HTMLInputElement;
async function save(f:ReturnType<typeof setup>){await f.user.click(screen.getByRole('checkbox',{name:t.vectorConsent}));await f.user.click(screen.getByRole('button',{name:t.preview}));await f.user.click(await screen.findByRole('button',{name:t.confirm}));await waitFor(()=>expect(f.a.confirm).toHaveBeenCalledTimes(1));}

it('HB18-R1 clean reopen uses fresh server seed and creates no financial request',async()=>{
  const f=setup();await f.user.click(screen.getByText('leave route'));await f.user.click(screen.getByText('reopen route'));
  expect(balance().value).toBe('600.00');expect((screen.getAllByRole('textbox',{name:t.allocated})[0]as HTMLInputElement).value).toBe('500.00');
  expect(f.a.preview).not.toHaveBeenCalled();expect(f.a.confirm).not.toHaveBeenCalled();expect(f.a.load).not.toHaveBeenCalled();
});
it('HB18-R1 saved receipt survives navigation while clean fields and consents use fresh seed',async()=>{
  const f=setup();await save(f);await screen.findByText(f.receipt.updateId);await f.user.click(screen.getByText('leave route'));await f.user.click(screen.getByText('reopen route'));
  expect(balance().value).toBe('600.00');expect(screen.getByText(f.receipt.updateId)).toBeTruthy();
  expect((screen.getByRole('checkbox',{name:t.vectorConsent})as HTMLInputElement).checked).toBe(false);
  expect(screen.queryByRole('button',{name:t.confirm})).toBeNull();expect(f.a.confirm).toHaveBeenCalledTimes(1);expect(f.a.preview).toHaveBeenCalledTimes(1);
});
it('HB18-R1 dirty draft retains its reviewed base across navigation instead of auto rebasing',async()=>{
  const f=setup();await f.user.clear(balance());await f.user.type(balance(),'444.44');await f.user.click(screen.getByText('leave route'));await f.user.click(screen.getByText('reopen route'));
  expect(balance().value).toBe('444.44');expect((screen.getAllByRole('textbox',{name:t.allocated})[0]as HTMLInputElement).value).toBe('400.00');
  expect(f.a.preview).not.toHaveBeenCalled();expect(f.a.confirm).not.toHaveBeenCalled();
});
it('HB18-R1 unknown outcome retains exact original request and only retries on explicit action',async()=>{
  const f=setup(true);await save(f);await screen.findByRole('button',{name:t.retrySame});
  const original=vi.mocked(f.a.confirm).mock.calls[0][0]as {requestId:string};
  await f.user.click(screen.getByText('leave route'));await f.user.click(screen.getByText('reopen route'));
  expect(balance().value).toBe('500.00');expect(balance().disabled).toBe(true);expect(f.a.confirm).toHaveBeenCalledTimes(1);
  await f.user.click(screen.getByRole('button',{name:t.checkResult}));expect(f.a.status).toHaveBeenCalledWith(original.requestId);
  await f.user.click(screen.getByRole('button',{name:t.retrySame}));await waitFor(()=>expect(f.a.confirm).toHaveBeenCalledTimes(2));
  expect(vi.mocked(f.a.confirm).mock.calls[1][0]).toBe(original);expect(f.a.preview).toHaveBeenCalledTimes(1);
});
it.each(['owner','account'])('HB18-R1 %s change isolates dirty state and confirmed receipt',async(kind)=>{
  const f=setup();await save(f);await screen.findByText(f.receipt.updateId);await f.user.clear(balance());await f.user.type(balance(),'444.44');
  await f.user.click(screen.getByText('change '+kind));expect(balance().value).toBe('600.00');expect(screen.queryByText(f.receipt.updateId)).toBeNull();
  expect(f.a.confirm).toHaveBeenCalledTimes(1);expect(f.a.preview).toHaveBeenCalledTimes(1);
});
