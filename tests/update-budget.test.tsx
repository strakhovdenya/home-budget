// @vitest-environment jsdom
import { act,cleanup,render,screen,within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { catalogs } from '@/shared/i18n/catalogs';
import { AppThemeProvider } from '@/shared/ui/app-theme-provider';
import { UpdateBudgetScreen } from '@/features/budget-updates/update-budget-screen';
import { inputCents,initialForm,makeBudgetCommand,type UpdateSeed,type BudgetActions } from '@/features/budget-updates/presentation';
import { planBudgetUpdate } from '@/domain/budget-update/planning';
import { parseBudgetDraft } from '@/domain/budget-update/validation';
import type { CanonicalValue } from '@/domain/updates/contracts';
import { fixtureD,coordinates } from './fixtures/budget-update';
import { value,id } from './fixtures/checkpoints';

afterEach(cleanup);
beforeEach(()=>{vi.restoreAllMocks();window.matchMedia=vi.fn(query=>({media:query,matches:false,onchange:null,addListener:vi.fn(),removeListener:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn(),dispatchEvent:vi.fn()}));});
const wire=(v:unknown):CanonicalValue=>JSON.parse(JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x));
function setup(locale:keyof typeof catalogs='en'){
  const c=fixtureD(),periods=new Map(c.periods.map(p=>[p.id,p.period])),cp=c.history.checkpoints.at(-1)!,vector=c.history.vectors.at(-1)!;
  const seed=wire({revision:c.revision,knowledgeCut:c.recordedSeq,today:c.today,baseCheckpointId:cp.id,baseVectorId:vector.id,
    bank:{balanceCents:cp.balanceCents,observedDate:cp.observedDate},allocations:vector.allocations,placement:null,
    obligations:c.obligations.map(o=>({...o,fundingPeriod:periods.get(o.fundingPeriodId)})),savings:c.savings.map(s=>({...s,fundingPeriod:periods.get(s.fundingPeriodId)}))}) as unknown as UpdateSeed;
  const receipt={updateId:id(),recordedSeq:'2',aggregateRevision:'2'};
  const actions:BudgetActions={load:vi.fn(async()=>({ok:true as const,value:wire(seed)})),preview:vi.fn(async (input:unknown)=>{
    const command=input as {payload:unknown},p=value(planBudgetUpdate(c,value(parseBudgetDraft(command.payload)),coordinates(2n)));
    return {ok:true as const,value:wire({...input as object,payload:{schemaVersion:1,draft:command.payload,review:{financial:p.review,reportImpact:[]},proposalId:null}})};}),
    confirm:vi.fn(async()=>({ok:true as const,value:receipt})),status:vi.fn(async()=>({ok:true as const,value:receipt})),history:vi.fn(async()=>({ok:true as const,value:[]}))};
  const tree=<NextIntlClientProvider locale={locale} messages={catalogs[locale]} timeZone="Europe/Berlin"><AppThemeProvider><UpdateBudgetScreen initialSeed={seed} actions={actions}/></AppThemeProvider></NextIntlClientProvider>;
  return {seed,actions,receipt,tree};
}
async function preview(){await userEvent.click(screen.getByRole('checkbox',{name:'I have checked the complete allocation of the card balance across all months'}));
  await userEvent.click(screen.getByRole('button',{name:'Preview result'}));await screen.findByRole('button',{name:'Confirm update'});}
