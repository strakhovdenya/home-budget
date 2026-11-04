import { prepareCommand,validUuid } from '@/domain/updates/validation';
import { normalizeValue } from '@/domain/updates/canonical-value';
import { parseClosingQuery } from '@/domain/closing/validation';
import { ClosingFailure } from '@/domain/closing/serialization';
import type { ClosingRepository,ClosingResult } from '@/domain/closing/contracts';
import type { AuthorizedScope,UpdateErrorCode } from '@/domain/updates/contracts';

export function createMonthClosing(authorize:(selector:unknown)=>Promise<AuthorizedScope>,repository:ClosingRepository){
  function captured(input:unknown){try{return {ok:true as const,value:normalizeValue(input)};}catch{return {ok:false as const,code:'INVALID_INPUT' as const};}}
  async function run<T>(selector:unknown,operation:(scope:AuthorizedScope)=>Promise<ClosingResult<T>>):Promise<ClosingResult<T>>{
    const selected=typeof selector==='string'?selector:null;let scope:AuthorizedScope;
    try{scope=await authorize(selected);}catch(e){return {ok:false,code:e instanceof Error&&e.message==='UNAUTHORIZED'?'UNAUTHORIZED':'FORBIDDEN'};}
    try{return await operation(scope);}catch(e){return {ok:false,code:e instanceof ClosingFailure?e.code:'STORAGE_ERROR'};}
  }
  const invalid={ok:false as const,code:'INVALID_INPUT' as UpdateErrorCode};
  return {
    load(selector:unknown,input:unknown){const c=captured(input);return run(selector,scope=>c.ok?repository.load(scope,parseClosingQuery(c.value)):Promise.resolve(c));},
    chunk(selector:unknown,input:unknown){const c=captured(input);return run(selector,scope=>c.ok?repository.chunk(scope,parseClosingQuery(c.value)):Promise.resolve(c));},
    preview(selector:unknown,input:unknown){const c=prepareCommand(input);return run(selector,scope=>c.ok?repository.preview(scope,c.value):Promise.resolve(c));},
    confirm(selector:unknown,input:unknown){const c=prepareCommand(input);return run(selector,scope=>c.ok?repository.confirm(scope,c.value):Promise.resolve(c));},
    review(selector:unknown,input:unknown,offset:unknown){const c=prepareCommand(input),o=Number.isSafeInteger(offset)&&Number(offset)>=0?Number(offset):null;
      return run(selector,scope=>c.ok&&o!==null?repository.review(scope,c.value,o):Promise.resolve(invalid));},
    status(selector:unknown,input:unknown){const id=validUuid(input)?input.toLowerCase():null;return run(selector,scope=>id?repository.status(scope,id):Promise.resolve(invalid));},
  };
}
