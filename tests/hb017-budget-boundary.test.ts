import {expect,it,vi} from 'vitest';
import {createBudgetUpdates} from '../src/features/budget-updates/use-cases';
import type {BudgetUpdateRepository} from '../src/domain/budget-update/ports';
import {emptyContext,draft} from './fixtures/budget-update';
import {id} from './fixtures/checkpoints';

function repository(){return {load:vi.fn(),preview:vi.fn(),confirm:vi.fn(),status:vi.fn(),history:vi.fn()} satisfies BudgetUpdateRepository;}
it('HB17-P08 every public aggregate operation independently fails closed before repository access',async()=>{
  const r=repository(),auth=vi.fn().mockRejectedValue(Error('UNAUTHORIZED')),app=createBudgetUpdates(auth,r),selector=id();
  const results=await Promise.all([app.load(selector),app.preview(selector,{}),app.confirm(selector,{}),app.status(selector,id()),app.history(selector,null)]);
  expect(results.every(x=>!x.ok&&x.code==='UNAUTHORIZED')).toBe(true);expect(auth).toHaveBeenCalledTimes(5);
  for(const call of Object.values(r))expect(call).not.toHaveBeenCalled();
});
it('HB17-P14 input mutation during asynchronous auth cannot change captured normalized command or selector',async()=>{
  let release!:()=>void;const gate=new Promise<void>(r=>{release=r;}),context=emptyContext(),repo=repository();repo.preview.mockResolvedValue({ok:true,value:null});
  const authorize=vi.fn(async()=>{await gate;return context.scope;}),app=createBudgetUpdates(authorize,repo),raw={requestId:id(),expectedRevision:'0',effectiveDate:'2026-11-03',reason:'Synthetic draft',payload:draft(context)};
  const pending=app.preview(context.scope.accountId,raw);raw.payload.checkpoint!.balanceCents='99999';raw.reason='Mutated';release();await pending;
  const command=repo.preview.mock.calls[0][1];expect(command.reason).toBe('Synthetic draft');expect(command.payload).toMatchObject({checkpoint:{balanceCents:'50000'}});expect(Object.isFrozen(command.payload)).toBe(true);
});