it('HB17-X01 HB17-X02 preview and final submit are separate, exact amounts come from the domain',async()=>{
  const f=setup();render(f.tree);await preview();expect(f.actions.confirm).not.toHaveBeenCalled();
  expect(screen.getByText('Preview — not saved yet')).toBeTruthy();expect(screen.getByText(/Safe daily limit from confirmed data/)).toBeTruthy();
  await userEvent.click(screen.getByRole('button',{name:'Confirm update'}));await screen.findByText(/Update saved/);expect(f.actions.confirm).toHaveBeenCalledTimes(1);
});
it('HB17-X03 an edited amount invalidates the previously reviewed payload',async()=>{
  const f=setup();render(f.tree);await preview();await userEvent.type(screen.getByRole('textbox',{name:'Actual card balance, EUR'}),'1');
  expect(screen.queryByRole('button',{name:'Confirm update'})).toBeNull();expect(f.actions.confirm).not.toHaveBeenCalled();
});
it('HB17-X06 HB17-X08 a saved receipt stays success even when the following history read fails',async()=>{
  const f=setup();vi.mocked(f.actions.history).mockRejectedValue(Error('synthetic network failure'));render(f.tree);await preview();
  await userEvent.dblClick(screen.getByRole('button',{name:'Confirm update'}));await screen.findByText(/Saving is confirmed, but the result/);
  expect(screen.getByText(/Update saved/)).toBeTruthy();expect(screen.queryByText(/^The save outcome is still unknown/)).toBeNull();expect(f.actions.confirm).toHaveBeenCalledTimes(1);
});
it('HB17-X07 HB17-X10 conflict and same-identity refusals retain memory-only input',async()=>{
  const f=setup();vi.mocked(f.actions.confirm).mockResolvedValue({ok:false,code:'SAME_IDENTITY_COMPOUND_NOT_SUPPORTED'});render(f.tree);await preview();
  await userEvent.click(screen.getByRole('button',{name:'Confirm update'}));await screen.findByText(/The same item cannot/);
  expect((screen.getByRole('textbox',{name:'Actual card balance, EUR'}) as HTMLInputElement).value).toBe('500.00');expect(document.activeElement?.getAttribute('role')).toBe('alert');
});
it('HB17-X11 unknown commit status retains original command and never silently resubmits',async()=>{
  const f=setup();vi.mocked(f.actions.confirm).mockResolvedValueOnce({ok:false,code:'COMMIT_OUTCOME_UNKNOWN'});render(f.tree);await preview();
  await userEvent.click(screen.getByRole('button',{name:'Confirm update'}));await screen.findByRole('button',{name:'Check save outcome'});
  expect(f.actions.confirm).toHaveBeenCalledTimes(1);const original=vi.mocked(f.actions.confirm).mock.calls[0][0] as {requestId:string};
  expect((screen.getByRole('textbox',{name:'Actual card balance, EUR'}) as HTMLInputElement).disabled).toBe(true);
  await userEvent.click(screen.getByRole('button',{name:'Check save outcome'}));await screen.findByText(/Update saved/);
  expect(f.actions.status).toHaveBeenCalledWith(original.requestId);expect(f.actions.confirm).toHaveBeenCalledTimes(1);
});
it('HB17-X05 transitions and their consent are never preselected',async()=>{
  const f=setup();render(f.tree);expect(screen.queryByRole('combobox',{name:'Choose action'})).toBeNull();await userEvent.click(screen.getByText('Other explicitly confirmed actions'));expect((screen.getByRole('combobox',{name:'Choose action'}) as HTMLElement).textContent).toContain('Choose explicitly');
  await userEvent.click(screen.getByRole('combobox',{name:'Choose action'}));await userEvent.click(screen.getByRole('option',{name:'Start fresh while retaining obligations and savings'}));
  expect((screen.getByRole('checkbox',{name:/I confirm clearing past active allocations/}) as HTMLInputElement).checked).toBe(false);
  expect((screen.getByRole('checkbox',{name:/I confirm the full transfer/}) as HTMLInputElement).checked).toBe(false);
});
it.each(['ru','de','en'] as const)('HB17-X12 HB17-X13 accessible form, buttons and retained state in %s',async locale=>{
  const f=setup(locale);render(f.tree);expect(screen.getByRole('heading',{level:1,name:catalogs[locale].budgetUpdate.title})).toBeTruthy();
  const balance=screen.getByRole('textbox',{name:catalogs[locale].budgetUpdate.balance});expect(balance.getAttribute('inputmode')).toBe('decimal');
  expect(screen.getByRole('button',{name:catalogs[locale].budgetUpdate.preview})).toBeTruthy();
  await userEvent.click(screen.getByRole('button',{name:catalogs[locale].budgetUpdate.addSaving}));const group=screen.getByRole('group',{name:catalogs[locale].budgetUpdate.saving});
  expect(within(group).getByRole('textbox',{name:catalogs[locale].budgetUpdate.name})).toBeTruthy();
});
it('HB17-X12 exact localized input codec rejects ambiguous decimals and never rounds',()=>{
  expect(inputCents('0,01','de')).toBe('1');expect(inputCents('92233720368547758.07','en')).toBe('9223372036854775807');
  expect(()=>inputCents('1,000','de')).toThrow();expect(()=>inputCents('1e3','en')).toThrow();expect(()=>inputCents('92233720368547758.08','en')).toThrow();
});
it('HB17-X03 delayed preview cannot reactivate confirmation after the generation changes',async()=>{
  const f=setup();let resolve!:(value:Awaited<ReturnType<BudgetActions['preview']>>)=>void;
  vi.mocked(f.actions.preview).mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));render(f.tree);
  await userEvent.click(screen.getByRole('checkbox',{name:/I have checked the complete allocation/}));await userEvent.click(screen.getByRole('button',{name:'Preview result'}));
  expect(screen.queryByRole('button',{name:'Confirm update'})).toBeNull();await act(async()=>resolve({ok:false,code:'STALE_REVISION'}));
  expect(screen.queryByRole('button',{name:'Confirm update'})).toBeNull();expect(screen.getByText(catalogs.en.budgetUpdate.errors.stale)).toBeTruthy();
});
it('HB17-X04 reuse cannot authorize a payment without a new actual check',()=>{
  const {seed}=setup(),form=initialForm(seed);form.reuse=true;form.vectorConfirmed=true;form.unchangedFunding=true;
  form.edits=[{key:'o',kind:'OBLIGATION',identityId:seed.obligations[0].obligationId,action:'PARTIAL_SETTLEMENT',amount:'50.00',title:'',period:'2026-11',dueDate:'',bankDate:'',isPossible:false,reserveFull:true,source:'TRACKED_CARD'}];
  const command=makeBudgetCommand(seed,form,'en',id());expect(parseBudgetDraft(command.payload)).toMatchObject({ok:false,code:'PAYMENT_CONFIRMATION_REQUIRED'});
});

