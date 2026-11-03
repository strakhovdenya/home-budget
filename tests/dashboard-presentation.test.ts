import { describe, expect, it } from 'vitest';
import { formatMoney } from '@/features/dashboard/format-money';
import { dashboardPresentation, parseDashboardQuery, periodHref, formatCalendarDate } from '@/features/dashboard/presentation';
import { projectAccount, projectPeriod } from '@/domain/forecast/budget';
import { encodeProjection } from '@/domain/forecast/serialization';
import { state, obligation, saving, value, day } from './fixtures/forecast';

describe('HB-016 exact presentation', () => {
  it.each(['ru','de','en'] as const)('HB16-B07 formats exact signed cents in %s', locale => {
    const expected = locale === 'en' ? ['€0.00','€0.01','-€0.01','€1.01','€90,071,992,547,409.93','€92,233,720,368,547,758.07','-€92,233,720,368,547,758.08']
      : locale === 'de' ? ['0,00 €','0,01 €','-0,01 €','1,01 €','90.071.992.547.409,93 €','92.233.720.368.547.758,07 €','-92.233.720.368.547.758,08 €']
      : ['0,00 €','0,01 €','-0,01 €','1,01 €','90 071 992 547 409,93 €','92 233 720 368 547 758,07 €','-92 233 720 368 547 758,08 €'];
    ['0','1','-1','101','9007199254740993','9223372036854775807','-9223372036854775808'].forEach((c,i)=>expect(formatMoney(c,locale).replaceAll('\u00a0',' ')).toBe(expected[i]));
    for(const bad of ['1.1','01',' 1','9223372036854775808','x'.repeat(100)]) expect(()=>formatMoney(bad,locale)).toThrow();
  });
  it('HB16-B01/B02/B03 strips identity graphs and preserves safe versus ordinary and full reserves',()=>{
    const r=dashboardPresentation(value(encodeProjection(value(projectAccount(state(10000n,undefined,[obligation(20000n,'2026-12')]),'2026-11-28')))));
    expect(r.kind).toBe('READY');if(r.kind!=='READY')throw Error('ready');
    expect(r.safe).toMatchObject({safeDailyLimit:'0',safeAvailable:'0'});expect(r.budget.ordinary).toMatchObject({ordinaryGuideline:'3333'});
    expect(JSON.stringify(r)).not.toMatch(/accountId|identityId|revisionId|knowledgeCut|provenance/);
    const overlap=dashboardPresentation(value(encodeProjection(value(projectAccount(state(50000n,{'2026-11':40000n,'2026-12':10000n},[obligation(30000n),obligation(2000n,'2026-12',11)],[saving(5000n),saving(1000n,'2026-12',21)]),'2026-11-28')))));
    expect(overlap.kind==='READY'&&overlap.safe).toMatchObject({safeAvailable:'5000',safeDailyLimit:'1666'});
    const deficit=dashboardPresentation(value(encodeProjection(value(projectAccount(state(8000n,undefined,[obligation(9000n)],[saving(2000n)]),'2026-11-28')))));
    expect(deficit.kind==='READY'&&deficit.budget).toMatchObject({free:'-3000',deficit:'3000',reserved:'9000',savings:'2000'});
  });
  it('HB16-C01/C02 distinguishes future preview and past active allocation without liquidity',()=>{
    const s=state(123000n,{'2026-11':3000n,'2026-12':120000n},[obligation(90000n,'2026-12')]);
    const future=dashboardPresentation(value(encodeProjection(value(projectPeriod(s,'2026-11-28','2026-12')))));
    expect(future.kind==='READY'&&future.mode).toBe('FUTURE');expect(future.kind==='READY'&&future.safe).toBeNull();
    expect(future.kind==='READY'&&future.budget.ordinary).toMatchObject({ordinaryGuideline:'967',days:31,roundingRemainder:'23'});
    const past=dashboardPresentation(value(encodeProjection(value(projectPeriod(s,'2026-11-28','2026-10')))));
    expect(past.kind==='READY'&&past.mode).toBe('PAST');expect(past.kind==='READY'&&past.budget.ordinary.kind).toBe('UNAVAILABLE');
    const after=state(75000n,{'2026-12':75000n},[obligation(30000n,'2026-12')]);
    const historicalTarget=dashboardPresentation(value(encodeProjection(value(projectPeriod({...after,
      checkpoint:{...after.checkpoint,observedDate:day('2026-12-02')},allocationEffectiveDate:day('2026-12-02'),provenance:{...after.provenance,historicalThroughDate:day('2026-12-03')}},'2026-12-03','2026-11')))));
    expect(historicalTarget.kind==='READY'&&historicalTarget.budget).toMatchObject({allocated:'0',reserved:'0',savings:'0',free:'0',ordinary:{kind:'UNAVAILABLE'}});
    expect(historicalTarget.kind==='READY'&&historicalTarget.bank).toEqual({balance:'75000',observedDate:'2026-12-02'});
  });
  it('HB16-C05 rejects hostile/repeated query and formats early calendar years',()=>{
    for(const q of [{period:['2026-11','2026-12']},{period:''},{period:'0000-01'},{period:'2026-13'},{accountId:'foreign'},{K:'1'},{asOfDate:'2026-11-28'}])expect(parseDashboardQuery(q).ok).toBe(false);
    expect(parseDashboardQuery({})).toEqual({ok:true,value:null});expect(parseDashboardQuery({period:'0001-01'})).toEqual({ok:true,value:'0001-01'});
    expect(formatCalendarDate('0001-01-01','en')).toContain('1');expect(formatCalendarDate('0099-02-01','en')).not.toContain('1999');
    expect(periodHref('/months','2026-12')).toBe('/months?period=2026-12');expect(periodHref('/',null)).toBe('/');
  });
  it('HB16-C03 uses the server month at rollover without moving old cash or refreshing its observation',()=>{
    const s=state(10000n,{'2026-11':4000n,'2026-12':6000n},[obligation(2000n)]),before=structuredClone(s);
    const dec=dashboardPresentation(value(encodeProjection(value(projectAccount({...s,provenance:{...s.provenance,historicalThroughDate:day('2026-12-01')}},'2026-12-01')))));
    expect(dec.kind==='READY'&&dec.period).toBe('2026-12');expect(dec.kind==='READY'&&dec.safe).toMatchObject({safeAvailable:'6000',safeDailyLimit:'193'});
    expect(dec.kind==='READY'&&dec.freshness).toMatchObject({ageDays:11,showReminder:true});expect(dec.kind==='READY'&&dec.bank.observedDate).toBe('2026-11-20');
    const jan=dashboardPresentation(value(encodeProjection(value(projectAccount({...s,provenance:{...s.provenance,historicalThroughDate:day('2027-01-05')}},'2027-01-05')))));
    expect(jan.kind==='READY'&&jan.period).toBe('2027-01');expect(jan.kind==='READY'&&jan.budget.allocated).toBe('0');expect(s).toEqual(before);
  });
  it.each(['2026-02','2028-02'])('HB16-C05 retains the full future month divisor for %s',p=>{
    const s=state(1000n,{[p]:1000n});
    const early=p==='2026-02'?'2026-01-31':'2028-01-31';
    const input={...s,checkpoint:{...s.checkpoint,observedDate:early},allocationEffectiveDate:early,provenance:{...s.provenance,historicalThroughDate:early}};
    const r=dashboardPresentation(value(encodeProjection(value(projectPeriod(input,early,p)))));
    expect(r.kind==='READY'&&r.budget.ordinary).toMatchObject({days:p==='2026-02'?28:29,ordinaryGuideline:p==='2026-02'?'35':'34'});
  });
});
