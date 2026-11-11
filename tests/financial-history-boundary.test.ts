import {expect,it} from 'vitest';
import {parsePageQuery,requestCopy,sequence,sameBasis} from '@/domain/history/validation';
const basis={schemaVersion:1 as const,indexAnchor:'00000000-0000-4000-8000-000000000001',knowledgeCut:'45',month:null,today:'2026-11-09',capturedAt:'2026-11-09T12:00:00.000000Z'};
const query=()=>({schemaVersion:1,basis,fromLastSeq:null,lastSeq:null});
it('HBH-006 exact keys, prototypes, accessors, schema and int64 sequence boundaries',()=>{
  expect(parsePageQuery(query())).toEqual(query());
  for(const v of [{...query(),accountId:basis.indexAnchor},{...query(),schemaVersion:2},{...query(),basis:{...basis,knowledgeCut:'045'}},{...query(),basis:{...basis,knowledgeCut:'9223372036854775808'}},{...query(),basis:{...basis,month:'2026-13'}},{...query(),basis:{...basis,today:'2026-11-08'}},{...query(),lastSeq:'46'},{...query(),lastSeq:'0'},{...query(),fromLastSeq:'20'},Object.assign(Object.create(null),query())])expect(()=>parsePageQuery(v)).toThrow();
  let called=false;expect(()=>requestCopy({get schemaVersion(){called=true;return 1;}})).toThrow();expect(called).toBe(false);
  expect(sequence('9223372036854775807')).toBe(true);for(const value of [-1n,45,Infinity,'-1','1.0','+1','1e3'])expect(sequence(value)).toBe(false);
});
it('HBH-006 input graph is copied and complete basis comparisons reject mixed cuts/filters/anchors/timestamps',()=>{
  const q=query(),captured=parsePageQuery(q);q.basis={...basis,knowledgeCut:'44'};expect(captured.basis.knowledgeCut).toBe('45');
  expect(sameBasis(basis,{...basis})).toBe(true);
  for(const other of [{...basis,knowledgeCut:'44'},{...basis,indexAnchor:'00000000-0000-4000-8000-000000000002'},{...basis,month:'2026-10'},{...basis,capturedAt:'2026-11-09T12:01:00.000000Z'}])expect(sameBasis(basis,other)).toBe(false);
});

it('HBH-006 each feature operation reauthorizes and captures input before an asynchronous authorization',async()=>{
  const {createFinancialHistory}=await import('@/features/financial-history/read-history');
  let release!:()=>void;const wait=new Promise<void>(resolve=>{release=resolve;});
  const authorize=async()=>{await wait;return {ownerUserId:basis.indexAnchor,accountId:basis.indexAnchor};};
  let seen:unknown;
  const feature=createFinancialHistory(authorize,{open:async()=>({ok:false,code:'STORAGE_ERROR'}),page:async(_scope,q)=>{seen=q;return {ok:false,code:'STORAGE_ERROR'};}},{read:async()=>({ok:false,code:'STORAGE_ERROR'})});
  const raw=query(),pending=feature.page('owned',raw);raw.basis={...basis,knowledgeCut:'44'};release();await pending;
  expect(seen).toMatchObject({basis:{knowledgeCut:'45'}});
  const denied=createFinancialHistory(async()=>{throw Error('UNAUTHORIZED');},{open:async()=>{throw Error('must not read');},page:async()=>{throw Error('must not read');}},{read:async()=>{throw Error('must not read');}});
  expect(await denied.open('foreign',{schemaVersion:1,month:null})).toEqual({ok:false,code:'FORBIDDEN'});
  expect(await denied.page('foreign',query())).toEqual({ok:false,code:'FORBIDDEN'});
  expect(await denied.detail('foreign',{})).toEqual({ok:false,code:'FORBIDDEN'});
});