it('HB20-UX04 same-day hint focuses explicit consent; stale reload retains B950 allocations and clears consents for review',async()=>{
  const f=setup(),user=userEvent.setup();f.seed.placement={id:id(),afterPositionId:id()};f.seed.today='2026-11-12';
  render(f.tree);await user.clear(screen.getByRole('textbox',{name:catalogs.en.budgetUpdate.balance}));await user.type(screen.getByRole('textbox',{name:catalogs.en.budgetUpdate.balance}),'950');
  await user.click(screen.getByRole('button',{name:catalogs.en.budgetUpdate.preview}));
  expect(await screen.findByText(catalogs.en.budgetUpdate.errors.sameDay)).toBeTruthy();
  expect(f.actions.preview).not.toHaveBeenCalled();expect(document.activeElement?.getAttribute('name')).toBe('orderAcknowledged');
  await user.click(screen.getByRole('button',{name:catalogs.en.budgetUpdate.reloadBase}));
  expect((screen.getByRole('textbox',{name:catalogs.en.budgetUpdate.balance}) as HTMLInputElement).value).toBe('950');
  expect((screen.getByRole('checkbox',{name:catalogs.en.budgetUpdate.orderConsent}) as HTMLInputElement).checked).toBe(false);
  expect(screen.getByText(catalogs.en.budgetUpdate.sameDayHint)).toBeTruthy();
});
