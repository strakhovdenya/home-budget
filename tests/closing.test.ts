import { expect, it } from 'vitest';
import { state, obligation, saving, day } from './fixtures/forecast';
import { makeClosing, calendarState } from '../src/domain/closing/projection';
import { canonicalDocument, operationBudget,chainBudget } from '../src/domain/closing/serialization';
import { parsePeriod,endOfMonth,shiftPeriod } from '../src/domain/periods/period';
import { transitionCalendar } from './fixtures/transition-calendar';
import { validateCents } from '../src/domain/money/money';
function historical(s:ReturnType<typeof state>){return {...s,provenance:{...s.provenance,historicalThroughDate:day('2026-11-30')}};}

it('HB19-A02 Older last observation and unknown end', () => {
  const s = state(80000n, { '2026-11':60000n,'2026-12':20000n }, [obligation(30000n)]);
  const d = makeClosing(historical(s), '2026-11');
  expect(d.endBalanceCents).toBe(null);
  expect(d.bankDataCompleteness).toBe('INCOMPLETE');
  expect(d.historicalFreeCents).toBe('30000');
  expect(d.lastBankObservedDate).toBe('2026-11-20');
});
it('HB19-A01 Final-day actual observation', () => {
  const s=state(76000n,{'2026-11':56000n,'2026-12':20000n},[obligation(30000n)]);
  expect(makeClosing(historical({...s,allocationEffectiveDate:day('2026-11-30'),checkpoint:{...s.checkpoint,observedDate:day('2026-11-30')}}),'2026-11').endBalanceCents).toBe('76000');
});
it('HB19-A12 Identity completeness and possible claims',()=>{
  const d=makeClosing(historical(state(10000n,{'2026-11':10000n},[obligation(9000n)],[saving(2000n)])),'2026-11');
  expect(d.historicalFreeCents).toBe('-1000');
});
it('HB19-D01 Automatic calendar availability is read-only',()=>{
  expect(calendarState('2026-12',day('2026-12-01'),false)).toBe('OPEN');
  expect(calendarState('2026-11',day('2026-12-01'),false)).toBe('AWAITING_CLOSE');
  expect(calendarState('2026-11',day('2026-12-01'),true)).toBe('CLOSED');
});
it('HB19-R04 Per-cut quadratic and total operation work',()=>{
  expect(()=>operationBudget([1500,1500],0)).toThrow('REPORT_LIMIT_EXCEEDED');
  expect(operationBudget([1000,1000],2000000)).toBe(4000000);
  expect(()=>operationBudget([1000,1000],2000001)).toThrow('REPORT_LIMIT_EXCEEDED');
});
it('HB19-A13 Bounded canonical report and history',()=>{
  expect(canonicalDocument({b:'é',a:1})).toBe('{"a":1,"b":"é"}');
  expect(()=>canonicalDocument(Object.defineProperty({},'a',{get(){throw Error('getter');},enumerable:true}))).toThrow('REPORT_PROOF_INVALID');
});
it('HB19-A04 no observation keeps known full earmarks and unknown allocated/free',()=>{
  const s=historical(state()),d=makeClosing({kind:'NO_OBSERVATION',accountId:s.accountId,provenance:s.provenance,knownObligations:[obligation(1000n)],knownSavings:[]},'2026-11');
  expect(d).toMatchObject({bankDataCompleteness:'NO_OBSERVATION',lastObservedBalanceCents:null,endBalanceCents:null,historicalAllocatedCents:null,historicalFreeCents:null,historicalReservedCents:'1000',historicalSavingsCents:'0'});
  const zero=makeClosing(historical(state(0n,{},[obligation(1000n)])),'2026-11');expect(zero).toMatchObject({lastObservedBalanceCents:'0',endBalanceCents:null,historicalAllocatedCents:'0',historicalFreeCents:'-1000'});
});
it('HB19-A12 elected and unelected possible identities retain full amounts',()=>{
  const base=obligation(4000n,'2026-11',12),ordinary=obligation(9000n);
  for(const reserveFull of [false,true]){
    const claim={...base,isPossible:true,reserveFull};const d=makeClosing(historical(state(10000n,{'2026-11':10000n},[ordinary,claim],[saving(2000n)])),'2026-11');
    expect(d.historicalReservedCents).toBe(reserveFull?'13000':'9000');expect(d.historicalFreeCents).toBe(reserveFull?'-5000':'-1000');
  }
});
it('HB19-D19 Nonnegative cash and exact cents',()=>{
  for(const [balance,allocations]of [[8000n,{'2026-11':9500n,'2026-12':-1500n}],[-1n,{'2026-11':-1n}],[8000n,{'2026-11':7999n}],[8000n,{'2026-11':8001n}]] as const){
    expect(()=>makeClosing(historical(state(balance,allocations)),'2026-11')).toThrow();
  }
  expect(validateCents(9223372036854775808n).ok).toBe(false);
  expect(makeClosing(historical(state(1n)),'2026-11').historicalFreeCents).toBe('1');
});
it.each([1048576,1048577,8388608])('HB19-R03 canonical report byte limit %i',bytes=>{
  const d={text:'a'.repeat(bytes-11)};expect(new TextEncoder().encode(canonicalDocument(d)).length).toBe(bytes);
});
it('HB19-R03 rejects 8MiB+1, without raising the existing normalizer bounds',()=>{
  expect(()=>canonicalDocument({text:'a'.repeat(8388609-11)})).toThrow('REPORT_LIMIT_EXCEEDED');
});
it('HB19-A13 depth, node, cycle, prototype and sparse-array thresholds refuse',()=>{
  let deep:unknown=null;for(let i=0;i<33;i++)deep={value:deep};expect(()=>canonicalDocument(deep)).toThrow('REPORT_LIMIT_EXCEEDED');
  expect(()=>canonicalDocument(Array(100001).fill(null))).toThrow('REPORT_LIMIT_EXCEEDED');
  const cycle:Record<string,unknown>={};cycle.self=cycle;expect(()=>canonicalDocument(cycle)).toThrow('REPORT_PROOF_INVALID');
  expect(()=>canonicalDocument(new Date())).toThrow('REPORT_PROOF_INVALID');expect(()=>canonicalDocument(new Array(2))).toThrow('REPORT_PROOF_INVALID');
});
it('HB19-R04 primitive work and aggregate thresholds',()=>{
  expect(operationBudget([2000],0)).toBe(4000000);expect(()=>operationBudget([2001],0)).toThrow();
  expect(()=>operationBudget([2000],1)).toThrow();expect(operationBudget([1000,1000],2000000)).toBe(4000000);
});
it.each(['2026-11-04','2026-11-01','2027-01-01','2028-03-01','2026-03-01'])('HB19-R06 server-relative fixture calendar for %s',date=>{
  const c=transitionCalendar(date);expect(c.pastEnd<c.today).toBe(true);expect(c.pastDay(28)<=c.pastEnd).toBe(true);expect(c.olderDay(20)<c.today).toBe(true);
  expect(shiftPeriod(c.past,1)).toEqual({ok:true,value:c.target});expect(endOfMonth(c.past)).toBe(c.pastEnd);
});
it('HB19-D18 leap and year boundaries use civil periods',()=>{
  const p=(x:string)=>{const r=parsePeriod(x);if(!r.ok)throw Error();return r.value;};
  expect(endOfMonth(p('2028-02'))).toBe('2028-02-29');expect(endOfMonth(p('2026-02'))).toBe('2026-02-28');
  expect(shiftPeriod(p('2026-12'),1)).toEqual({ok:true,value:'2027-01'});
});

it('HB19-A13 exact depth32 and nodes100000 remain admissible independently',()=>{
  let deep:unknown=null;for(let i=0;i<32;i++)deep={value:deep};expect(()=>canonicalDocument(deep)).not.toThrow();expect(()=>canonicalDocument(Array(99999).fill(null))).not.toThrow();
});

it('HB19-R05 primitive chain count and aggregate metadata thresholds remain independent',()=>{
  for(const links of [999,1000])expect(()=>chainBudget(links,1048576)).not.toThrow();expect(()=>chainBudget(1001,1)).toThrow('REPORT_LIMIT_EXCEEDED');expect(()=>chainBudget(999,1048577)).toThrow('REPORT_LIMIT_EXCEEDED');
});
