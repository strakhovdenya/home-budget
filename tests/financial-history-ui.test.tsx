// @vitest-environment jsdom
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {NextIntlClientProvider} from 'next-intl';
import {AppThemeProvider} from '@/shared/ui/app-theme-provider';
import {catalogs} from '@/shared/i18n/catalogs';
import {FinancialHistoryScreen} from '@/features/financial-history/history-screen';
import type {Page} from '@/domain/history/contracts';
import type {HistoryActions} from '@/features/financial-history/read-history';
const id='00000000-0000-4000-8000-000000000001';
const page=():Page=>({schemaVersion:1,basis:{schemaVersion:1,indexAnchor:id,knowledgeCut:'45',month:null,today:'2026-11-09',capturedAt:'2026-11-09T12:00:00.000000Z'},fromLastSeq:null,lastSeq:null,nextLastSeq:'26',sourceValidity:'VALID',
  items:[{id,kind:'BANK_CHECKPOINT',recordedSeq:'45',recordedAt:'2026-11-09T11:00:00.000000Z',sourceStatus:'VALID',sources:[{kind:'BANK_CHECKPOINT',id,date:'2026-10-20',recordedSeq:'45',positionId:id,supersedesId:null,previousRevisionId:null,action:null}]}]});
function actions():HistoryActions{return {open:vi.fn(async()=>({ok:true as const,value:page()})),page:vi.fn(),detail:vi.fn(async(raw:unknown)=>{const q=raw as Record<string,unknown>;return {ok:true as const,value:{schemaVersion:1,offset:0,basis:page().basis,batchId:id,precision:'DAY',perspective:q.perspective as string,dayH:q.dayH as string,knowledgeCut:q.perspective==='ORIGINAL'?'3':'45',endBalance:null,snapshot:{kind:'NO_OBSERVATION',knownObligations:[],knownSavings:[]},periods:[{period:'2026-10',allocated:null,reserved:'2000',savings:'1000',free:null,deficit:null}],evidence:[],nextOffset:null}};})};}
function mount(a=actions(),locale:keyof typeof catalogs='en',initial=page()){
  return render(<NextIntlClientProvider locale={locale} messages={catalogs[locale]} timeZone="Europe/Berlin"><AppThemeProvider><FinancialHistoryScreen initial={{ok:true as const,value:initial}} actions={a}/></AppThemeProvider></NextIntlClientProvider>);
}
beforeEach(()=>{localStorage.clear();sessionStorage.clear();window.matchMedia=vi.fn(query=>({media:query,matches:false,onchange:null,addListener:vi.fn(),removeListener:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn(),dispatchEvent:vi.fn()}));});afterEach(cleanup);
it.each(['ru','de','en'] as const)('HBH-007 localized daily basis, UNKNOWN/full R/S and focus are component evidence only %s',async locale=>{
  const a=actions(),t=catalogs[locale].financialHistory;mount(a,locale);await userEvent.click(screen.getByRole('button',{name:t.open}));
  await screen.findAllByText(t.unknown,{exact:false});
  expect(screen.getAllByText(t.unknown).length).toBeGreaterThan(0);expect(screen.getByText(t.originalCaption.replace('{day}',new Intl.DateTimeFormat(locale,{timeZone:'Europe/Berlin',day:'numeric',month:'long',year:'numeric'}).format(new Date('2026-10-31T12:00:00Z'))).replace('{cut}','3'))).toBeTruthy();
  expect(a.detail).toHaveBeenCalledWith(expect.objectContaining({dayH:'2026-10-31',perspective:'ORIGINAL'}));
  await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('heading',{level:2,name:t.selected})));
  expect(localStorage.length).toBe(0);expect(sessionStorage.length).toBe(0);expect(location.search).toBe('');
});
it('HBH-006/007 mismatched valid basis cannot replace an existing page',async()=>{
  const a=actions(),first=page();a.page=vi.fn(async()=>({ok:true as const,value:{...first,basis:{...first.basis,knowledgeCut:'46'},items:[]}}));mount(a);
  await userEvent.click(screen.getByRole('button',{name:catalogs.en.financialHistory.next}));
  expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.getByRole('button',{name:catalogs.en.financialHistory.open})).toBeTruthy();
});
it('HBH-006/007 verified next page navigation and refresh clear the navigation stack',async()=>{
  const a=actions(),first=page();a.page=vi.fn(async(raw:unknown)=>{const q=raw as Page;return {ok:true as const,value:{...first,fromLastSeq:q.fromLastSeq,lastSeq:q.lastSeq,nextLastSeq:null}};});mount(a);
  await userEvent.click(screen.getByRole('button',{name:catalogs.en.financialHistory.next}));await waitFor(()=>expect((screen.getByRole('button',{name:catalogs.en.financialHistory.previous})as HTMLButtonElement).disabled).toBe(false));
  await userEvent.click(screen.getByRole('button',{name:catalogs.en.financialHistory.refresh}));
  await waitFor(()=>expect((screen.getByRole('button',{name:catalogs.en.financialHistory.previous})as HTMLButtonElement).disabled).toBe(true));
  expect(a.open).toHaveBeenCalledWith({schemaVersion:1,month:null});
});
it('HBH-007 observed zero and negative F are rendered as amounts',async()=>{
  const a=actions();a.detail=vi.fn(async()=>({ok:true as const,value:{schemaVersion:1,offset:0,basis:page().basis,batchId:id,perspective:'ORIGINAL',precision:'DAY',dayH:'2026-10-31',knowledgeCut:'45',snapshot:{kind:'ACTIVE_COMPLETE',checkpoint:{balance:'0',observedDate:'2026-10-31'},obligations:[],savings:[]},endBalance:'0',periods:[{period:'2026-10',allocated:'0',reserved:'2000',savings:'1000',free:'-3000',deficit:'3000'}]}}));mount(a);
  await userEvent.click(screen.getByRole('button',{name:catalogs.en.financialHistory.open}));await screen.findByText('-€30.00');expect(screen.queryByText(catalogs.en.financialHistory.unknown)).toBeNull();
});
it('HBH-007 source failures stay visible and never open as a saved state',()=>{
  const first:Page={...page(),items:[{...page().items[0],sourceStatus:'INVALID'}],sourceValidity:'INVALID'},a=actions();mount(a,'en',first);
  expect(screen.getByText(catalogs.en.financialHistory.status.INVALID)).toBeTruthy();expect((screen.getByRole('button',{name:catalogs.en.financialHistory.open})as HTMLButtonElement).disabled).toBe(true);expect(a.detail).not.toHaveBeenCalled();
});
it('HBH-006/007 rejected details disclose no fabricated state and error is announced',async()=>{
  const a=actions();a.detail=vi.fn(async()=>({ok:false as const,code:'HISTORY_SOURCE_INVALID' as const}));mount(a);await userEvent.click(screen.getByRole('button',{name:catalogs.en.financialHistory.open}));expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.queryByText(catalogs.en.financialHistory.noInference)).toBeNull();
});

