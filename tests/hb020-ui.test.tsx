// @vitest-environment jsdom
import {act,cleanup,render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {NextIntlClientProvider} from 'next-intl';
import {catalogs} from '@/shared/i18n/catalogs';
import {AppThemeProvider} from '@/shared/ui/app-theme-provider';
import {FirstRunScreen} from '@/features/onboarding/first-run-screen';
import {ManagementScreen} from '@/features/management/management-screen';
import type {ManagementActions} from '@/features/management/management-screen';
import type {ManagementList} from '@/domain/management/contracts';
import {projectAccount} from '@/domain/forecast/budget';
import {state,obligation,day} from './fixtures/forecast';
import {TemplateScreen} from '@/features/recurring/template-screen';
import {planBudgetUpdate} from '@/domain/budget-update/planning';
import {parseBudgetDraft} from '@/domain/budget-update/validation';
import {emptyContext,coordinates} from './fixtures/budget-update';
import {value,id} from './fixtures/checkpoints';
import type {CanonicalValue} from '@/domain/updates/contracts';
import type {TemplateSeed,TemplateActions} from '@/domain/recurring/ports';
afterEach(cleanup);
const routing=vi.hoisted(()=>({refresh:vi.fn(),push:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>routing}));
beforeEach(()=>{
  vi.clearAllMocks();window.matchMedia=vi.fn(query=>({media:query,matches:false,onchange:null,addListener:vi.fn(),removeListener:vi.fn(),
    addEventListener:vi.fn(),removeEventListener:vi.fn(),dispatchEvent:vi.fn()}));
});
const wire=(v:unknown):CanonicalValue=>JSON.parse(JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x));
function ui(children:React.ReactNode,locale:keyof typeof catalogs='en'){
  return <NextIntlClientProvider locale={locale} messages={catalogs[locale]} timeZone="Europe/Berlin"><AppThemeProvider>{children}</AppThemeProvider></NextIntlClientProvider>;
}
function first(){
  const context=emptyContext(),receipt={updateId:id(),recordedSeq:'1',aggregateRevision:'1'};
  const actions={
    preview:vi.fn(async(input:unknown)=>{
      const command=input as {payload:unknown},plan=value(planBudgetUpdate(context,value(parseBudgetDraft(command.payload)),coordinates()));
      return {ok:true as const,value:wire({...input as object,payload:{schemaVersion:1,draft:command.payload,review:{financial:plan.review},proposalId:null}})};
    }),
    confirm:vi.fn(async(input:unknown)=>{void input;return {ok:false as const,code:'COMMIT_OUTCOME_UNKNOWN' as const};}),
    status:vi.fn(async(key:unknown)=>{void key;return {ok:true as const,value:null};}),
  };
  return {actions,context,receipt};
}
it.each(['ru','de','en'] as const)('HB20-A01 HB20-B01 component %s starts unknown, blank balance, real-date input, no account/name writes',locale=>{
  const f=first();render(ui(<FirstRunScreen today={f.context.today} actions={f.actions}/>,locale));
  expect(screen.getByRole('heading',{level:1,name:catalogs[locale].firstRun.title})).toBeTruthy();
  expect((screen.getByLabelText(catalogs[locale].budgetUpdate.balance+' *') as HTMLInputElement).value).toBe('');
  expect(f.actions.preview).not.toHaveBeenCalled();expect(f.actions.confirm).not.toHaveBeenCalled();
});
it('HB20-A04 HB20-A06 HB20-B02 component retains one reviewed request through UNKNOWN and NOT_FOUND',async()=>{
  const f=first(),user=userEvent.setup();render(ui(<FirstRunScreen today={f.context.today} actions={f.actions}/>));
  await user.type(screen.getByRole('textbox',{name:/Actual card balance/}), '1000');
  await user.type(screen.getByRole('textbox',{name:/Allocated/}), '1000');
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button',{name:catalogs.en.firstRun.review}));
  await screen.findByRole('button',{name:catalogs.en.firstRun.confirm});expect(f.actions.confirm).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button',{name:catalogs.en.firstRun.confirm}));
  await screen.findByText(catalogs.en.firstRun.outcomeUnknown);
  await user.click(screen.getByRole('button',{name:catalogs.en.firstRun.status}));
  expect(screen.getByText(catalogs.en.firstRun.outcomeUnknown)).toBeTruthy();
  expect((screen.getByRole('button',{name:catalogs.en.firstRun.edit}) as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByRole('button',{name:catalogs.en.firstRun.retry}));
  expect(f.actions.confirm).toHaveBeenCalledTimes(2);expect(f.actions.confirm.mock.calls[1][0]).toEqual(f.actions.confirm.mock.calls[0][0]);
});
function recurring(){
  const source={id:id(),version:id(),title:'Synthetic monthly bill',amountCents:'5400',enabled:true};
  const seed:TemplateSeed={schemaVersion:1,revision:'2',today:'2026-11-03',originPeriod:'2026-11',configs:[source],offers:[source],decisions:[],placement:null};
  const receipt={updateId:id(),recordedSeq:'3',aggregateRevision:'3'};
  const actions:TemplateActions={load:vi.fn(async()=>({ok:true as const,value:wire(seed)})),
    commit:vi.fn(async()=>({ok:true as const,value:receipt})),status:vi.fn(async()=>({ok:true as const,value:null}))};
  return {seed,source,actions,tree:ui(<TemplateScreen today={seed.today} initial={{ok:true,value:wire(seed)}} actions={actions}/>)};
}
it('HB20-T02 component Later closes locally without a saved decision; reload may offer again',async()=>{
  const f=recurring(),user=userEvent.setup();render(f.tree);
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring.later}));
  expect(screen.queryByRole('button',{name:catalogs.en.recurring.accept})).toBeNull();expect(f.actions.commit).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring.load}));
  expect(await screen.findByRole('button',{name:catalogs.en.recurring.accept})).toBeTruthy();expect(f.actions.commit).not.toHaveBeenCalled();
});
it('HB20-T02 component DECLINE requires explicit review and contains no amount or financing',async()=>{
  const f=recurring(),user=userEvent.setup();render(f.tree);
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring.decline}));
  expect(f.actions.commit).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring.confirm}));
  const command=vi.mocked(f.actions.commit).mock.calls[0][0] as {payload:Record<string,unknown>};
  expect(command.payload).toEqual({schemaVersion:1,action:'DECLINE',templateId:f.source.id,templateVersion:f.source.version,originPeriod:'2026-11'});
});

