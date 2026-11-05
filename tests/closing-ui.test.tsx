// @vitest-environment jsdom
import { cleanup,render,screen,waitFor,within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createHash,webcrypto } from 'node:crypto';
import { afterEach,expect,it,vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { MonthClosingScreen } from '@/features/month-closing/month-closing-screen';
import { catalogs } from '@/shared/i18n/catalogs';
import type { MonthView,ClosingActions } from '@/features/month-closing/presentation';
import {ClosedMonthContext} from '@/features/month-closing/closed-month-context';
import type {DashboardView} from '@/features/dashboard/presentation';
afterEach(cleanup);
it('HB19-Q01 closed unchanged state is neutral and cannot invite a reason-only version',()=>{
  render(<NextIntlClientProvider locale="en" messages={catalogs.en}><MonthClosingScreen initial={{...view,correctionPending:false}} actions={actions}/></NextIntlClientProvider>);
  expect(screen.getByText('No new historical changes. Version 1 is saved.')).toBeTruthy();expect(screen.queryByRole('textbox')).toBeNull();expect(screen.queryByRole('button',{name:/^Review closing/})).toBeNull();
});
it('HB19-Q04 latest and explicitly selected versions remain visible outside the first metadata page without duplicate links',()=>{
  render(<NextIntlClientProvider locale="en" messages={catalogs.en}><MonthClosingScreen initial={{...view,headVersion:73,headId:'synthetic-latest',report:{...report,version:61},versions:[{id:'old',version:1}],nextVersionOffset:50}} actions={actions}/></NextIntlClientProvider>);
  const links=within(screen.getByLabelText(catalogs.en.monthClosing.versions)).getAllByRole('link');expect(links.map(a=>a.textContent?.match(/Version (\d+)/)?.[1])).toEqual(['73','61','1']);expect(links[0].textContent).toContain('latest accepted');expect(links[1].getAttribute('aria-current')).toBe('page');
});
it('HB19-Q04 active allocation is initially collapsed, dated and separate from accepted history',async()=>{
  const projection=(period:string,allocated:string)=>({kind:'READY',period,bank:{balance:'100000',observedDate:'2026-11-04'},budget:{allocated,reserved:'0',savings:'0',free:allocated}} as unknown as DashboardView);
  render(<NextIntlClientProvider locale="en" messages={catalogs.en}><ClosedMonthContext selected={projection('2026-10','0')} current={projection('2026-11','100000')}/></NextIntlClientProvider>);
  const details=document.querySelector('details')!;expect(details.open).toBe(false);expect(screen.getByText(catalogs.en.monthClosing.currentNotHistorical)).toBeTruthy();
  await userEvent.click(screen.getByText(catalogs.en.monthClosing.currentAllocation));expect(details.open).toBe(true);expect(screen.getAllByText(/November 4, 2026/).length).toBeGreaterThan(0);
});
const report={id:'00000000-0000-4000-8000-000000000001',version:1,historicalThroughDate:'2026-10-31',lastBankObservedDate:'2026-10-20',lastObservedBalanceCents:'80000',endBalanceCents:null,
  allocationEffectiveDate:'2026-10-20',historicalAllocatedCents:'60000',historicalReservedCents:'30000',historicalSavingsCents:'0',historicalFreeCents:'30000',bankDataCompleteness:'INCOMPLETE',operationDetailStatus:'NOT_PROVIDED'};
const view:MonthView={period:'2026-10',today:'2026-11-04',revision:'3',knowledgeCut:'3',state:'CLOSED',headId:report.id,headVersion:1,correctionPending:true,versions:[{version:1,id:report.id}],nextVersionOffset:null,report};
const actions:ClosingActions={load:vi.fn(),preview:vi.fn(),confirm:vi.fn(),status:vi.fn(),chunk:vi.fn(),review:vi.fn()};
it.each(['en','ru','de'] as const)('HB19-E01 %s distinguishes unknown end from last observed and dated allocation',locale=>{
  render(<NextIntlClientProvider locale={locale} messages={catalogs[locale]} timeZone="Europe/Berlin"><MonthClosingScreen initial={view} actions={actions}/></NextIntlClientProvider>);
  expect(screen.getByText(catalogs[locale].monthClosing.unknown)).toBeTruthy();
  expect(screen.getByText(catalogs[locale].monthClosing.completeness.INCOMPLETE)).toBeTruthy();
  expect(screen.getByLabelText(catalogs[locale].monthClosing.versions)).toBeTruthy();
  expect(screen.getByRole('textbox',{name:catalogs[locale].monthClosing.reason})).toBeTruthy();
  expect(screen.queryByRole('button',{name:catalogs[locale].monthClosing.confirm})).toBeNull();
  expect(actions.confirm).not.toHaveBeenCalled();
});
function setup(rows=1,title='Synthetic bill ',correction=false,locale:'ru'|'de'|'en'='en'){
  vi.stubGlobal('crypto',webcrypto);
  const draft=correction?view:{...view,headId:null,headVersion:null,state:'AWAITING_CLOSE',report:null,versions:[],correctionPending:false};
  const obligations=Array.from({length:rows},(_,i)=>({title:title+i,outstanding:String(i===rows-1?30000-500*(rows-1):500),originPeriod:'2026-10',effectiveDate:'2026-10-02',dueDate:'2026-10-25',original:'30000',fundingPeriod:'2026-10',status:'UNPAID',reserveFull:true}));
  const doc={snapshot:{allocations:[{period:'2026-10',amount:'60000'},{period:'2026-11',amount:'20000'}],obligations,savings:[]}},body=Buffer.from(JSON.stringify(doc)),digest=createHash('sha256').update(body).digest('hex');
  const command={requestId:'00000000-0000-4000-8000-000000000003',expectedRevision:'2',effectiveDate:'2026-11-04',reason:'Synthetic reviewed close',payload:{confirmed:true,expectedHeadVersion:correction?1:null}};
  const a:ClosingActions={...actions,preview:vi.fn().mockResolvedValue({ok:true,value:{command,before:correction?report:null,after:report,detailDigest:digest,detailBytes:body.length}}),
    chunk:vi.fn().mockResolvedValue({ok:true,value:{offset:0,nextOffset:null,totalBytes:body.length,digest,base64:body.toString('base64')}}),
    review:vi.fn().mockResolvedValue({ok:true,value:{offset:0,nextOffset:null,totalBytes:body.length,digest,base64:body.toString('base64')}}),
    load:vi.fn().mockResolvedValue({ok:true,value:view}),confirm:vi.fn().mockResolvedValue({ok:true,value:{updateId:report.id,recordedSeq:'3',aggregateRevision:'3'}}),status:vi.fn().mockResolvedValue({ok:true,value:null})};
  render(<NextIntlClientProvider locale={locale} messages={catalogs[locale]} timeZone="Europe/Berlin"><MonthClosingScreen initial={draft} actions={a}/></NextIntlClientProvider>);
  return {a,command,rows,doc,user:userEvent.setup()};
}
it.each(['ru','de','en'] as const)('HB19-C04/Q01/Q06 %s NO_REPORT_CHANGE preserves server pending and accepted version without confirmation or optimistic writes',async locale=>{
  const s=setup(0,'',true,locale),m=catalogs[locale].monthClosing;
  vi.mocked(s.a.preview).mockResolvedValue({ok:false,code:'NO_REPORT_CHANGE'});
  await s.user.type(screen.getByRole('textbox',{name:m.reason}),'Reason only');await s.user.click(screen.getByRole('button',{name:new RegExp('^'+m.preview)}));
  expect(await screen.findByText(m.noChangePending)).toBeTruthy();expect(screen.getByText(m.pending)).toBeTruthy();
  expect(screen.queryByText(m.noChangesVersion.replace('{n}','1'))).toBeNull();
  expect(screen.queryByText(m.pendingVersion.replace('{accepted}','1').replace('{next}','2'))).toBeNull();
  const versions=within(screen.getByLabelText(m.versions)).getAllByRole('link');expect(versions).toHaveLength(1);expect(versions[0].getAttribute('href')).toBe('/months?period=2026-10&version=1');
  expect(screen.queryByRole('checkbox')).toBeNull();expect(screen.queryByRole('button',{name:new RegExp('^'+m.confirm)})).toBeNull();
  expect(screen.getByRole('textbox',{name:m.reason})).toBeTruthy();expect(s.a.preview).toHaveBeenCalledTimes(1);
  for(const action of ['confirm','review','chunk','load','status'] as const)expect(s.a[action]).not.toHaveBeenCalled();
  expect(view.correctionPending).toBe(true);expect(view.headVersion).toBe(1);
  vi.mocked(s.a.load).mockResolvedValue({ok:true,value:{...view,correctionPending:false}});
  await s.user.click(screen.getByRole('button',{name:m.refresh}));
  expect(await screen.findByText(m.noChangesVersion.replace('{n}','1'))).toBeTruthy();expect(screen.queryByText(m.noChangePending)).toBeNull();expect(screen.queryByText(m.pending)).toBeNull();
  expect(s.a.confirm).not.toHaveBeenCalled();expect(s.a.load).toHaveBeenCalledTimes(1);
});
it('HB19-Q02 proposed correction leads with unknown to 900 EUR and unchanged reserves, not audit fields',async()=>{
  const s=setup(0,'',true),prior={...report,endBalanceCents:null,lastObservedBalanceCents:null,lastBankObservedDate:null,historicalAllocatedCents:null,historicalFreeCents:null,historicalReservedCents:'0'},next={...prior,version:2,endBalanceCents:'90000',historicalAllocatedCents:'90000',historicalFreeCents:'90000',lastBankObservedDate:'2026-10-31'};
  vi.mocked(s.a.preview).mockResolvedValue({ok:true,value:{command:s.command,before:prior,after:next,detailDigest:createHash('sha256').update(JSON.stringify(s.doc)).digest('hex'),detailBytes:Buffer.byteLength(JSON.stringify(s.doc))}});
  await s.user.type(screen.getByRole('textbox',{name:catalogs.en.monthClosing.reason}),'Actual historical check');await s.user.click(screen.getByRole('button',{name:/^Review closing/}));
  const summary=await screen.findByRole('region',{name:catalogs.en.monthClosing.financialChanges});expect(within(summary).getAllByText('Unknown → €900.00')).toHaveLength(3);expect(within(summary).getByText('Unchanged')).toBeTruthy();expect(within(summary).getByText(catalogs.en.monthClosing.noInferredFlows)).toBeTruthy();expect(summary.textContent).not.toMatch(/schemaVersion|90000|recordedSeq/);
});
it('HB19-Q06 dirty warnings name the unsaved draft and preserve saved versions; clean state does not intercept',async()=>{
  const s=setup();const ask=vi.spyOn(window,'confirm').mockReturnValue(false);await s.user.click(screen.getByRole('link',{name:catalogs.en.monthClosing.update}));expect(ask).not.toHaveBeenCalled();
  await s.user.type(screen.getByRole('textbox',{name:catalogs.en.monthClosing.reason}),'Unsaved reason');await s.user.click(screen.getByRole('link',{name:catalogs.en.monthClosing.update}));expect(ask).toHaveBeenCalledWith(catalogs.en.monthClosing.unsaved);ask.mockRestore();
});
async function reviewed(s:ReturnType<typeof setup>){await s.user.type(screen.getByRole('textbox',{name:catalogs.en.monthClosing.reason}),'Synthetic reviewed close');await s.user.click(screen.getByRole('button',{name:new RegExp('^'+catalogs.en.monthClosing.preview)}));await screen.findByRole('button',{name:new RegExp('^'+catalogs.en.monthClosing.confirm)});
  await screen.findByTestId('closing-review-content');const next=screen.queryByRole('button',{name:catalogs.en.monthClosing.evidenceNext});while(next&&!(next as HTMLButtonElement).disabled)await s.user.click(next);
  if(s.rows<=48)await waitFor(()=>expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(false));}
it('HB19-E02 explicit review consent precedes one confirm, cancellation restores focus',async()=>{
  const s=setup();await reviewed(s);const confirm=screen.getByRole('button',{name:new RegExp('^'+catalogs.en.monthClosing.confirm)}) as HTMLButtonElement;expect(confirm.disabled).toBe(true);expect(s.a.confirm).not.toHaveBeenCalled();
  await s.user.click(screen.getByRole('button',{name:catalogs.en.monthClosing.cancel}));expect(document.activeElement).toBe(screen.getByRole('button',{name:new RegExp('^'+catalogs.en.monthClosing.preview)}));expect(s.a.confirm).not.toHaveBeenCalled();
});
it('HB19-E04 unknown outcome only checks or explicitly retries the original request',async()=>{
  const s=setup();vi.mocked(s.a.confirm).mockResolvedValueOnce({ok:false,code:'COMMIT_OUTCOME_UNKNOWN'});await reviewed(s);
  await s.user.click(await screen.findByRole('checkbox'));await s.user.click(screen.getByRole('button',{name:new RegExp('^'+catalogs.en.monthClosing.confirm)}));
  await screen.findByRole('button',{name:catalogs.en.monthClosing.check});expect(s.a.confirm).toHaveBeenCalledTimes(1);
  await s.user.click(screen.getByRole('button',{name:catalogs.en.monthClosing.check}));expect(s.a.status).toHaveBeenCalledWith(s.command.requestId);expect(s.a.confirm).toHaveBeenCalledTimes(1);
  await s.user.click(screen.getByRole('button',{name:catalogs.en.monthClosing.retry}));await screen.findByText(/^Version 1 saved$/);
  expect(s.a.confirm).toHaveBeenCalledTimes(2);expect(vi.mocked(s.a.confirm).mock.calls[0][0]).toEqual(vi.mocked(s.a.confirm).mock.calls[1][0]);
});
it('HB19-E07 hidden detail pages cannot enable confirmation',async()=>{
  const s=setup(51);await reviewed(s);let consent=screen.getByRole('checkbox') as HTMLInputElement;expect(consent.disabled).toBe(true);
  await s.user.click(screen.getByRole('button',{name:catalogs.en.monthClosing.next}));
  consent=screen.getByRole('checkbox') as HTMLInputElement;expect(consent.disabled).toBe(false);
  await s.user.click(consent);expect((screen.getByRole('button',{name:new RegExp('^'+catalogs.en.monthClosing.confirm)}) as HTMLButtonElement).disabled).toBe(false);expect(s.a.confirm).not.toHaveBeenCalled();
});
it('HB19-E04 saved receipt remains success when refreshed read fails',async()=>{
  const s=setup();vi.mocked(s.a.load).mockResolvedValue({ok:false,code:'STORAGE_ERROR'});await reviewed(s);await s.user.click(screen.getByRole('checkbox'));await s.user.click(screen.getByRole('button',{name:new RegExp('^'+catalogs.en.monthClosing.confirm)}));
  expect(await screen.findByText(/^Version 1 saved$/)).toBeTruthy();expect(screen.getByText(catalogs.en.monthClosing.reloadNeeded)).toBeTruthy();expect(s.a.confirm).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button',{name:new RegExp('^'+catalogs.en.monthClosing.preview)})).toBeNull();
});

it('HB19-E05 copied malicious titles and reasons are inert React text',async()=>{
  const s=setup(1,'<img src=x onerror=alert(1)>');await reviewed(s);
  expect(screen.getByText(/<img src=x onerror=alert/)).toBeTruthy();expect(document.querySelector('img')).toBeNull();expect(document.querySelector('script')).toBeNull();expect(s.a.confirm).not.toHaveBeenCalled();
});
it('HB19-E06 unmount and a new scoped screen discard the closing draft and original request',async()=>{
  const s=setup();await reviewed(s);cleanup();const next=setup();expect((screen.getByRole('textbox',{name:catalogs.en.monthClosing.reason}) as HTMLInputElement).value).toBe('');expect(screen.queryByRole('button',{name:new RegExp('^'+catalogs.en.monthClosing.confirm)})).toBeNull();expect(next.a.confirm).not.toHaveBeenCalled();
});
it('HB19-E04 stale refusal preserves reason and requires explicit refreshed review',async()=>{
  const s=setup();vi.mocked(s.a.confirm).mockResolvedValue({ok:false,code:'STALE_REVISION'});await reviewed(s);await s.user.click(screen.getByRole('checkbox'));await s.user.click(screen.getByRole('button',{name:new RegExp('^'+catalogs.en.monthClosing.confirm)}));
  await screen.findByText(catalogs.en.monthClosing.error);expect(s.a.confirm).toHaveBeenCalledTimes(1);await s.user.click(screen.getByRole('button',{name:catalogs.en.monthClosing.refresh}));await screen.findByRole('button',{name:new RegExp('^'+catalogs.en.monthClosing.preview)});
  expect((screen.getByRole('textbox',{name:catalogs.en.monthClosing.reason}) as HTMLInputElement).value).toBe('Synthetic reviewed close');expect(screen.queryByRole('checkbox')).toBeNull();expect(s.a.confirm).toHaveBeenCalledTimes(1);
});

it('HB19-E02/E07 correction consent waits for every before and after detail page',async()=>{
  const s=setup(51,'Synthetic bill ',true);await reviewed(s);expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
  const next=screen.getAllByRole('button',{name:catalogs.en.monthClosing.next});expect(next).toHaveLength(2);await s.user.click(next[0]);expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);await s.user.click(next[1]);
  await waitFor(()=>expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(false));expect(s.a.confirm).not.toHaveBeenCalled();
});
it('HB19-E07 version pagination keeps selected immutable version and URLs contain only period/version',async()=>{
  const versions=Array.from({length:50},(_,i)=>({id:'synthetic-'+i,version:i+1})),a={...actions,load:vi.fn().mockResolvedValue({ok:true,value:{...view,versions:versions.map(x=>({...x,version:x.version+50})),nextVersionOffset:null}})};
  render(<NextIntlClientProvider locale="en" messages={catalogs.en} timeZone="Europe/Berlin"><MonthClosingScreen initial={{...view,versions,nextVersionOffset:50}} actions={a}/></NextIntlClientProvider>);
  await userEvent.click(screen.getByRole('button',{name:catalogs.en.monthClosing.moreVersions}));await screen.findByRole('link',{name:/^Version 100/ });
  expect(a.load).toHaveBeenCalledWith({period:view.period,version:null,offset:50,digest:null});
  const links=screen.getAllByRole('link').map(a=>a.getAttribute('href')).filter(h=>h?.startsWith('/months'));expect(links).toHaveLength(100);for(const href of links)expect(href).toMatch(/^\/months\?period=2026-10&version=[1-9][0-9]*$/);
  expect(document.querySelector('[aria-current="page"]')?.textContent).toContain('1');expect(a.confirm).not.toHaveBeenCalled();
});

