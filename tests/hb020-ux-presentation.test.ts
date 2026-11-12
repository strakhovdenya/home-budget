import {it,expect} from 'vitest';
import {summarizeVerifiedSource} from '@/features/financial-history/presentation';
import {parseDashboardQuery} from '@/features/dashboard/presentation';
import {makeBudgetCommand,initialForm} from '@/features/budget-updates/presentation';
import type {CanonicalValue} from '@/domain/updates/contracts';
import type {UpdateSeed} from '@/features/budget-updates/presentation';
const basis={schemaVersion:1,indexAnchor:'original',knowledgeCut:'9',month:null,today:'2026-11-12',capturedAt:'2026-11-12T12:00:00Z'};
const wire=(x:unknown)=>x as CanonicalValue;
function source(action:string,balance:string,status:string,reserve:boolean){
 return {schemaVersion:1,basis,batchId:balance,perspective:'SOURCE',precision:'SOURCE',nextOffset:null,
  source:{sources:[{kind:'OBLIGATION_STATE',id:'event',action}]},periodReferences:[{id:'month',period:'2026-11'}],
  snapshot:{obligations:[{title:'Today renamed',status:'PAID'}]},
  evidence:[{beforeAfter:{entity:{type:'BANK_CHECKPOINT'},after:{balanceCents:balance,observedDate:'2026-11-12'}}},
   {beforeAfter:{entity:{type:'OBLIGATION_STATE',id:'event'},after:{state:{title:'Internet',fundingPeriodId:'month',originalCents:'5000',outstandingCents:reserve?'5000':'0',status,reserveFull:reserve},payment:action==='PAID'?{amountCents:'5000'}:null}}}]};
}
it('HB20-UX01 immutable source summaries preserve first B1000, unpaid Internet R50 and later B950/PAID R0 without todays state',()=>{
 const before=source('CREATE','100000','UNPAID',true),after=source('PAID','95000','PAID',false),copy=JSON.stringify([before,after]);
 const first=summarizeVerifiedSource(wire(before)),later=summarizeVerifiedSource(wire(after));
 expect(first.changes).toEqual([{action:'CHECK',amount:'100000',date:'2026-11-12'},{action:'CREATE',title:'Internet',amount:'5000',period:'2026-11',status:'UNPAID',reserve:'5000'}]);
 expect(later.changes).toEqual([{action:'CHECK',amount:'95000',date:'2026-11-12'},{action:'PAID',title:'Internet',amount:'5000',period:'2026-11',status:'PAID',reserve:'0'}]);
 expect(JSON.stringify(first)).not.toContain('Today renamed');expect(JSON.stringify([before,after])).toBe(copy);
});
it('HB20-UX01 incomplete pages remain neutral and a daily projection cannot masquerade as original SOURCE',()=>{
 expect(summarizeVerifiedSource(wire({...source('CREATE','100000','UNPAID',true),nextOffset:100})).changes).toEqual([]);
 expect(()=>summarizeVerifiedSource(wire({...source('CREATE','100000','UNPAID',true),precision:'DAY',perspective:'LATER'}))).toThrow();
 const initial=source('CREATE','100000','UNPAID',true);initial.evidence.push({beforeAfter:{entity:{type:'ACCOUNT_CREATED'},after:{}}} as never);
 expect(summarizeVerifiedSource(wire(initial)).kind).toBe('INITIAL');
});
it.each(['2026-13','2026-1',' 2026-12','10000-01',['2026-11','2026-12']])('HB20-UX03 strict bounded single-context query refuses %j',period=>{
 expect(parseDashboardQuery({period}).ok).toBe(false);
});
it('HB20-UX03 period is a calendar context only, never owner authority',()=>{
 expect(parseDashboardQuery({period:'2026-12'})).toEqual({ok:true,value:'2026-12'});
 expect(parseDashboardQuery({period:'2026-12',owner:'forged'}).ok).toBe(false);
});
it('HB20-UX04 missing explicit same-day consent is distinct from a server ordering/stale failure; no domain rule changes',()=>{
 const seed={today:'2026-11-12',revision:'1',knowledgeCut:'1',baseCheckpointId:null,baseVectorId:null,bank:null,allocations:[],obligations:[],savings:[],placement:{id:'order',afterPositionId:'position'}} as UpdateSeed;
 const form=initialForm(seed);form.balance='1000';form.allocations=[{key:'a',period:'2026-11',amount:'1000'}];form.vectorConfirmed=true;
 expect(()=>makeBudgetCommand(seed,form,'en','request')).toThrow('ORDER_ACKNOWLEDGEMENT_REQUIRED');
 expect(makeBudgetCommand(seed,{...form,orderAcknowledged:true},'en','request')).toMatchObject({payload:{checkpoint:{placement:{expectedOrderingRevisionId:'order',afterPositionId:'position',beforePositionId:null}}}});
});
