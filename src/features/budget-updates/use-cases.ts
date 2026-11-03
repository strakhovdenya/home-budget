import { prepareCommand, validUuid } from '@/domain/updates/validation';
import type { AuthorizedScope, UpdateErrorCode } from '@/domain/updates/contracts';
import type { BudgetUpdateRepository } from '@/domain/budget-update/ports';

/** Inputs are captured synchronously before auth yields; every operation authorizes independently. */
export function createBudgetUpdates(authorize:(selector:unknown)=>Promise<AuthorizedScope>,repository:BudgetUpdateRepository){
  async function run<T>(selector:unknown,operation:(scope:AuthorizedScope)=>Promise<T>){
    const captured=typeof selector==='string'?selector:null;
    let scope:AuthorizedScope;try{scope=await authorize(captured);}catch(e){return {ok:false as const,code:e instanceof Error&&e.message==='UNAUTHORIZED'?'UNAUTHORIZED' as const:'FORBIDDEN' as const};}
    try{return await operation(scope);}catch{return {ok:false as const,code:'STORAGE_ERROR' as const};}
  }
  const invalid={ok:false as const,code:'INVALID_INPUT' as UpdateErrorCode};
  return {
    load:(selector:unknown)=>run(selector,scope=>repository.load(scope)),
    preview(selector:unknown,input:unknown){const c=prepareCommand(input);return run(selector,scope=>c.ok?repository.preview(scope,c.value):Promise.resolve(c));},
    confirm(selector:unknown,input:unknown){const c=prepareCommand(input);return run(selector,scope=>c.ok?repository.confirm(scope,c.value):Promise.resolve(c));},
    status(selector:unknown,id:unknown){const captured=validUuid(id)?id.toLowerCase():null;return run(selector,scope=>captured?repository.status(scope,captured):Promise.resolve(invalid));},
    history(selector:unknown,id:unknown){const captured=id===null?null:validUuid(id)?id.toLowerCase():undefined;return run(selector,scope=>captured!==undefined?repository.history(scope,captured):Promise.resolve(invalid));},
  };
}