it('HB19-E02/E07 equal money with changed historical refs requires every digest-bound evidence page',async()=>{
  const s=setup(1,'Synthetic bill ',true),old={...s.doc,sourceManifest:{checkpointId:'old-checkpoint',evidence:Array.from({length:45},(_,i)=>({id:'old-evidence-'+i,document:{note:'old proof '+i}}))},orderingRevisionRefs:['old-order']};
  const next={...s.doc,sourceManifest:{checkpointId:'new-checkpoint',evidence:Array.from({length:45},(_,i)=>({id:'new-evidence-'+i,document:{note:i===44?'END_OF_CHANGED_PROOF':'new proof '+i}}))},orderingRevisionRefs:['new-order']};
  const chunk=(doc:unknown)=>{const bytes=Buffer.from(JSON.stringify(doc));return {offset:0,nextOffset:null,totalBytes:bytes.length,digest:createHash('sha256').update(bytes).digest('hex'),base64:bytes.toString('base64')};},prior=chunk(old),after=chunk(next);
  vi.mocked(s.a.chunk).mockResolvedValue({ok:true,value:prior});vi.mocked(s.a.review).mockResolvedValue({ok:true,value:after});
  vi.mocked(s.a.preview).mockResolvedValue({ok:true,value:{command:s.command,before:{...report,digest:prior.digest},after:report,detailDigest:after.digest,detailBytes:after.totalBytes}});
  await s.user.type(screen.getByRole('textbox',{name:catalogs.en.monthClosing.reason}),'Synthetic reviewed close');await s.user.click(screen.getByRole('button',{name:new RegExp('^'+catalogs.en.monthClosing.preview)}));
  const evidenceNext=await screen.findByRole('button',{name:catalogs.en.monthClosing.evidenceNext}),primary=screen.getByTestId('closing-review-content');
  expect(screen.getByText(catalogs.en.monthClosing.reviewSameAmounts)).toBeTruthy();
  expect(within(primary).getByText(/Ordering evidence 1/)).toBeTruthy();expect(within(primary).getByText(/Ordering evidence 2/)).toBeTruthy();
  expect(primary.textContent).not.toContain('old-order');expect(primary.textContent).not.toContain('new-order');expect(primary.textContent).not.toContain(after.digest);
  expect(document.querySelector('details')?.open).toBe(false);expect(screen.queryByText(/END_OF_CHANGED_PROOF/)).toBeNull();
  expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);expect(s.a.confirm).not.toHaveBeenCalled();
  while(!(evidenceNext as HTMLButtonElement).disabled)await s.user.click(evidenceNext);
  expect(within(primary).getByText(/END_OF_CHANGED_PROOF/)).toBeTruthy();await waitFor(()=>expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(false));
  await s.user.click(screen.getByRole('checkbox'));await s.user.click(screen.getByRole('button',{name:new RegExp('^'+catalogs.en.monthClosing.confirm)}));expect(s.a.confirm).toHaveBeenCalledWith(s.command);
});