it('HBH-006/007 a different requested page boundary cannot replace the current page',async()=>{
  const a=actions();a.page=vi.fn(async()=>({ok:true as const,value:{...page(),fromLastSeq:null,lastSeq:'25',nextLastSeq:null,items:[]}}));mount(a);
  await userEvent.click(screen.getByRole('button',{name:catalogs.en.financialHistory.next}));expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.getByRole('button',{name:catalogs.en.financialHistory.open})).toBeTruthy();
});
it('HBH-006/007 evidence for another offset is discarded without showing a financial state',async()=>{
  const a=actions();a.detail=vi.fn(async()=>({ok:true as const,value:{schemaVersion:1,offset:100,basis:page().basis,batchId:id,perspective:'ORIGINAL',precision:'DAY',dayH:'2026-10-31',knowledgeCut:'45'}}));mount(a);
  await userEvent.click(screen.getByRole('button',{name:catalogs.en.financialHistory.open}));expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.queryByText(catalogs.en.financialHistory.noInference)).toBeNull();
});
it('HBH-003/007 explicitly selected v1 reloads its own version and H/K instead of latest',async()=>{
  const a=actions(),first:Page={...page(),items:[{...page().items[0],kind:'MONTH_CLOSE'}]};a.open=vi.fn(async()=>({ok:true as const,value:first}));
  a.detail=vi.fn(async(raw:unknown)=>{const q=raw as Record<string,unknown>;return {ok:true as const,value:{schemaVersion:1,offset:0,basis:first.basis,batchId:id,perspective:q.perspective as string,precision:'REPORT',dayH:q.dayH as string,reportMeta:{id,version:1,dayH:'2026-10-31',knowledgeCut:'3',digest:'a'.repeat(64)},report:{period:'2026-10',endBalanceCents:null,historicalAllocatedCents:'60000',historicalReservedCents:'20000',historicalSavingsCents:'10000',historicalFreeCents:'30000',snapshot:{kind:'ACTIVE_COMPLETE',checkpoint:{balance:'80000',observedDate:'2026-10-20'},obligations:[],savings:[]}}}};});
  mount(a,'en',first);await userEvent.click(screen.getByRole('button',{name:catalogs.en.financialHistory.open}));await screen.findByText('Saved report version 1, through October 31, 2026');
  await userEvent.click(screen.getByRole('button',{name:catalogs.en.financialHistory.report}));
  await waitFor(()=>expect(a.detail).toHaveBeenCalledTimes(2));expect(a.detail).toHaveBeenLastCalledWith(expect.objectContaining({batchId:id,perspective:'REPORT',offset:0}));
});

