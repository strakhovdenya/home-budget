'use server';
import {requestCopy} from '@/domain/history/validation';
import {financialHistory} from '../financial-history-boundary';
import {resolveDashboardAccount} from '../dashboard-account-boundary';
async function read<T>(operation:(selector:unknown,input:unknown)=>Promise<T>,raw:unknown){
  let input:unknown;try{input=requestCopy(raw);}catch{return {ok:false as const,code:'INVALID_INPUT' as const};}
  const account=await resolveDashboardAccount();
  if(account.kind!=='ACCOUNT')return {ok:false as const,code:'FORBIDDEN' as const};
  return operation(account.accountId,input);
}
export async function openHistory(raw:unknown){return read(financialHistory.open,raw);}
export async function pageHistory(raw:unknown){return read(financialHistory.page,raw);}
export async function readHistoryDetail(raw:unknown){return read(financialHistory.detail,raw);}
