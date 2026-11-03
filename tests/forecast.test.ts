import { expect, it } from 'vitest';
import { projectAccount, projectPeriod } from '@/domain/forecast/budget';
import { state, obligation, saving, value } from './fixtures/forecast';
import { day, id } from './fixtures/forecast';
import { MAX_CENTS, MIN_CENTS } from '@/domain/money/money';
import { encodeProjection, enforceWireSize } from '@/domain/forecast/serialization';
import { parseCentsString } from '@/domain/money/money-codec';
import type { CompleteSnapshot, AccountEstimate } from '@/domain/forecast/contracts';

function at(s: CompleteSnapshot, date: string, observed: string = s.checkpoint.observedDate): CompleteSnapshot {
  return { ...s, checkpoint: { ...s.checkpoint, observedDate: day(observed) }, allocationEffectiveDate: day(observed),
    provenance: { ...s.provenance, historicalThroughDate: day(date) } };
}
function estimate(s: CompleteSnapshot, date = '2026-11-28'): AccountEstimate {
  const r = value(projectAccount(at(s,date),date)); if (r.kind !== 'ACCOUNT_ESTIMATE') throw Error('estimate'); return r;
}
type NumericCase = readonly [string, CompleteSnapshot, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
const numeric: readonly NumericCase[] = [
  ['001 ordinary',state(3000n),3000n,0n,3000n,1000n,0n,1000n,0n],
  ['007 negative F',state(8000n,undefined,[obligation(9000n)],[saving(2000n)]),-3000n,11000n,-3000n,0n,0n,0n,0n],
  ['007 HBA-002',state(10000n,undefined,[obligation(20000n)]),-10000n,20000n,-10000n,0n,0n,0n,0n],
  ['008 HB3-027 fully earmarked',state(10000n,undefined,[obligation(8000n)],[saving(2000n)]),0n,10000n,0n,0n,0n,0n,0n],
  ['008 savings once',state(40000n,undefined,[obligation(30000n)],[saving(5000n)]),5000n,35000n,5000n,1666n,2n,1666n,2n],
  ['009 full reserve',state(40000n,undefined,[obligation(30000n)]),10000n,30000n,10000n,3333n,1n,3333n,1n],
  ['010 possible unselected',state(10000n,undefined,[{...obligation(20000n,'2026-12'),isPossible:true,reserveFull:false}]),10000n,0n,10000n,3333n,1n,3333n,1n],
  ['011 possible fully elected',state(10000n,undefined,[{...obligation(20000n,'2026-12'),isPossible:true}]),10000n,20000n,-10000n,3333n,1n,0n,0n],
  ['012 paid',state(40000n,undefined,[{...obligation(30000n),status:'PAID',outstanding:0n,reserveFull:false}]),40000n,0n,40000n,13333n,1n,13333n,1n],
  ['012 cancelled',state(40000n,undefined,[{...obligation(30000n),status:'CANCELLED',reserveFull:false}]),40000n,0n,40000n,13333n,1n,13333n,1n],
  ['014 released saving',state(40000n,undefined,[obligation(30000n)],[{...saving(5000n),status:'RELEASED',amount:0n}]),10000n,30000n,10000n,3333n,1n,3333n,1n],
  ['017 REDISTRIBUTE unchanged past funding',state(90000n,undefined,[obligation(30000n,'2026-10')]),90000n,30000n,60000n,30000n,0n,20000n,0n],
  ['020 other-period underfunding',state(20000n,{'2026-11':15000n,'2026-12':5000n},[obligation(10000n,'2026-12')]),15000n,10000n,10000n,5000n,0n,3333n,1n],
  ['021 two future shortages',state(30000n,{'2026-11':15000n,'2026-12':5000n,'2027-01':10000n},[obligation(20000n,'2026-12'),obligation(25000n,'2027-01',11)]),15000n,45000n,-15000n,5000n,0n,0n,0n],
  ['022 protection-only shortage',state(10000n,{'2026-11':2000n,'2026-12':8000n},[obligation(5000n)]),-3000n,13000n,-3000n,0n,0n,0n,0n],
  ['023 savings-only shortage',state(10000n,undefined,[],[saving(15000n,'2026-12')]),10000n,15000n,-5000n,3333n,1n,0n,0n],
  ['025 unequal warning shortages',state(10000n,{'2026-11':8000n,'2026-12':2000n},[obligation(9000n),obligation(3000n,'2026-12',11)],[saving(2000n)]),-3000n,14000n,-4000n,0n,0n,0n,0n],
  ['026 secondary positive safe zero',state(30000n,{'2026-11':10000n,'2026-12':10000n,'2027-01':10000n},
    [obligation(3000n),obligation(4000n,'2026-12',11),obligation(14000n,'2027-01',12)],
    [saving(2000n),saving(1000n,'2026-12',21),saving(1000n,'2027-01',22)]),5000n,30000n,0n,1666n,2n,0n,0n],
  ['052 F-006 full reservation',state(15000n,undefined,[obligation(20000n)]),-5000n,20000n,-5000n,0n,0n,0n,0n],
  ['053 F-008 retained',state(40000n,undefined,[obligation(20000n)],[saving(5000n)]),15000n,25000n,15000n,5000n,0n,5000n,0n],
  ['053 F-008 released 2000',state(40000n,undefined,[obligation(20000n)],[saving(3000n)]),17000n,23000n,17000n,5666n,2n,5666n,2n],
];
it.each(numeric)('HB14-%s exact complete state',(_,s,f,t,l,q,r,sq,sr)=>{
  const before=structuredClone(s), result=estimate(s), liquidity=result.currentLiquidity;
  expect(liquidity).toMatchObject({budgetFree:f,protectedTotal:t,liquidityFreeSigned:l,safeAvailable:l>0n?l:0n,safeDailyLimit:sq,safeRemainder:sr});
  expect(result.periods.find(p=>p.period==='2026-11')!.ordinary).toMatchObject({ordinaryGuideline:q,roundingRemainder:r});
  expect(s).toEqual(before); expect(Object.isFrozen(result.provenance.obligationSources)).toBe(true);
});

it('HB14-018 HBL-001 owner D36 oracle keeps future full reserve', () => {
  const input = state(10000n, { '2026-11': 10000n }, [obligation(20000n, '2026-12')]);
  const result = value(projectAccount(input, '2026-11-28'));
  expect(result.kind).toBe('ACCOUNT_ESTIMATE');
  if (result.kind !== 'ACCOUNT_ESTIMATE') throw Error('estimate');
  expect(result.currentLiquidity).toMatchObject({ protectedTotal: 20000n, liquidityFreeSigned: -10000n, safeAvailable: 0n,
    safeDailyLimit: 0n, obligationShortfall: 10000n, earmarkShortfall: 10000n, protectionShortfall: 10000n });
  expect(result.periods[0].ordinary).toMatchObject({ ordinaryGuideline: 3333n, roundingRemainder: 1n });
  expect(input.obligations[0].fundingPeriod).toBe('2026-12');
});
it('HB14-019 HBL-002 funded overlap uses max, never A+E', () => {
  const r = value(projectAccount(state(50000n, { '2026-11': 40000n, '2026-12': 10000n },
    [obligation(30000n), obligation(2000n, '2026-12', 11)], [saving(5000n), saving(1000n, '2026-12', 21)]), '2026-11-28'));
  expect(r.kind === 'ACCOUNT_ESTIMATE' && r.currentLiquidity).toMatchObject({ protectedTotal: 45000n, safeAvailable: 5000n, safeDailyLimit: 1666n, safeRemainder: 2n });
});
it('HB14-051 F-003 current isolation and future full month', () => {
  const s = state(123000n, { '2026-11': 3000n, '2026-12': 120000n }, [obligation(90000n, '2026-12')]);
  const r = value(projectPeriod(s, '2026-11-28', '2026-12'));
  expect(r.kind === 'PERIOD_ESTIMATE' && r.budget.ordinary).toMatchObject({ days: 31, ordinaryGuideline: 967n, roundingRemainder: 23n });
});

it.each([['002','2026-11-29',3000n,2,1500n,0n],['003','2026-11-30',3001n,1,3001n,0n],['027','2026-11-28',1n,3,0n,1n],['027','2026-11-30',1n,1,1n,0n]] as const)('HB14-%s inclusive days %s',(_,d,b,n,q,r)=>{
  expect(estimate(state(b),d).currentLiquidity).toMatchObject({days:n,safeDailyLimit:q,safeRemainder:r});
});
it.each([['2026-01-31','2026-02',28,35n,21n],['2028-01-31','2028-02',29,34n,15n]] as const)('HB14-004/005 February preview %s', (d,p,n,q,r)=>{
  const s=at(state(1001n,{[p]:1001n}),d,d), out=value(projectPeriod(s,d,p));
  expect(out.kind==='PERIOD_ESTIMATE' && out.budget.ordinary).toMatchObject({days:n,ordinaryGuideline:q,roundingRemainder:r});
});
it('HB14-006 future allocation never increases current guideline',()=>{
  const r=estimate(state(123000n,{'2026-11':3000n,'2026-12':120000n},[obligation(90000n,'2026-12')]));
  expect(r.currentLiquidity.safeDailyLimit).toBe(1000n);expect(r.totals.allocated).toBe(123000n);
});
it('HB14-013 partial settlement consumes no second bank debit',()=>{
  const s=state(30000n,undefined,[{...obligation(30000n),outstanding:20000n}],[saving(5000n)]);
  const r=estimate(s,'2026-11-29');expect(r.bank.balance).toBe(30000n);expect(r.currentLiquidity).toMatchObject({budgetFree:5000n,totalReserved:20000n,safeDailyLimit:2500n});
});
it('HB14-015/041 F-009 CARRY moves funding once, preserves origin and old bank date',()=>{
  const s=at(state(40000n,{'2026-12':40000n},[{...obligation(30000n,'2026-12'),revisionId:id(111),transitionDecisionId:id(90)}],
    [{...saving(5000n,'2026-12'),revisionId:id(121),transitionDecisionId:id(90)}]),'2026-12-01','2026-11-28');
  const r=estimate({...s,allocationEffectiveDate:day('2026-12-01')},'2026-12-01');
  expect(r.currentLiquidity).toMatchObject({safeAvailable:5000n,safeDailyLimit:161n,safeRemainder:9n});
  expect(r.freshness).toMatchObject({ageDays:3,showReminder:false});expect(r.bank.revisionId).toBe(id(2));
  expect(r.provenance.obligationSources[0]).toMatchObject({revisionId:id(111),originPeriod:'2026-10',fundingPeriod:'2026-12'});
});
it('HB14-016 FRESH_START keeps full earmarks, HB14-055 never recharges historical free deficit',()=>{
  for(const [r,s,free,q,rem] of [[9000n,2000n,-3000n,0n,0n],[5000n,0n,3000n,111n,3n]]){
    const input=at(state(8000n,{'2027-01':8000n},[obligation(r,'2027-01')],s?[saving(s,'2027-01')]:[]),'2027-01-05','2027-01-05');
    expect(estimate(input,'2027-01-05').currentLiquidity).toMatchObject({budgetFree:free,safeDailyLimit:q,safeRemainder:rem});
  }
});
it('HB14-024/025 equal shortage amounts preserve all codes; differing amounts never summed',()=>{
  const r=estimate(state(10000n,undefined,[obligation(20000n,'2026-12')])).currentLiquidity;
  expect(r.coverageGroups).toEqual([{amount:10000n,meanings:['OBLIGATIONS_UNDERFUNDED','EARMARKS_UNDERFUNDED','PROTECTION_UNDERFUNDED']}]);
  expect(r.warnings).toContain('BUDGET_EXCEEDS_SAFE');expect(r.budgetExplanation).toBe('BUDGET_EXCEEDS_SAFE');
  const other=estimate(numeric.find(x=>x[0].startsWith('025'))![1]).currentLiquidity;
  expect(other.coverageGroups.map(g=>g.amount)).toEqual([2000n,4000n]);expect(other.comparisonsAreNonAdditive).toBe(true);
});
it('HB14-028/029 NO_OBSERVATION and explicit incomplete are not zero',()=>{
  const s=state();
  const n=value(projectAccount({kind:'NO_OBSERVATION',accountId:s.accountId,provenance:s.provenance,knownObligations:[obligation(1000n)],knownSavings:[]},'2026-11-28'));
  expect(n).toMatchObject({kind:'UNAVAILABLE',reason:'NO_OBSERVATION'});expect(n).not.toHaveProperty('bank');expect(n).not.toHaveProperty('currentLiquidity');
  expect(value(projectAccount({kind:'INCOMPLETE_STATE',accountId:s.accountId,provenance:s.provenance,missing:['SAVINGS']},'2026-11-28'))).toMatchObject({reason:'INCOMPLETE_STATE'});
  expect(projectAccount({...s,obligations:undefined},'2026-11-28').ok).toBe(false);
});
it('HB14-030/031/046 negative-bank branch validates shape before target and never infers credit',()=>{
  const s=state(), n={kind:'NEGATIVE_BANK_OBSERVATION',accountId:s.accountId,provenance:s.provenance,checkpoint:{...s.checkpoint,balance:-100n}};
  expect(value(projectPeriod(n,'2026-11-28','2026-12'))).toMatchObject({reason:'OVERDRAFT_POLICY_REQUIRED',bank:{balance:-100n}});
  expect(projectAccount({...n,allocations:[]},'2026-11-28')).toEqual({ok:false,code:'INVALID_STATE_SHAPE'});
  expect(projectAccount({...n,checkpoint:{...s.checkpoint,balance:0n}},'2026-11-28')).toEqual({ok:false,code:'INVALID_OBSERVATION_KIND'});
  expect(projectAccount({...s,checkpoint:n.checkpoint},'2026-11-28')).toEqual({ok:false,code:'INVALID_OBSERVATION_KIND'});
});
it.each([
  ['032 duplicate allocation',{...state(),allocations:[...state().allocations,...state().allocations]},'DUPLICATE_ID_OR_PERIOD'],
  ['032 duplicate obligation',state(10000n,undefined,[obligation(1n),obligation(1n)]),'DUPLICATE_ID_OR_PERIOD'],
  ['032 duplicate saving',state(10000n,undefined,[],[saving(1n),saving(1n)]),'DUPLICATE_ID_OR_PERIOD'],
  ['033 anchor',{...state(),anchorCheckpointRevisionId:id(99)},'ANCHOR_MISMATCH'],
  ['034 sum',state(10000n,{'2026-11':9999n}),'SUM_MISMATCH'],
  ['035 negative A',state(10000n,{'2026-11':15000n,'2026-12':-5000n}),'NEGATIVE_CASH_ALLOCATION'],
  ['036 E overflow',state(1n,undefined,[obligation(MAX_CENTS)],[saving(1n)]),'MONEY_RANGE'],
  ['036 H overflow',state(1n,undefined,[obligation(MAX_CENTS,'2026-12'),obligation(1n,'2027-01',11)]),'MONEY_RANGE'],
  ['036 T overflow',state(1n,undefined,[obligation(MAX_CENTS),obligation(MAX_CENTS,'2026-12',11)]),'MONEY_RANGE'],
  ['036 raw MIN',state(1n,undefined,[obligation(MIN_CENTS)]),'INVALID_EARMARK'],
  ['048 future effective',state(10000n,undefined,[{...obligation(1n),effectiveDate:day('2026-11-29')}]),'STATE_AFTER_AS_OF'],
  ['048 malformed money',state('100' as unknown as bigint),'INVALID_STATE_SHAPE'],
  ['049 ordinary unreserved',state(10000n,undefined,[{...obligation(1n),reserveFull:false}]),'INVALID_EARMARK'],
  ['049 paid reserved',state(10000n,undefined,[{...obligation(1n),status:'PAID',outstanding:0n}]),'INVALID_EARMARK'],
  ['049 ACTIVE zero',state(10000n,undefined,[],[saving(0n)]),'INVALID_EARMARK'],
  ['049 RELEASED positive',state(10000n,undefined,[],[{...saving(1n),status:'RELEASED'}]),'INVALID_EARMARK'],
  ['049 scope',state(10000n,undefined,[{...obligation(1n),accountId:id(999)}]),'SCOPE_MISMATCH'],
] as const)('HB14-%s typed refusal',(_,input,code)=>expect(projectAccount(input,'2026-11-28')).toEqual({ok:false,code}));
it('HB14-037 ages 0/1/6/7/8 and HB14-042 equal actual check refreshes provenance',()=>{
  for(const [d,age,q,r] of [['2026-11-20',0,272n,8n],['2026-11-21',1,300n,0n],['2026-11-26',6,600n,0n],['2026-11-27',7,750n,0n],['2026-11-28',8,1000n,0n]] as const){
    const result=estimate(state(3000n),d);expect(result.freshness.ageDays).toBe(age);expect(result.freshness.showReminder).toBe(age>=7);
    expect(result.freshness.notices.includes('EARLIER_OBSERVATION')).toBe(age>0);expect(result.currentLiquidity).toMatchObject({safeDailyLimit:q,safeRemainder:r});
  }
  const fresh=estimate(at(state(3000n),'2026-11-28','2026-11-28'));expect(fresh.freshness).toMatchObject({ageDays:0,showReminder:false,notices:[]});
});
it.each([['038','2026-03-22',['2026-03-28','2026-03-29','2026-03-30'],'2026-03','2026-04',[1500n,2000n,3000n],[0n,0n,0n]],
  ['039','2026-10-18',['2026-10-24','2026-10-25','2026-10-26'],'2026-10','2026-11',[750n,857n,1000n],[0n,1n,0n]]] as const)('HB14-%s DST civil dates',(_,obs,dates,current,future,qs,rs)=>{
  dates.forEach((d,i)=>{
    const o={...obligation(4000n,future),effectiveDate:day(obs)}, s=at(state(10000n,{[current]:10000n},[o]),d,obs), result=estimate(s,d);
    expect(result.freshness).toMatchObject({ageDays:6+i,showReminder:i>=1});expect(result.currentLiquidity).toMatchObject({safeDailyLimit:qs[i],safeRemainder:rs[i]});
  });
});
it('HB14-040/054 HBL-028 month/year change preserves old cash and funding; no automatic carry',()=>{
  for(const [d,q,r,age] of [['2026-12-01',193n,17n,11],['2026-12-02',200n,0n,12]] as const){
    const out=estimate(state(10000n,{'2026-11':4000n,'2026-12':6000n},[obligation(2000n)]),d);
    expect(out.currentLiquidity).toMatchObject({budgetFree:6000n,protectedTotal:4000n,safeAvailable:6000n,safeDailyLimit:q,safeRemainder:r});
    expect(out.freshness).toMatchObject({ageDays:age,showReminder:true});expect(out.freshness.notices).toContain('MONTH_REVIEW_REQUIRED');
  }
  const year=estimate(at(state(9300n,{'2026-12':3000n,'2027-01':6300n}),'2027-01-01','2026-12-31'),'2027-01-01');
  expect(year.currentLiquidity).toMatchObject({safeAvailable:6300n,safeDailyLimit:203n,safeRemainder:7n});expect(year.freshness.ageDays).toBe(1);
});
it('HB14-044 repeated reads stable; HB14-046 historical and future targets; virtual zero',()=>{
  const s=state(),before=structuredClone(s);expect(projectAccount(s,'2026-11-28')).toEqual(projectAccount(s,'2026-11-28'));expect(s).toEqual(before);
  const past=value(projectPeriod(s,'2026-11-28','2026-10')),future=value(projectPeriod(s,'2026-11-28','2027-01'));
  expect(past.kind==='PERIOD_ESTIMATE' && past.budget.ordinary).toEqual({kind:'UNAVAILABLE',reason:'HISTORICAL_PERIOD'});
  expect(future.kind==='PERIOD_ESTIMATE' && future.liquidity).toEqual({kind:'LIQUIDITY_UNAVAILABLE',reason:'NOT_CURRENT_PERIOD'});
  expect(future.kind==='PERIOD_ESTIMATE' && future.budget.free).toBe(0n);
});
it('HB14-047 confirmed zero is numeric; HB14-048 malformed dates and future bank reject',()=>{
  const z=estimate(state(0n,{}));expect(z.currentLiquidity.safeAvailable).toBe(0n);expect(z.freshness.notices).toContain('CURRENT_UNFUNDED');
  expect(projectAccount(state(),'2026-02-29')).toEqual({ok:false,code:'INVALID_DATE'});
  expect(projectPeriod(state(),'2026-11-28','0000-11')).toEqual({ok:false,code:'INVALID_PERIOD'});
  expect(projectAccount({...state(),checkpoint:{...state().checkpoint,observedDate:day('2026-11-29')}},'2026-11-28')).toEqual({ok:false,code:'STATE_AFTER_AS_OF'});
});
it('HB14-050 HBL-012 explicit cancellation and release are independent of B',()=>{
  for(const [r,s,safe,q,rem] of [[4000n,2000n,4000n,1333n,1n],[0n,2000n,8000n,2666n,2n],[0n,1000n,9000n,3000n,0n]]){
    expect(estimate(state(10000n,undefined,r?[obligation(r,'2026-12')]:[],[saving(s,'2026-12')])).currentLiquidity).toMatchObject({safeAvailable:safe,safeDailyLimit:q,safeRemainder:rem});
  }
});
it('HB14-062 due dates do not change protection; expected receipts/details are not source fields',()=>{
  const original=state(10000n,undefined,[obligation(20000n,'2026-12')]);
  expect(estimate({...original,obligations:[{...original.obligations[0],dueDate:day('2027-01-15')}]}).currentLiquidity).toEqual(estimate(original).currentLiquidity);
  expect(projectAccount({...original,expectedIncome:50000n},'2026-11-28')).toEqual({ok:false,code:'INVALID_STATE_SHAPE'});
  expect(projectAccount({...original,paymentDetail:-1000n},'2026-11-28')).toEqual({ok:false,code:'INVALID_STATE_SHAPE'});
});
it('HB14-060/063 canonical wire strings, UTF8 limit, deep freeze and hostile descriptors',()=>{
  const wire=value(encodeProjection(estimate(state(MAX_CENTS))));expect(wire.kind==='ACCOUNT_ESTIMATE' && wire.bank.balance).toBe(MAX_CENTS.toString());
  expect(()=>JSON.stringify(wire)).not.toThrow();expect(Object.isFrozen(wire)).toBe(true);
  for(const bad of ['-0','01','1e2','1.0',' 1',1,MAX_CENTS+1n])expect(parseCentsString(bad).ok).toBe(false);
  expect(()=>enforceWireSize('€',3)).not.toThrow();expect(()=>enforceWireSize('€',2)).toThrow('PROJECTION_LIMIT_EXCEEDED');
  const hostile={...state()};Object.defineProperty(hostile,'obligations',{get(){throw Error('GETTER_MUST_NOT_RUN');},enumerable:true});
  expect(projectAccount(hostile,'2026-11-28')).toEqual({ok:false,code:'INVALID_STATE_SHAPE'});
});
it('HB14-058 exhaustive 27000 states verifies equivalent L, bounds, shortages and monotonicity',()=>{
  let count=0;
  for(let a=0;a<=4;a++)for(let b=0;b<=4;b++)for(let c=0;c<=4;c++)for(let e=0;e<=5;e++)for(let f=0;f<=5;f++)for(let g=0;g<=5;g++){
    const A=[a,b,c].map(BigInt),E=[e,f,g].map(BigInt),B=A[0]+A[1]+A[2];
    const os=E.flatMap((v,i)=>v?[obligation(v,['2026-11','2026-12','2027-01'][i],10+i)]:[]);
    const out=estimate(state(B,{'2026-11':A[0],'2026-12':A[1],'2027-01':A[2]},os)),l=out.currentLiquidity;
    const positive=(v:bigint)=>v>0n?v:0n,expected=A[0]-E[0]-positive(E[1]-A[1])-positive(E[2]-A[2]);
    if(l.liquidityFreeSigned!==expected || l.safeAvailable!==positive(expected) || l.safeAvailable>positive(l.budgetFree)
      || l.safeDailyLimit>l.budgetGuideline || l.safeDailyLimit*3n+l.safeRemainder!==l.safeAvailable
      || l.obligationShortfall>l.earmarkShortfall || l.earmarkShortfall>l.protectionShortfall
      || out.totals.freeSigned!==B-E[0]-E[1]-E[2])throw Error('HB14_PROPERTY');
    const nextT=E[0]+1n+(A[1]>E[1]?A[1]:E[1])+(A[2]>E[2]?A[2]:E[2]);
    if(positive(B-nextT)>l.safeAvailable)throw Error('MONOTONICITY');count++;
  }
  expect(count).toBe(27000);
},20000);
it('HB14-058 divisor sweep, R/S decompositions and source permutations',()=>{
  for(let n=1;n<=31;n++){
    const d=`2026-12-${String(32-n).padStart(2,'0')}`,s=at(state(10001n,{'2026-12':10001n}),d,'2026-11-20');
    const l=estimate(s,d).currentLiquidity;expect(l.safeDailyLimit*BigInt(n)+l.safeRemainder).toBe(10001n);
  }
  const x=state(50000n,{'2026-11':40000n,'2026-12':10000n},[obligation(1000n,'2026-12',11),obligation(2000n,'2026-12',10)],[saving(2000n)]);
  expect(estimate({...x,allocations:[...x.allocations].reverse(),obligations:[...x.obligations].reverse()})).toEqual(estimate(x));
  const y=state(50000n,{'2026-11':40000n,'2026-12':10000n},[obligation(1000n,'2026-12')],[saving(2000n),saving(2000n,'2026-12',21)]);
  expect(estimate(y).currentLiquidity.safeAvailable).toBe(estimate(x).currentLiquidity.safeAvailable);
});

const monotonicPairs = [
  ['HB15-M01', state(10000n, undefined, [obligation(1000n)]), state(10000n, undefined, [obligation(1001n)]), [9000n,3000n,0n], [8999n,2999n,2n]],
  ['HB15-M02', state(10000n, undefined, [], [saving(1000n)]), state(10000n, undefined, [], [saving(1001n)]), [9000n,3000n,0n], [8999n,2999n,2n]],
  ['HB15-M03', state(10000n, {'2026-11':5000n,'2026-12':5000n}, [obligation(4999n,'2026-12')]), state(10000n, {'2026-11':5000n,'2026-12':5000n}, [obligation(5000n,'2026-12')]), [5000n,1666n,2n], [5000n,1666n,2n]],
  ['HB15-M04', state(10000n, {'2026-11':5000n,'2026-12':5000n}, [obligation(5000n,'2026-12')]), state(10000n, {'2026-11':5000n,'2026-12':5000n}, [obligation(5001n,'2026-12')]), [5000n,1666n,2n], [4999n,1666n,1n]],
  ['HB15-M05', state(10000n, {'2026-11':5000n,'2026-12':5000n}, [obligation(4000n,'2026-12')], [saving(1000n,'2026-12')]), state(10000n, {'2026-11':5000n,'2026-12':5000n}, [obligation(4000n,'2026-12')], [saving(1001n,'2026-12')]), [5000n,1666n,2n], [4999n,1666n,1n]],
  ['HB15-M06', state(MAX_CENTS, undefined, [obligation(MAX_CENTS-1n)]), state(MAX_CENTS, undefined, [obligation(MAX_CENTS)]), [1n,0n,1n], [0n,0n,0n]],
] as const;
it.each(monotonicPairs)('%s paired production protection monotonicity', (_, before, after, expectedBefore, expectedAfter) => {
  const originals = structuredClone([before, after]);
  // Both calls use the public pure production projection, not a manual next-state formula.
  const first = value(projectAccount(before, '2026-11-28'));
  const second = value(projectAccount(after, '2026-11-28'));
  if (first.kind !== 'ACCOUNT_ESTIMATE' || second.kind !== 'ACCOUNT_ESTIMATE') throw Error('EXPECTED_COMPLETE');
  for (const [result, expected] of [[first, expectedBefore], [second, expectedAfter]] as const) {
    expect(result.currentLiquidity).toMatchObject({ days:3, safeAvailable:expected[0], safeDailyLimit:expected[1], safeRemainder:expected[2] });
    expect(result.bank.balance).toBe(before.checkpoint.balance);
    expect(result.bank.observedDate).toBe('2026-11-20');
  }
  expect(second.currentLiquidity.safeAvailable <= first.currentLiquidity.safeAvailable).toBe(true);
  expect(second.currentLiquidity.safeDailyLimit <= first.currentLiquidity.safeDailyLimit).toBe(true);
  expect(after.checkpoint).toEqual(before.checkpoint);
  expect(after.allocations).toEqual(before.allocations);
  const identities = (s: CompleteSnapshot) => [...s.obligations, ...s.savings].map(e => [e.identityId,e.revisionId,e.originPeriod,e.fundingPeriod,e.positionId,e.transitionDecisionId]);
  expect(identities(after)).toEqual(identities(before));
  expect([before, after]).toEqual(originals); // Pure calls cannot persist facts; also detect any in-memory mutation.
});