it.each(['ru','de','en'] as const)('HB19-E02 %s first October close without bank observations is a report summary without an absent-document diff',async locale=>{
  const s=setup(0,'',false,locale),m=catalogs[locale].monthClosing;
  const doc={schemaVersion:1,period:'2026-10',historicalThroughDate:'2026-10-31',endBalanceCents:null,lastObservedBalanceCents:null,historicalAllocatedCents:null,historicalReservedCents:'0',historicalSavingsCents:'0',historicalFreeCents:null,
    bankDataCompleteness:'NO_OBSERVATION',lastCheckpointId:null,historicalAllocationRevisionId:null,orderingRevisionRefs:[],obligationRevisionIds:[],savingsRevisionIds:[],
    snapshot:{kind:'NO_OBSERVATION',accountId:report.id,knownObligations:[],knownSavings:[],provenance:{selectionVersion:1,knowledgeCut:'0',capturedAggregateRevision:'0',historicalThroughDate:'2026-10-31',orderingRevisionIds:[]}},sourceManifest:{schemaVersion:1,checkpointId:null,allocationRevisionId:null,evidence:[]}};
  const body=Buffer.from(JSON.stringify(doc)),digest=createHash('sha256').update(body).digest('hex');
  vi.mocked(s.a.preview).mockResolvedValue({ok:true,value:{command:s.command,before:null,after:{...report,version:1,endBalanceCents:null,lastObservedBalanceCents:null,historicalAllocatedCents:null,historicalReservedCents:'0',historicalSavingsCents:'0',historicalFreeCents:null,lastBankObservedDate:null,allocationEffectiveDate:null,bankDataCompleteness:'NO_OBSERVATION'},detailDigest:digest,detailBytes:body.length}});
  vi.mocked(s.a.review).mockResolvedValue({ok:true,value:{offset:0,nextOffset:null,totalBytes:body.length,digest,base64:body.toString('base64')}});
  await s.user.type(screen.getByRole('textbox',{name:m.reason}),'Synthetic first close');await s.user.click(screen.getByRole('button',{name:new RegExp('^'+m.preview)}));
  expect(await screen.findByText(m.initialReport)).toBeTruthy();expect(screen.getByRole('heading',{name:m.reportToConfirm})).toBeTruthy();expect(screen.getByText(m.completeness.NO_OBSERVATION)).toBeTruthy();
  const primary=await screen.findByTestId('closing-review-content');expect(primary.textContent).not.toMatch(/\/snapshot|\[0\]|\bobject\b|\bnull\b|SHA-256|\?\?\?/);
  expect(primary.textContent).not.toContain(m.reviewNotRecorded);expect(screen.queryByRole('heading',{name:m.reviewChanges})).toBeNull();
  const consent=screen.getByRole('checkbox');await waitFor(()=>expect((consent as HTMLInputElement).disabled).toBe(false));
  expect((screen.getByRole('button',{name:new RegExp('^'+m.confirm)}) as HTMLButtonElement).disabled).toBe(true);expect(s.a.confirm).not.toHaveBeenCalled();
  await s.user.click(consent);await s.user.click(screen.getByRole('button',{name:new RegExp('^'+m.confirm)}));expect(s.a.confirm).toHaveBeenCalledWith(s.command);
});