it.each(['FORBIDDEN','STORAGE_ERROR'] as const)('HB20-A01 HB20-B04 component keeps template %s separate without automatic repair',code=>{
  const f=recurring();render(ui(<TemplateScreen today={f.seed.today} initial={{ok:false,code}} actions={f.actions}/>));
  expect(screen.getByRole('alert').textContent).toBe(code==='FORBIDDEN'?catalogs.en.recurring.scopeError:catalogs.en.recurring.storageError);
  expect(f.actions.load).not.toHaveBeenCalled();expect(f.actions.commit).not.toHaveBeenCalled();
});


it('HB20-A08 HB20-B03 abandoning an unconfirmed draft or review leaves no writes and remounts with unknown blank balance',async()=>{
  const f=first(),user=userEvent.setup(),rendered=render(ui(<FirstRunScreen today={f.context.today} actions={f.actions}/>));
  await user.type(screen.getByRole('textbox',{name:/Actual card balance/}),'1000');await user.type(screen.getByRole('textbox',{name:/Allocated/}),'1000');
  await user.click(screen.getByRole('checkbox'));await user.click(screen.getByRole('button',{name:catalogs.en.firstRun.review}));
  await user.click(await screen.findByRole('button',{name:catalogs.en.firstRun.edit}));expect(f.actions.confirm).not.toHaveBeenCalled();
  rendered.unmount();render(ui(<FirstRunScreen today={f.context.today} actions={f.actions}/>));
  expect((screen.getByRole('textbox',{name:/Actual card balance/}) as HTMLInputElement).value).toBe('');
  expect(f.actions.confirm).not.toHaveBeenCalled();expect(f.actions.status).not.toHaveBeenCalled();
});


