import { normalizeValue } from '@/domain/updates/canonical-value';
import { prepareCommand } from '@/domain/updates/validation';
import type { AuthorizedScope } from '@/domain/updates/contracts';
import type { ProposalRepository } from '@/domain/transitions/ports';
export function createPeriodTransitions(authorize:(selector:unknown)=>Promise<AuthorizedScope>,repository:ProposalRepository){
  async function scope(selector:unknown){return authorize(typeof selector==='string'?selector:null);}
  const failure=(e:unknown)=>({ok:false as const,code:e instanceof Error&&e.message==='UNAUTHORIZED'?'UNAUTHORIZED' as const:'FORBIDDEN' as const});
  async function run<T>(selector:unknown,operation:(s:AuthorizedScope)=>Promise<T>){
    let s:AuthorizedScope;try{s=await scope(selector);}catch(e){return failure(e);}
    try{return await operation(s);}catch{return {ok:false as const,code:'STORAGE_ERROR' as const};}
  }
  return {
    async prepare(selector:unknown,raw:unknown){const command=prepareCommand(raw);return run(selector,async s=>command.ok?repository.prepare(s,command.value):command);},
    async confirm(selector:unknown,raw:unknown){const command=prepareCommand(raw);return run(selector,async s=>command.ok?repository.confirm(s,command.value):command);},
    async read(selector:unknown,id:unknown){const captured=typeof id==='string'?id:null;return run(selector,async s=>captured?repository.read(s,captured):{ok:false as const,code:'INVALID_INPUT' as const});},
    async cancel(selector:unknown,raw:unknown){let captured;try{captured=normalizeValue(raw);}catch{return {ok:false as const,code:'INVALID_INPUT' as const};}return run(selector,s=>repository.cancel(s,captured));},
  };
}
