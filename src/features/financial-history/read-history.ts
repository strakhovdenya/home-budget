import type {CanonicalValue} from '@/domain/updates/contracts';
import type {Json} from '@/domain/closing/contracts';
import type {AuthorizedScope} from '@/domain/updates/contracts';
import type {HistoryIndexReader,HistoryResult,Page} from '@/domain/history/contracts';
import {month,parsePageQuery,requestCopy} from '@/domain/history/validation';
import {exactKeys} from '@/domain/checkpoints/validation';
import type {HistorySummary} from './presentation';
export type HistoryActions={
  summarize?(input:unknown):Promise<HistoryResult<HistorySummary>>;
  open(input:unknown):Promise<HistoryResult<Page>>;
  page(input:unknown):Promise<HistoryResult<Page>>;
  detail(input:unknown):Promise<HistoryResult<CanonicalValue>>;
};
export function createFinancialHistory(authorize:(selector:unknown)=>Promise<AuthorizedScope>,index:HistoryIndexReader,
  details:{read(scope:AuthorizedScope,input:unknown):Promise<HistoryResult<CanonicalValue|Json>>}){
  return {
    async open(selector:unknown,raw:unknown):Promise<HistoryResult<Page>>{
      let input:unknown;try{input=requestCopy(raw);if(!exactKeys(input,['schemaVersion','month'])||input.schemaVersion!==1||!month(input.month))return {ok:false,code:'INVALID_INPUT'};}catch{return {ok:false,code:'INVALID_INPUT'};}
      let scope:AuthorizedScope;try{scope=await authorize(selector);}catch{return {ok:false,code:'FORBIDDEN'};}
      return index.open(scope,(input as {month:string|null}).month);
    },
    async page(selector:unknown,raw:unknown):Promise<HistoryResult<Page>>{
      let q;try{q=parsePageQuery(raw);}catch{return {ok:false,code:'INVALID_INPUT'};}
      let scope:AuthorizedScope;try{scope=await authorize(selector);}catch{return {ok:false,code:'FORBIDDEN'};}
      return index.page(scope,q);
    },
    async detail(selector:unknown,raw:unknown):Promise<HistoryResult<CanonicalValue>>{
      let q;try{q=requestCopy(raw);}catch{return {ok:false,code:'INVALID_INPUT'};}
      let scope:AuthorizedScope;try{scope=await authorize(selector);}catch{return {ok:false,code:'FORBIDDEN'};}
      return details.read(scope,q);
    },
  };
}
