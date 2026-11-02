import { expect,it } from 'vitest';
import { createPeriodTransitions } from '@/features/period-transitions/use-cases';
import type { ProposalRepository } from '@/domain/transitions/ports';
it('HB13 authorization precedes all proposal storage and replay',async()=>{
  let calls=0;const repo:ProposalRepository={prepare:async()=>{calls++;return {ok:false,code:'STORAGE_ERROR'};},confirm:async()=>{calls++;return {ok:false,code:'STORAGE_ERROR'};},read:async()=>{calls++;return {ok:false,code:'STORAGE_ERROR'};},cancel:async()=>{calls++;return {ok:false,code:'STORAGE_ERROR'};}};
  const api=createPeriodTransitions(async()=>{throw Error('UNAUTHORIZED');},repo);
  expect(await api.confirm('account',{})).toEqual({ok:false,code:'UNAUTHORIZED'});expect(await api.prepare('account',{})).toEqual({ok:false,code:'UNAUTHORIZED'});expect(await api.read('account','proposal')).toEqual({ok:false,code:'UNAUTHORIZED'});expect(await api.cancel('account',{})).toEqual({ok:false,code:'UNAUTHORIZED'});expect(calls).toBe(0);
});
it('HB13 proposal confirmation captures immutable caller data before async authorization',async()=>{
  const raw={requestId:'00000000-0000-4000-8000-000000000001',expectedRevision:'1',effectiveDate:'2026-11-02',reason:'Synthetic',payload:{amountCents:'100'}};
  let enter!:()=>void,release!:()=>void;const entered=new Promise<void>(r=>{enter=r;}),gate=new Promise<void>(r=>{release=r;});
  const repo:ProposalRepository={prepare:async()=>({ok:false,code:'STORAGE_ERROR'}),confirm:async(_,c)=>{expect(c.payload).toEqual({amountCents:'100'});expect(Object.isFrozen(c.payload)).toBe(true);return {ok:false,code:'INVALID_INPUT'};},read:async()=>({ok:false,code:'STORAGE_ERROR'}),cancel:async()=>({ok:false,code:'STORAGE_ERROR'})};
  const api=createPeriodTransitions(async()=>{enter();await gate;return {ownerUserId:'owner',accountId:'account'};},repo);const result=api.confirm('account',raw);await entered;raw.payload.amountCents='999';release();expect(await result).toEqual({ok:false,code:'INVALID_INPUT'});
});
it('HB13 storage initialization failures remain distinct from authorization errors',async()=>{
  const fail=async()=>{throw Error('Synthetic private storage initialization failure');};const repo:ProposalRepository={prepare:fail,confirm:fail,read:fail,cancel:fail};
  const api=createPeriodTransitions(async()=>({ownerUserId:'owner',accountId:'account'}),repo);
  expect(await api.read('account','id')).toEqual({ok:false,code:'STORAGE_ERROR'});expect(await api.cancel('account',{})).toEqual({ok:false,code:'STORAGE_ERROR'});
});
