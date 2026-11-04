import {expect,it} from 'vitest';
import {createTranslator} from 'next-intl';
import {catalogs} from '@/shared/i18n/catalogs';
import {closingReviewContent} from '@/features/month-closing/review-content';
const translator=createTranslator({locale:'en',messages:catalogs.en,namespace:'monthClosing'});
const t=(key:string,values?:Record<string,string|number>)=>translator(key as Parameters<typeof translator>[0],values);
it('HB19-E02 human review retains distinct source refs when money is unchanged',()=>{
  const old={historicalReservedCents:'30000',orderingRevisionRefs:['old-order'],sourceManifest:{evidence:[{id:'old-proof',document:{note:'Old supporting fact'}}]}};
  const next={...old,orderingRevisionRefs:['new-order'],sourceManifest:{evidence:[{id:'new-proof',document:{note:'New supporting fact'}}]}};
  const rows=closingReviewContent(old,next,'en',t),order=rows.find(r=>r.field.includes('Event ordering evidence'))!;
  expect(order.before).not.toBe(order.after);expect(order.before).toBe('Ordering evidence 1');expect(order.after).toBe('Ordering evidence 2');
  expect(rows.some(r=>r.before==='Old supporting fact'&&r.after==='New supporting fact')).toBe(true);
  expect(rows.some(r=>r.before==='Historical evidence 1'&&r.after==='Historical evidence 2')).toBe(true);
  expect(rows.every(r=>!r.field.includes('/')&&!r.after.includes('new-order'))).toBe(true);
});
it('HB19-E02 human changes format money dates null and microsecond evidence without losing precision',()=>{
  const rows=closingReviewContent({amountCents:'10000',effectiveDate:'2026-10-01',confirmedAt:'2026-10-02T12:00:00.000001Z',dueDate:'2026-10-15'},
    {amountCents:'12000',effectiveDate:'2026-10-02',confirmedAt:'2026-10-02T12:00:00.000002Z',dueDate:null},'en',t);
  expect(rows.find(r=>r.field==='Amount')).toMatchObject({before:'€100.00',after:'€120.00'});
  const time=rows.find(r=>r.field==='Confirmation time')!;expect(time.before).not.toBe(time.after);expect(time.after).toContain('000002');
  expect(rows.find(r=>r.field==='Due date')?.after).toBe('Not specified');expect(rows.every(r=>r.after!=='null')).toBe(true);
});
it('HB19-E02 human evidence pages preserve complete multibyte text in bounded fragments',()=>{
  const text='界😀'.repeat(500),rows=closingReviewContent({note:'Old note'},{note:text},'en',t);
  expect(rows.map(r=>r.after).join('')).toBe(text);expect(rows.every(r=>r.after.length<=256&&r.field.length<=256&&r.subject.length<=256)).toBe(true);
  expect(rows.some(r=>/[\uD800-\uDBFF]$/.test(r.after))).toBe(false);
});
it.each(['ru','de','en'] as const)('HB19-E02 %s review translations are intact Unicode and have all evidence labels',locale=>{
  const m=catalogs[locale].monthClosing;for(const key of ['evidenceReview','evidenceExplanation','reviewDocumentDigest','evidenceNext','initialReport','reviewChanges'] as const)expect(m[key]).not.toMatch(/\?|\uFFFD/);
  expect(JSON.stringify([m.reviewFields,m.reviewEnums,m.reviewReferences])).not.toMatch(/\?|\uFFFD/);
  if(locale==='ru')expect(m.evidenceReview).toContain('Исторические');if(locale==='de')expect(m.reviewChanges).toContain('Änderungen');
});
it('HB19-E02 logical evidence matching does not invent ordering changes when a corrected state changes UUID sort position',()=>{
  const order={id:'order-audit',document:{entity:{type:'DAY_ORDERING',id:'same-order'},after:{date:'2026-10-02',positionIds:['same-position']}}};
  const state=(id:string,audit:string)=>({id:audit,document:{entity:{type:'OBLIGATION_STATE',id},after:{state:{title:'Rent',outstandingCents:'30000'}}}});
  const snapshot=(rev:string)=>({obligations:[{identityId:'bill',revisionId:rev,title:'Rent',outstanding:'30000'}]});
  const rows=closingReviewContent({snapshot:snapshot('old-state'),sourceManifest:{evidence:[state('old-state','old-audit'),order]}},
    {snapshot:snapshot('new-state'),sourceManifest:{evidence:[order,state('new-state','new-audit')]}},'en',t);
  expect(rows.some(r=>r.subject.includes('Rent'))).toBe(true);expect(rows.some(r=>r.subject.includes('Daily event ordering'))).toBe(false);
  expect(rows.some(r=>r.before.includes('Ordering evidence')||r.after.includes('Ordering evidence'))).toBe(false);
  expect(rows.some(r=>r.before==='Obligation evidence 1'&&r.after==='Obligation evidence 2')).toBe(true);
});
it('HB19-E02 a new bank observation does not present unchanged known obligations as deleted and recreated',()=>{
  const bill={identityId:'bill',revisionId:'same-state',title:'Rent',outstanding:'30000'};
  const rows=closingReviewContent({snapshot:{kind:'NO_OBSERVATION',knownObligations:[bill],knownSavings:[]}},
    {snapshot:{kind:'ACTIVE_COMPLETE',obligations:[bill],savings:[]}},'en',t);
  expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({before:'No bank observations',after:'Complete confirmed state'});
});
it('HB19-E02 funding evidence names months only from the matching selected state',()=>{
  const doc={snapshot:{obligations:[{identityId:'bill',revisionId:'state',title:'Rent',originPeriod:'2026-10',fundingPeriod:'2026-10'}]},sourceManifest:{evidence:[{id:'audit',document:{entity:{type:'OBLIGATION_STATE',id:'state'},after:{state:{originatingPeriodId:'period-id',fundingPeriodId:'period-id'}}}}]}};
  const rows=closingReviewContent(null,doc,'en',t);
  expect(rows.filter(r=>r.field==='Funding period').map(r=>r.after).some(v=>v.includes('October 2026')&&v.includes('Period evidence'))).toBe(true);
  const unknown=closingReviewContent({fundingPeriodId:null},{fundingPeriodId:'unknown-id'},'en',t);
  expect(unknown[0].after).toBe('Period evidence 1');
});
it('HB19-E02 adding a historical before-state is described as added information, not as a missing document',()=>{
  const rows=closingReviewContent({before:null},{before:{title:'Rent',originalCents:'30000'}},'en',t);
  expect(rows[0]).toMatchObject({before:'Not specified',after:'Detailed information'});
  expect(rows.some(r=>r.after==='€300.00')).toBe(true);
});
it('HB19-E02 copied titles and notes preserve literal enum date and UUID text',()=>{
  for(const text of ['PAID','2026-10-31','00000000-0000-4000-8000-000000000001']){
    const rows=closingReviewContent({title:'Old title',note:'Old note'},{title:text,note:text},'en',t);
    expect(rows).toHaveLength(2);expect(rows.every(r=>r.after===text)).toBe(true);
  }
});
it('HB19-E02 event positions stay in their actual numeric order beyond the tenth entry',()=>{
  const rows=closingReviewContent({positionIds:Array.from({length:12},(_,i)=>'old-'+i)},{positionIds:Array.from({length:12},(_,i)=>'new-'+i)},'en',t);
  expect(rows.map(r=>Number(r.field.match(/Record (\d+)/)?.[1]))).toEqual(Array.from({length:12},(_,i)=>i+1));
});
it('HB19-E02 the same typed revision has the same readable name in snapshot and historical before-state',()=>{
  const source=(revisionId:string)=>({identityId:'bill',revisionId,title:'Rent'});
  const old={obligationRevisionIds:['old-state'],snapshot:{obligations:[source('old-state')]},sourceManifest:{evidence:[{id:'old-audit',document:{entity:{type:'OBLIGATION_STATE',id:'old-state'},before:null}}]}};
  const next={obligationRevisionIds:['new-state'],snapshot:{obligations:[source('new-state')]},sourceManifest:{evidence:[{id:'new-audit',document:{entity:{type:'OBLIGATION_STATE',id:'new-state'},before:{revisionId:'old-state'}}}]}};
  const rows=closingReviewContent(old,next,'en',t),prior=rows.find(r=>r.field==='Previous information — Evidence revision')!;
  expect(prior.after).toBe('Obligation evidence 1');expect(rows.filter(r=>r.before==='Obligation evidence 1'&&r.after==='Obligation evidence 2')).toHaveLength(3);
});