it('HB20-T01 D57 one loaded month context is visible, no month inputs, edited ACCEPT freezes P through UNKNOWN',async()=>{
  const f=recurring(),user=userEvent.setup();
  f.seed.originPeriod='2027-02';
  f.actions.commit=vi.fn(async()=>({ok:false as const,code:'COMMIT_OUTCOME_UNKNOWN' as const}));
  render(ui(<TemplateScreen today={f.seed.today} initial={{ok:true,value:wire(f.seed)}} actions={f.actions}/>));
  expect(document.querySelectorAll('input[type="month"]')).toHaveLength(0);
  expect(screen.getByText('Payments for February 2027')).toBeTruthy();
  const amount=screen.getAllByRole('textbox',{name:catalogs.en.recurring.amount})[0];
  await user.clear(amount);await user.type(amount,'50');
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring.accept}));
  expect(screen.getAllByText('Payments for February 2027')).toHaveLength(2);
  expect(f.actions.commit).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring.confirm}));
  const command=vi.mocked(f.actions.commit).mock.calls[0][0];
  expect(command).toMatchObject({effectiveDate:'2026-11-03',payload:{originPeriod:'2027-02',fundingPeriod:'2027-02',amountCents:'5000'}});
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring.status}));
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring.retry}));
  expect(vi.mocked(f.actions.commit).mock.calls[1][0]).toEqual(command);
});
it('HB20-T02 D57 reload cannot replace loaded P with another context before DECLINE',async()=>{
  const f=recurring(),user=userEvent.setup();
  f.actions.load=vi.fn(async()=>({ok:true as const,value:wire({...f.seed,originPeriod:'2026-12'})}));
  render(ui(<TemplateScreen today={f.seed.today} initial={{ok:true,value:wire(f.seed)}} actions={f.actions}/>));
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring.load}));
  expect(f.actions.load).toHaveBeenCalledWith('2026-11');
  expect(screen.getByText('Payments for November 2026')).toBeTruthy();
  expect(screen.queryByText('Payments for December 2026')).toBeNull();
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring.decline}));
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring.confirm}));
  expect(vi.mocked(f.actions.commit).mock.calls[0][0]).toMatchObject({payload:{action:'DECLINE',originPeriod:'2026-11'}});
});

function confirmedMoney(reserved:bigint,cut='2'):ManagementList{
  const item={...obligation(reserved),title:'Internet',original:5000n,originPeriod:'2026-11' as ReturnType<typeof state>['allocations'][number]['period'],effectiveDate:day('2026-11-12')};
  const s=state(100000n,{'2026-11':70000n,'2026-12':30000n},reserved?[item]:[]);
  const snapshot={...s,provenance:{...s.provenance,historicalThroughDate:day('2026-11-12')},checkpoint:{...s.checkpoint,observedDate:day('2026-11-12')},allocationEffectiveDate:day('2026-11-12')};
  return wire({scopeKey:'synthetic-owner',revision:cut,knowledgeCut:cut,today:'2026-11-12',obligations:snapshot.obligations,savings:[],projection:value(projectAccount(snapshot,day('2026-11-12')))}) as unknown as ManagementList;
}
it('HB20-UX02 ACCEPT updates the still-mounted safe daily 36.84 to 34.21 only after one proved commit, without browser refresh',async()=>{
  const f=recurring(),user=userEvent.setup();f.source.amountCents='5000';f.source.title='Internet';f.seed.today='2026-11-12';
  let complete!:(r:{ok:true;value:{updateId:string;recordedSeq:string;aggregateRevision:string}})=>void;
  f.actions.commit=vi.fn(()=>new Promise<Awaited<ReturnType<TemplateActions['commit']>>>(r=>{complete=r;}));
  const management:ManagementActions={load:vi.fn(async()=>({ok:true as const,value:confirmedMoney(5000n,'3')})),history:vi.fn(),propose:vi.fn()};
  render(ui(<><ManagementScreen initial={confirmedMoney(0n)} kind="OBLIGATION" actions={management}/><TemplateScreen today={f.seed.today} initial={{ok:true,value:wire(f.seed)}} actions={f.actions}/></>));
  expect(screen.getByText(catalogs.en.management.safeDaily+': €36.84')).toBeTruthy();
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring.accept}));
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring.confirm}));
  expect(management.load).not.toHaveBeenCalled();expect(screen.queryByText(catalogs.en.management.safeDaily+': €34.21')).toBeNull();
  await act(async()=>complete({ok:true,value:{updateId:id(),recordedSeq:'3',aggregateRevision:'3'}}));
  expect(await screen.findByText(catalogs.en.management.safeDaily+': €34.21')).toBeTruthy();
  expect(screen.getByText(catalogs.en.dashboard.bank+': €1,000.00')).toBeTruthy();
  expect(f.actions.commit).toHaveBeenCalledTimes(1);expect(management.load).toHaveBeenCalledTimes(1);
});
it.each(['DECLINE','CONFIG'] as const)('HB20-UX02 UX05 %s refreshes confirmed controls without inventing a reserve',async action=>{
  const f=recurring(),user=userEvent.setup(),management:ManagementActions={load:vi.fn(async()=>({ok:true as const,value:confirmedMoney(0n,'3')})),history:vi.fn(),propose:vi.fn()};
  render(ui(<><ManagementScreen initial={confirmedMoney(0n)} kind="OBLIGATION" actions={management}/><TemplateScreen today={f.seed.today} initial={{ok:true,value:wire(f.seed)}} actions={f.actions}/></>));
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring[action==='DECLINE'?'decline':'disable']}));
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring.confirm}));
  const message=action==='DECLINE'?catalogs.en.recurring.savedDecline.replace('{name}',f.source.title).replace('{month}','November 2026'):catalogs.en.recurring.savedDisable.replace('{name}',f.source.title);
  expect(await screen.findByText(message)).toBeTruthy();
  expect(screen.getByText(catalogs.en.management.safeDaily+': €36.84')).toBeTruthy();
  expect(vi.mocked(f.actions.commit).mock.calls[0][0]).toMatchObject({payload:{action}});
});
it('HB20-UX03 explicit context navigation changes only period URL; back/forward props cannot retarget UNKNOWN December acceptance',async()=>{
  const f=recurring(),user=userEvent.setup(),rendered=render(f.tree);
  await user.selectOptions(screen.getByRole('combobox',{name:catalogs.en.periodNavigation.month}),'12');
  await user.click(screen.getByRole('button',{name:catalogs.en.periodNavigation.show}));
  expect(routing.push).toHaveBeenCalledWith('/obligations?period=2026-12');expect(f.actions.commit).not.toHaveBeenCalled();
  const december={...f.seed,originPeriod:'2026-12',configs:[{...f.source,amountCents:'6000'}],offers:[{...f.source,amountCents:'6000'}]};
  f.actions.commit=vi.fn(async()=>({ok:false as const,code:'COMMIT_OUTCOME_UNKNOWN' as const}));
  rendered.rerender(ui(<TemplateScreen today={f.seed.today} initial={{ok:true,value:wire(december)}} actions={f.actions}/>));
  await screen.findByText('Payments for December 2026');
  expect((screen.getAllByRole('textbox',{name:catalogs.en.recurring.amount})[0] as HTMLInputElement).value).toBe('60.00');
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring.accept}));await user.click(screen.getByRole('button',{name:catalogs.en.recurring.confirm}));
  const frozen=vi.mocked(f.actions.commit).mock.calls[0][0];
  rendered.rerender(ui(<TemplateScreen today={f.seed.today} initial={{ok:true,value:wire(f.seed)}} actions={f.actions}/>));
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring.retry}));
  expect(vi.mocked(f.actions.commit).mock.calls[1][0]).toEqual(frozen);
  expect(frozen).toMatchObject({payload:{originPeriod:'2026-12',fundingPeriod:'2026-12',amountCents:'6000'}});
});

