import {it,expect,vi} from 'vitest';
import {createOnboarding} from '@/features/onboarding/use-cases';
import {randomUUID} from 'node:crypto';
import type {OnboardingRepository} from '@/domain/onboarding/ports';
it('HB20-A03 HB20-A01 each operation authorizes; storage errors never become absence',async()=>{
  const repo:OnboardingRepository={preview:vi.fn(),confirm:vi.fn(),status:vi.fn(async()=>{throw Error('private storage detail');})};
  const denied=createOnboarding(async()=>{throw Error('expired');},repo);
  expect(await denied.preview({})).toEqual({ok:false,code:'UNAUTHORIZED'});
  expect(repo.preview).not.toHaveBeenCalled();
  const allowed=createOnboarding(async()=>({id:randomUUID()}),repo);
  expect(await allowed.status(randomUUID())).toEqual({ok:false,code:'STORAGE_ERROR'});
});
it('HB20-A03 rejects client owner/account/name/currency fields',async()=>{
  const repo:OnboardingRepository={preview:vi.fn(),confirm:vi.fn(),status:vi.fn()},service=createOnboarding(async()=>({id:randomUUID()}),repo);
  for(const field of ['owner','accountId','displayName','currency']){
    expect(await service.preview({requestId:randomUUID(),expectedRevision:'0',effectiveDate:'2026-11-12',reason:'Synthetic',payload:{},[field]:'forged'}))
      .toEqual({ok:false,code:'INVALID_INPUT'});
  }
  expect(repo.preview).not.toHaveBeenCalled();
});