it.each(['ru','de','en'] as const)('HBH-005/007 identity amounts, possible-claim reservation and status are localized %s',async locale=>{
  const a=actions(),t=catalogs[locale].financialHistory;
  a.detail=vi.fn(async()=>({ok:true as const,value:{schemaVersion:1,offset:0,basis:page().basis,batchId:id,perspective:'ORIGINAL',precision:'DAY',dayH:'2026-10-31',knowledgeCut:'45',snapshot:{kind:'ACTIVE_COMPLETE',checkpoint:{balance:'10000',observedDate:'2026-10-20'},obligations:[{identityId:id,revisionId:id,title:'Synthetic optional claim',original:'2000',outstanding:'2000',status:'UNPAID',isPossible:true,reserveFull:false,originPeriod:'2026-10',fundingPeriod:'2026-11',effectiveDate:'2026-10-20'}],savings:[]},endBalance:null,periods:[{period:'2026-10',allocated:'10000',reserved:'0',savings:'0',free:'10000',deficit:'0'}]}}));
  mount(a,locale);await userEvent.click(screen.getByRole('button',{name:t.open}));expect(await screen.findByText('Synthetic optional claim · '+t.identityStatus.UNPAID)).toBeTruthy();expect(screen.getByText(t.possible)).toBeTruthy();expect(screen.getByText(t.excludedReserve)).toBeTruthy();expect(screen.getByText(t.originalAmount+': '+new Intl.NumberFormat(locale,{style:'currency',currency:'EUR'}).format(20).replace(/\s/g,' '))).toBeTruthy();
});


it.each(['ru','de','en'] as const)('HBH-007 R1 Berlin recording instants retain UTC across midnight and DST %s',async locale=>{
  const examples=[
    ['2026-01-14T23:30:00.123456Z','2026-01-15','00:30:00','GMT+1'],
    ['2026-07-14T22:30:00.123456Z','2026-07-15','00:30:00','GMT+2'],
    ['2026-03-29T00:30:00.123456Z','2026-03-29','01:30:00','GMT+1'],
    ['2026-03-29T01:30:00.123456Z','2026-03-29','03:30:00','GMT+2'],
    ['2026-10-25T00:30:00.123456Z','2026-10-25','02:30:00','GMT+2'],
    ['2026-10-25T01:30:00.123456Z','2026-10-25','02:30:00','GMT+1'],
  ];
  for(const [stamp,localDay,clock,offset] of examples){
    const a=actions(),first:Page={...page(),items:[{...page().items[0],recordedAt:stamp}]};
    a.open=vi.fn(async()=>({ok:true as const,value:first}));
    a.detail=vi.fn(async(raw:unknown)=>{const q=raw as Record<string,unknown>;return {ok:true as const,value:{schemaVersion:1,offset:0,basis:first.basis,batchId:id,perspective:'ORIGINAL',precision:'DAY',dayH:q.dayH as string,knowledgeCut:'45',knowledgeRecordedAt:stamp}};});
    const mounted=mount(a,locale,first);await userEvent.click(screen.getByRole('button',{name:catalogs[locale].financialHistory.open}));
    await screen.findByText(catalogs[locale].financialHistory.noInference);
    const times=Array.from(mounted.container.querySelectorAll('time'));
    expect(times).toHaveLength(2);
    const date=new Intl.DateTimeFormat(locale,{timeZone:'UTC',dateStyle:'long'}).format(new Date(localDay+'T12:00:00Z'));
    for(const time of times){expect(time.getAttribute('datetime')).toBe(stamp);expect(time.textContent).toContain(date);expect(time.textContent).toContain(clock);expect(time.textContent).toContain(offset);}
    expect(first.items[0].recordedAt).toBe(stamp);
    mounted.unmount();
  }
});

