'use server';
import {createTemplates} from '@/features/recurring/use-cases';
import {createTemplateRepository} from '@/infrastructure/db/template-repository';
import {databaseFromEnvironment} from '@/infrastructure/db/client';
import {requireOwnedAccount} from '@/infrastructure/auth/auth';
import type {TemplateRepository} from '@/domain/recurring/ports';
import {resolveDashboardAccount} from '../dashboard-account-boundary';
const repository:TemplateRepository={
  load:(...args)=>createTemplateRepository(databaseFromEnvironment()).load(...args),
  commit:(...args)=>createTemplateRepository(databaseFromEnvironment()).commit(...args),
  status:(...args)=>createTemplateRepository(databaseFromEnvironment()).status(...args),
};
const service=createTemplates(async()=>{
  const account=await resolveDashboardAccount();
  if(account.kind!=='ACCOUNT')throw Error(account.kind==='NO_ACCOUNT'?'FORBIDDEN':account.kind);
  return requireOwnedAccount(account.accountId);
},repository);
export async function loadTemplates(input:unknown){return service.load(input);}
export async function confirmTemplateCommand(input:unknown){return service.commit(input);}
export async function templateCommandStatus(input:unknown){return service.status(input);}
