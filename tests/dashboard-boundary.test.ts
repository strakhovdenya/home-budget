import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({requireOwner:vi.fn(),find:vi.fn(),read:vi.fn()}));
vi.mock('@/infrastructure/auth/auth',()=>({requireOwner:mocks.requireOwner}));
vi.mock('@/infrastructure/auth/repository',()=>({ownerRepository:{findAccountIdsForOwner:mocks.find}}));
vi.mock('@/app/budget-projection-boundary',()=>({readBudgetProjection:mocks.read}));
import { resolveDashboardAccount } from '@/app/dashboard-account-boundary';
import { loadDashboard } from '@/app/dashboard-loader';
import { id, state, value } from './fixtures/forecast';
import { projectAccount } from '@/domain/forecast/budget';
import { encodeProjection } from '@/domain/forecast/serialization';
beforeEach(()=>{vi.resetAllMocks();mocks.requireOwner.mockResolvedValue({id:id(2)});mocks.find.mockResolvedValue([id(1)]);mocks.read.mockResolvedValue({ok:true,value:value(encodeProjection(value(projectAccount(state(),'2026-11-28'))))});});
it('HB16-A01 rejects no session before account or projection access',async()=>{
  mocks.requireOwner.mockRejectedValue(Error('UNAUTHORIZED'));expect(await loadDashboard({})).toEqual({kind:'UNAUTHORIZED'});expect(mocks.find).not.toHaveBeenCalled();expect(mocks.read).not.toHaveBeenCalled();
});
it('HB16-A02/A04 distinguishes no account and ambiguous selection',async()=>{
  mocks.find.mockResolvedValue([]);expect(await resolveDashboardAccount()).toEqual({kind:'NO_ACCOUNT'});
  mocks.find.mockResolvedValue([id(1),id(3)]);expect(await loadDashboard({})).toEqual({kind:'ACCOUNT_SELECTION_REQUIRED'});expect(mocks.read).not.toHaveBeenCalled();
});
it('HB16-A03 uses only session owner and rejects client scope and clock before finance read',async()=>{
  expect((await loadDashboard({})).kind).toBe('READY');expect(mocks.find).toHaveBeenCalledWith(id(2));expect(mocks.read).toHaveBeenCalledExactlyOnceWith(id(1),{targetPeriod:null});
  mocks.read.mockClear();for(const q of [{ownerUserId:id(3)},{accountId:id(3)},{H:'2020-01-01'},{K:'1'}])expect(await loadDashboard(q)).toEqual({kind:'INVALID_PERIOD'});expect(mocks.read).not.toHaveBeenCalled();
});
it('HB16-A05 separates lookup failure from empty and never leaks private exceptions',async()=>{
  mocks.find.mockRejectedValue(Error('SQL private secret'));expect(await loadDashboard({})).toEqual({kind:'STORAGE_ERROR'});
});
it.each(['UNAUTHORIZED','FORBIDDEN','STORAGE_ERROR','PROJECTION_LIMIT_EXCEEDED','SUM_MISMATCH'] as const)('HB16-A06/C06 propagates safe failure %s without old success',async code=>{
  mocks.read.mockResolvedValue({ok:false,code});expect(await loadDashboard({period:'2026-12'})).toEqual({kind:code==='SUM_MISMATCH'?'CALCULATION_ERROR':code});
});
it('HB16-C06/D07 performs one coherent read, waits for its whole result and never caches across requests',async()=>{
  let release!:(v:unknown)=>void;
  mocks.read.mockImplementationOnce(()=>new Promise(r=>{release=r;}));
  const pending=loadDashboard({});await vi.waitFor(()=>expect(mocks.read).toHaveBeenCalledOnce());
  const p=value(encodeProjection(value(projectAccount(state(),'2026-11-28'))));
  release({ok:true,value:p});expect((await pending).kind).toBe('READY');
  mocks.read.mockResolvedValueOnce({ok:false,code:'STORAGE_ERROR'});
  expect(await loadDashboard({})).toEqual({kind:'STORAGE_ERROR'});expect(mocks.read).toHaveBeenCalledTimes(2);
});