it.each(['ru','de','en'] as const)('HBH-003/007 R1 report v1 v2 provenance and selected H K remain explicit %s',async locale=>{
  const a=actions(),t=catalogs[locale].financialHistory,second='00000000-0000-4000-8000-000000000002';
  const first:Page={...page(),items:[{...page().items[0],kind:'MONTH_CLOSE'},{...page().items[0],id:second,kind:'MONTH_CLOSE'}]};
  const versions=[{id,version:1,dayH:'2026-10-31',knowledgeCut:'3',reason:'Synthetic initial reason',previousVersionId:null,createdAt:'2026-11-08T23:30:00.123456Z'},
    {id:second,version:2,dayH:'2026-10-31',knowledgeCut:'7',reason:'Synthetic correction reason',previousVersionId:id,createdAt:'2026-11-09T00:30:00.654321Z'}];
  const retained=JSON.stringify(versions);
  a.open=vi.fn(async()=>({ok:true as const,value:first}));
  a.detail=vi.fn(async(raw:unknown)=>{const q=raw as Record<string,unknown>;return {ok:true as const,value:{schemaVersion:1,offset:0,basis:first.basis,batchId:q.batchId as string,perspective:'REPORT',precision:'REPORT',dayH:q.dayH as string,reportMeta:versions[q.batchId===id?0:1]}};});
  const mounted=mount(a,locale,first);
  for(const i of [0,1,0]){
    await userEvent.click(screen.getAllByRole('button',{name:t.open})[i]);
    expect(await screen.findByText(t.reportReason+': '+versions[i].reason)).toBeTruthy();
    const raw=JSON.parse(mounted.container.querySelector('section pre')!.textContent!);expect(raw.reportMeta.previousVersionId).toBe(versions[i].previousVersionId);expect(raw.reportMeta.knowledgeCut).toBe(versions[i].knowledgeCut);
    const date=new Intl.DateTimeFormat(locale,{timeZone:'Europe/Berlin',day:'numeric',month:'long',year:'numeric'}).format(new Date('2026-10-31T12:00:00Z'));
    expect(screen.getByText(t.reportHumanBasis.replace('{version}',String(i+1)).replace('{day}',date).replace('{cut}',versions[i].knowledgeCut))).toBeTruthy();
    expect(Array.from(mounted.container.querySelectorAll('time')).some(time=>time.getAttribute('datetime')===versions[i].createdAt)).toBe(true);
  }
  expect(JSON.stringify(versions)).toBe(retained);
});

it.each(['ru','de','en'] as const)('HB20-UX01 friendly %s timeline uses only verified summary; failed proof remains neutral and technical sources stay collapsed',async locale=>{
  const a=actions(),first=page(),t=catalogs[locale].financialHistory;
  a.summarize=vi.fn(async()=>({ok:true as const,value:{batchId:id,basis:first.basis,kind:'ACCEPT' as const,changes:[{action:'CREATE',title:'Internet',amount:'5000',period:'2026-11',status:'UNPAID',reserve:'5000'}]}}));
  const rendered=mount(a,locale,first);
  await waitFor(()=>expect(screen.getByRole('heading',{level:2}).textContent).toContain('Internet'));
  expect(screen.getByRole('heading',{level:2}).textContent).not.toContain('2026-11');
  expect(Array.from(rendered.container.querySelectorAll('details')).every(d=>!d.open)).toBe(true);
  expect(a.summarize).toHaveBeenCalledWith(expect.objectContaining({perspective:'SOURCE',offset:0,basis:first.basis}));
  rendered.unmount();a.summarize=vi.fn(async()=>({ok:false as const,code:'HISTORY_SOURCE_INVALID' as const}));mount(a,locale,first);
  await waitFor(()=>expect(a.summarize).toHaveBeenCalled());
  expect(screen.getByRole('heading',{level:2}).textContent).toBe(t.updateTitle);
});
