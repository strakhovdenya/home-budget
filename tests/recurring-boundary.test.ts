import {it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createTemplates} from '@/features/recurring/use-cases';
import type {TemplateRepository} from '@/domain/recurring/ports';
it('HB20-T01 HB20-T02 every template operation reauthorizes; storage admission errors remain distinct from absence',async()=>{
  const repo:TemplateRepository={load:vi.fn(),commit:vi.fn(),status:vi.fn()},authorize=vi.fn(async()=>{throw Error('UNAUTHORIZED');}),service=createTemplates(authorize,repo);
  expect(await service.load('2026-11')).toEqual({ok:false,code:'UNAUTHORIZED'});
  expect(await service.commit({})).toEqual({ok:false,code:'UNAUTHORIZED'});
  expect(await service.status(randomUUID())).toEqual({ok:false,code:'UNAUTHORIZED'});expect(authorize).toHaveBeenCalledTimes(3);
  expect(repo.load).not.toHaveBeenCalled();expect(repo.commit).not.toHaveBeenCalled();expect(repo.status).not.toHaveBeenCalled();
  expect(await createTemplates(async()=>{throw Error('STORAGE_ERROR');},repo).load('2026-11')).toEqual({ok:false,code:'STORAGE_ERROR'});
});
it('HB20-T01 template command is copied/frozen before asynchronous authorization yields',async()=>{
  let allow!:(scope:{ownerUserId:string;accountId:string})=>void;
  const authorized=new Promise<{ownerUserId:string;accountId:string}>(r=>{allow=r;}),scope={ownerUserId:randomUUID(),accountId:randomUUID()};
  const receipt={updateId:randomUUID(),recordedSeq:'2',aggregateRevision:'2'},repo:TemplateRepository={load:vi.fn(),commit:vi.fn(async()=>({ok:true as const,value:receipt})),status:vi.fn()};
  const service=createTemplates(()=>authorized,repo),input={requestId:randomUUID(),expectedRevision:'1',effectiveDate:'2026-11-12',reason:'Synthetic original',
    payload:{schemaVersion:1,action:'CONFIG',templateId:randomUUID(),expectedVersion:null,title:'Original',amountCents:'5400',enabled:true}};
  const pending=service.commit(input);input.payload.amountCents='9999';allow(scope);await pending;
  const command=vi.mocked(repo.commit).mock.calls[0][1];expect(command.payload).toMatchObject({amountCents:'5400'});expect(Object.isFrozen(command.payload)).toBe(true);
});

it('HB20-T01 D57 mismatched/forged periods and root identity refuse before repository after reauthorization',async()=>{
  const scope={ownerUserId:randomUUID(),accountId:randomUUID()},authorize=vi.fn(async()=>scope);
  const repo:TemplateRepository={load:vi.fn(),commit:vi.fn(),status:vi.fn()},service=createTemplates(authorize,repo);
  const input={requestId:randomUUID(),expectedRevision:'2',effectiveDate:'2026-11-12',reason:'Synthetic D57',
    payload:{schemaVersion:1,action:'ACCEPT',templateId:randomUUID(),templateVersion:randomUUID(),originPeriod:'2026-11',fundingPeriod:'2026-12',amountCents:'5400',placement:null}};
  expect(await service.commit(input)).toEqual({ok:false,code:'INVALID_INPUT'});
  expect(await service.commit({...input,payload:{...input.payload,originPeriod:'2026-13',fundingPeriod:'2026-13'}})).toEqual({ok:false,code:'INVALID_INPUT'});
  expect((await service.commit({...input,ownerUserId:randomUUID()})).ok).toBe(false);
  expect(authorize).toHaveBeenCalledTimes(3);expect(repo.commit).not.toHaveBeenCalled();
});
