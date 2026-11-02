import { expect, it } from 'vitest';
import { projectAccount, projectPeriod } from '@/domain/forecast/budget';
import { day, obligation, saving, state, value } from './fixtures/forecast';
import type { CompleteSnapshot } from '@/domain/forecast/contracts';
import { berlinDateOfInstant, parseInstant } from '@/shared/pure/instant';

function at(s:CompleteSnapshot,date:string,observed='2026-11-20'){
  return {...s,provenance:{...s.provenance,historicalThroughDate:day(date)},checkpoint:{...s.checkpoint,observedDate:day(observed)},allocationEffectiveDate:day(observed)};
}
it.each([
  ['HB3-C04',state(10000n,undefined,[obligation(6000n,'2026-12')]),'2026-11-28','2026-11',10000n,3333n,1n,4000n],
  ['HB3-C06/HBL-006',state(10000n,{'2026-10':5000n,'2026-11':5000n}),'2026-11-28','2026-11',5000n,1666n,2n,5000n],
  ['HBA-003',state(10000n,{'2026-11':5000n,'2026-12':5000n}),'2026-11-28','2026-12',5000n,161n,9n,5000n],
  ['HBA-005',state(60000n,{'2026-11':10000n,'2026-12':50000n}),'2026-11-29','2026-12',50000n,1612n,28n,10000n],
  ['HBA-006',state(28500n,{'2026-11':0n,'2026-12':28500n}),'2026-11-29','2026-12',28500n,919n,11n,0n],
  ['HB3-017/HBA-008/009',state(8000n,{'2027-01':8000n}),'2027-01-05','2027-01',8000n,296n,8n,8000n],
  ['HB3-030',state(128000n,{'2026-11':9500n,'2026-12':118500n}),'2026-11-30','2026-12',118500n,3822n,18n,9500n],
  ['HB3-034 day1',state(9300n,{'2026-11':3000n,'2026-12':6300n}),'2026-12-01','2026-12',6300n,203n,7n,6300n],
  ['HB3-034 day2',state(9300n,{'2026-11':3000n,'2026-12':6300n}),'2026-12-02','2026-12',6300n,210n,0n,6300n],
  ['HBA-007',state(10000n,{'2026-12':10000n},[obligation(20000n,'2026-12')]),'2026-12-01','2026-12',-10000n,0n,0n,0n],
  ['HBA-013',state(10000n,{'2026-12':10000n},[obligation(9000n,'2026-12')],[saving(2000n,'2026-12')]),'2026-12-01','2026-12',-1000n,0n,0n,0n],
  ['HBL-009',state(20000n,{'2026-11':15000n,'2026-12':5000n},[],[saving(2000n),saving(8000n,'2026-12',21)]),'2026-11-28','2026-11',13000n,4333n,1n,10000n],
  ['HB3-014',state(90000n,{'2026-11':40000n,'2026-12':50000n},[obligation(30000n)]),'2026-12-01','2026-12',50000n,1612n,28n,50000n],
  ['HB3-015',state(90000n,{'2026-12':90000n},[obligation(30000n,'2026-12')]),'2026-12-01','2026-12',60000n,1935n,15n,60000n],
  ['HB3-016',state(84000n,{'2026-12':84000n},[obligation(30000n,'2026-12')]),'2026-12-02','2026-12',54000n,1800n,0n,54000n],
  ['HBL-011 partial',state(49000n,{'2026-11':39000n,'2026-12':10000n},[{...obligation(3000n,'2026-12'),outstanding:2000n}]),'2026-11-28','2026-11',39000n,13000n,0n,39000n],
  ['HBL-011 paid',state(47000n,{'2026-11':37000n,'2026-12':10000n},[{...obligation(3000n,'2026-12'),status:'PAID',outstanding:0n,reserveFull:false}]),'2026-11-28','2026-11',37000n,12333n,1n,37000n],
  ['HBL-018 original',state(10000n,{'2026-10':5000n,'2026-11':5000n},[obligation(5500n,'2026-10')],[saving(500n,'2026-10')]),'2026-11-28','2026-11',5000n,1666n,2n,4000n],
  ['HBL-018 alternative carry',state(10000n,undefined,[obligation(5500n)],[saving(500n)]),'2026-11-28','2026-11',4000n,1333n,1n,4000n],
  ['HBL-018 alternative fresh',state(8000n,undefined,[obligation(5500n)],[saving(500n)]),'2026-11-28','2026-11',2000n,666n,2n,2000n],
] as const)('HB14-062 normative exact oracle %s',(_,s,d,p,f,q,r,safe)=>{
  const input=at(s,d),out=value(projectPeriod(input,d,p)),whole=value(projectAccount(input,d));
  expect(out.kind==='PERIOD_ESTIMATE'&&out.budget.free).toBe(f);
  expect(out.kind==='PERIOD_ESTIMATE'&&out.budget.ordinary).toMatchObject({ordinaryGuideline:q,roundingRemainder:r});
  expect(whole.kind==='ACCOUNT_ESTIMATE'&&whole.currentLiquidity.safeAvailable).toBe(safe);
});
it.each([['HBL-019','2026-11-28','2026-11-28',0,6000n,2000n,0n],['HBL-020','2026-11-26','2026-11-20',6,6000n,1200n,0n],
  ['HBL-021','2026-11-27','2026-11-20',7,6000n,1500n,0n],['HBL-022','2026-11-28','2026-11-20',8,6000n,2000n,0n],
  ['HBL-024','2026-11-28','2026-11-28',0,5000n,1666n,2n]] as const)('HB14-037/042 normative %s',(_,d,obs,age,safe,q,r)=>{
  const out=value(projectAccount(at(state(safe+4000n,undefined,[obligation(4000n,'2026-12')]),d,obs),d));
  expect(out.kind==='ACCOUNT_ESTIMATE'&&out.freshness).toMatchObject({ageDays:age,showReminder:age>=7});
  expect(out.kind==='ACCOUNT_ESTIMATE'&&out.currentLiquidity).toMatchObject({safeAvailable:safe,safeDailyLimit:q,safeRemainder:r});
});
it('HB14-057 Berlin microsecond instants and UTC month boundary are explicit calendar inputs',()=>{
  for(const instant of ['2026-10-25T02:30:00.000001+02:00','2026-10-25T02:30:00.000002+01:00'])
    expect(value(berlinDateOfInstant(value(parseInstant(instant))))).toBe('2026-10-25');
  expect(value(berlinDateOfInstant(value(parseInstant('2026-11-30T23:30:00.000001Z'))))).toBe('2026-12-01');
});
it.each([['2028-02-28','2028-01-31','2028-02',2,500n,1n,28],['2028-02-29','2028-01-31','2028-02',1,1001n,0n,29],
  ['2026-02-28','2026-01-31','2026-02',1,1001n,0n,28]] as const)('HB14-004 HB3-025/026 old-state February current %s',(d,obs,p,n,q,r,age)=>{
  const out=value(projectAccount(at(state(1001n,{[p]:1001n}),d,obs),d));
  expect(out.kind==='ACCOUNT_ESTIMATE'&&out.currentLiquidity).toMatchObject({days:n,safeDailyLimit:q,safeRemainder:r});
  expect(out.kind==='ACCOUNT_ESTIMATE'&&out.freshness).toMatchObject({ageDays:age,showReminder:true,notices:['EARLIER_OBSERVATION','REMINDER_DUE','MONTH_REVIEW_REQUIRED']});
});
it('HB14-040/054 HB3-029 DEFER actual check can leave current unfunded with age zero',()=>{
  const d='2026-12-02',out=value(projectAccount(at(state(3000n,{'2026-11':3000n}),d,d),d));
  expect(out.kind==='ACCOUNT_ESTIMATE'&&out.currentLiquidity).toMatchObject({days:30,budgetFree:0n,safeAvailable:0n,safeDailyLimit:0n});
  expect(out.kind==='ACCOUNT_ESTIMATE'&&out.freshness).toMatchObject({ageDays:0,showReminder:false,notices:['CURRENT_UNFUNDED']});
});
