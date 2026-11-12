import {it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {parseTemplateInput,acceptedObligationPayload} from '@/domain/recurring/templates';
import {parseObligationBatch} from '@/domain/obligations/validation';
it('HB20-T01 exact ACCEPT adapter retains source version and full ordinary reserve; outer parser remains strict',()=>{
  const source={id:randomUUID(),version:randomUUID(),title:'Synthetic monthly bill',amountCents:'5400',enabled:true};
  const input={schemaVersion:1 as const,action:'ACCEPT' as const,templateId:source.id,templateVersion:source.version,originPeriod:'2026-11',fundingPeriod:'2026-11',amountCents:'5000',placement:null};
  expect(parseTemplateInput(input)).toEqual(input);expect(parseObligationBatch(input).ok).toBe(false);
  const inner=acceptedObligationPayload(input,source,'2026-11-12');
  expect(parseObligationBatch(inner)).toMatchObject({ok:true,value:[{action:'CREATE',data:{originalCents:5000n,reserveFull:true,isPossible:false,dueDate:null}}]});
  expect(()=>acceptedObligationPayload({...input,templateVersion:randomUUID()},source,'2026-11-12')).toThrow('STALE_TEMPLATE');
});
it('HB20-T02 DECLINE has no amount/funding/payment and CONFIG has no due-day or income trigger',()=>{
  const base={schemaVersion:1,action:'DECLINE',templateId:randomUUID(),templateVersion:randomUUID(),originPeriod:'2026-11'};
  expect(parseTemplateInput(base)).toEqual(base);
  for(const extra of [{fundingPeriod:'2026-11'},{amountCents:'0'},{payment:true},{owner:randomUUID()}])expect(()=>parseTemplateInput({...base,...extra})).toThrow();
  const config={schemaVersion:1,action:'CONFIG',templateId:randomUUID(),expectedVersion:null,title:'Synthetic',amountCents:'5400',enabled:true};
  for(const extra of [{dueDay:1},{incomeTrigger:true},{amountCents:'0'},{amountCents:'1.5'},{amountCents:'9223372036854775808'}])expect(()=>parseTemplateInput({...config,...extra})).toThrow();
});

it.each(['2024-02','2026-03','2026-10','2026-12','2027-01'])('HB20-T01 D57 initial context %s is equal origin/funding independently of confirmation day',period=>{
  const source={id:randomUUID(),version:randomUUID(),title:'Synthetic context',amountCents:'1',enabled:true};
  const input={schemaVersion:1 as const,action:'ACCEPT' as const,templateId:source.id,templateVersion:source.version,originPeriod:period,fundingPeriod:period,amountCents:'9223372036854775807',placement:null};
  expect(parseTemplateInput(input)).toEqual(input);
  expect(parseObligationBatch(acceptedObligationPayload(input,source,'2026-11-12'))).toMatchObject({ok:true,value:[{effectiveDate:'2026-11-12',data:{originatingPeriod:period,fundingPeriod:period,originalCents:9223372036854775807n}}]});
  for(const altered of [{fundingPeriod:'2026-11'},{originPeriod:'2026-11'},{originPeriod:'2026-13',fundingPeriod:'2026-13'},{amountCents:'9223372036854775808'}]){
    expect(()=>parseTemplateInput({...input,...altered})).toThrow('INVALID_INPUT');
    expect(()=>acceptedObligationPayload({...input,...altered},source,'2026-11-12')).toThrow('INVALID_INPUT');
  }
});
