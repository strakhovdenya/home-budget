import {prepareCommand,validUuid} from '@/domain/updates/validation';
import {parsePeriod} from '@/domain/periods/period';
import {parseTemplateInput} from '@/domain/recurring/templates';
import type {AuthorizedScope} from '@/domain/updates/contracts';
import type {TemplateRepository} from '@/domain/recurring/ports';
export function createTemplates(authorize:()=>Promise<AuthorizedScope>,repository:TemplateRepository){
  async function scope(){
    try{return {ok:true as const,value:await authorize()};}
    catch(e){const message=e instanceof Error?e.message:'FORBIDDEN';return {ok:false as const,code:message==='UNAUTHORIZED'?'UNAUTHORIZED' as const:
      message==='STORAGE_ERROR'?'STORAGE_ERROR' as const:message==='ACCOUNT_SELECTION_REQUIRED'?'ACCOUNT_SELECTION_REQUIRED' as const:'FORBIDDEN' as const};}
  }
  return {
    async load(input:unknown){const period=parsePeriod(input),s=await scope();if(!s.ok)return s;if(!period.ok)return {ok:false as const,code:'INVALID_INPUT' as const};
      try{return await repository.load(s.value,period.value);}catch{return {ok:false as const,code:'STORAGE_ERROR' as const};}},
    async commit(input:unknown){const command=prepareCommand(input),s=await scope();if(!s.ok)return s;if(!command.ok)return command;
      try{parseTemplateInput(command.value.payload);}catch{return {ok:false as const,code:'INVALID_INPUT' as const};}
      try{return await repository.commit(s.value,command.value);}catch{return {ok:false as const,code:'COMMIT_OUTCOME_UNKNOWN' as const};}},
    async status(input:unknown){const key=validUuid(input)?input.toLowerCase():null,s=await scope();if(!s.ok)return s;if(!key)return {ok:false as const,code:'INVALID_INPUT' as const};
      try{return await repository.status(s.value,key);}catch{return {ok:false as const,code:'STORAGE_ERROR' as const};}},
  };
}