it('HB20-UX05 terminal decision text uses its original title, not renamed current configuration',()=>{
  const f=recurring();f.seed.configs[0].title='Current renamed template';f.seed.offers=[];
  f.seed.decisions=[{title:'Original mobile',input:{action:'DECLINE',templateId:f.source.id,originPeriod:'2026-11'},receipt:{updateId:id(),recordedSeq:'3',aggregateRevision:'3'}}];
  render(ui(<TemplateScreen today={f.seed.today} initial={{ok:true,value:wire(f.seed)}} actions={f.actions}/>));
  expect(screen.getByText('Original mobile — not added for November 2026')).toBeTruthy();
  expect(screen.queryByText('Current renamed template — not added for November 2026')).toBeNull();
  expect(f.actions.commit).not.toHaveBeenCalled();
});

it('HB20-UX02 a late pre-commit manual reload cannot replace newer confirmed money',async()=>{
  const f=recurring(),user=userEvent.setup();f.source.amountCents='5000';
  let finishOld!:(r:{ok:true;value:ManagementList})=>void;
  const load=vi.fn<ManagementActions['load']>().mockImplementationOnce(()=>new Promise(r=>{finishOld=r;})).mockResolvedValue({ok:true,value:confirmedMoney(5000n,'3')});
  const management:ManagementActions={load,history:vi.fn(),propose:vi.fn()};
  render(ui(<><ManagementScreen initial={confirmedMoney(0n)} kind="OBLIGATION" actions={management}/><TemplateScreen today={f.seed.today} initial={{ok:true,value:wire(f.seed)}} actions={f.actions}/></>));
  await user.click(screen.getByRole('button',{name:catalogs.en.management.refresh}));
  await user.click(screen.getByRole('button',{name:catalogs.en.recurring.accept}));await user.click(screen.getByRole('button',{name:catalogs.en.recurring.confirm}));
  await screen.findByText(catalogs.en.management.safeDaily+': €34.21');
  await act(async()=>finishOld({ok:true,value:confirmedMoney(0n,'2')}));
  expect(screen.getByText(catalogs.en.management.safeDaily+': €34.21')).toBeTruthy();
  expect(screen.queryByText(catalogs.en.management.safeDaily+': €36.84')).toBeNull();
});
