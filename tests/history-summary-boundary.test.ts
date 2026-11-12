import {it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({account:vi.fn(),detail:vi.fn()}));
vi.mock('@/app/dashboard-account-boundary',()=>({resolveDashboardAccount:mocks.account}));
vi.mock('@/app/financial-history-boundary',()=>({financialHistory:{detail:mocks.detail}}));
import {summarizeHistory} from '@/app/history/actions';
const q=()=>({schemaVersion:1,basis:{schemaVersion:1,indexAnchor:'root',knowledgeCut:'3',month:null,today:'2026-11-12',capturedAt:'2026-11-12T12:00:00Z'},batchId:'original',dayH:'2026-11-12',perspective:'SOURCE',offset:0});
beforeEach(()=>vi.clearAllMocks());
it('HB20-UX01 summary action refuses missing owned scope and malformed authority fields without disclosing facts',async()=>{
 mocks.account.mockResolvedValue({kind:'NO_ACCOUNT'});
 expect(await summarizeHistory(q())).toEqual({ok:false,code:'FORBIDDEN'});expect(mocks.detail).not.toHaveBeenCalled();
 expect(await summarizeHistory({...q(),owner:'forged'})).toEqual({ok:false,code:'INVALID_INPUT'});
});
it('HB20-UX01 summary captures input before auth yield, forces original SOURCE and propagates corrupt/foreign proof refusal',async()=>{
 let release!:(x:unknown)=>void;mocks.account.mockResolvedValue({kind:'ACCOUNT',accountId:'owned'});mocks.account.mockImplementationOnce(()=>new Promise(r=>{release=r;}));mocks.detail.mockResolvedValue({ok:false,code:'HISTORY_SOURCE_INVALID'});
 const input=q(),pending=summarizeHistory(input);input.basis.knowledgeCut='99';release({kind:'ACCOUNT',accountId:'owned'});await pending;
 expect(mocks.detail).toHaveBeenCalledWith('owned',expect.objectContaining({basis:expect.objectContaining({knowledgeCut:'3'}),perspective:'SOURCE',offset:0}));
 expect(await summarizeHistory(q())).toEqual({ok:false,code:'HISTORY_SOURCE_INVALID'});
});
