import {prepareCommand,validUuid} from '@/domain/updates/validation';
import type {OnboardingRepository} from '@/domain/onboarding/ports';
/** Capture input before auth yields. Identity is never accepted from the browser. */
export function createOnboarding(authorize:()=>Promise<{id:string}>,repository:OnboardingRepository){
  async function owner(){try{const user=await authorize();return validUuid(user.id)?user.id:null;}catch{return null;}}
  return {
    async preview(input:unknown){const command=prepareCommand(input),id=await owner();if(!id)return {ok:false as const,code:'UNAUTHORIZED' as const};
      if(!command.ok)return command;try{return await repository.preview(id,command.value);}catch{return {ok:false as const,code:'STORAGE_ERROR' as const};}},
    async confirm(input:unknown){const command=prepareCommand(input),id=await owner();if(!id)return {ok:false as const,code:'UNAUTHORIZED' as const};
      if(!command.ok)return command;try{return await repository.confirm(id,command.value);}catch{return {ok:false as const,code:'COMMIT_OUTCOME_UNKNOWN' as const};}},
    async status(input:unknown){const key=validUuid(input)?input.toLowerCase():null,id=await owner();if(!id)return {ok:false as const,code:'UNAUTHORIZED' as const};
      if(!key)return {ok:false as const,code:'INVALID_INPUT' as const};try{return await repository.status(id,key);}catch{return {ok:false as const,code:'STORAGE_ERROR' as const};}},
  };
}
