import { createHash } from 'node:crypto';
import { expect,it,vi } from 'vitest';
import { createMonthClosing } from '@/features/month-closing/use-cases';
import { readCompleteDocument } from '@/features/month-closing/presentation';
import type { ClosingRepository,Json } from '@/domain/closing/contracts';
import { parseClosingInput } from '@/domain/closing/validation';
const scope={ownerUserId:'00000000-0000-4000-8000-000000000001',accountId:'00000000-0000-4000-8000-000000000002'};
function repository():ClosingRepository{return {load:vi.fn(),preview:vi.fn(),confirm:vi.fn(),status:vi.fn(),chunk:vi.fn(),review:vi.fn()};}
it.each(['load','chunk','preview','confirm','review','status'] as const)('HB19-B13 %s independently denies before repository disclosure',async method=>{
  const repo=repository(),use=createMonthClosing(async()=>{throw Error('UNAUTHORIZED');},repo);
  expect(await use[method](scope.accountId,{},0)).toEqual({ok:false,code:'UNAUTHORIZED'});
  expect(repo[method]).not.toHaveBeenCalled();
});
it('HB19-B14 Strict DTO and safe status failures',()=>{
  for(const extra of [{confirmed:false},{reviewDigest:'not-a-digest'},{knowledgeCut:'01'},{knowledgeCut:'9223372036854775808'},{previewProof:'fake'}]){
    expect(()=>parseClosingInput({schemaVersion:1,operation:'INITIAL',period:'2026-11',historicalThroughDate:'2026-11-30',knowledgeCut:'1',expectedHeadId:null,expectedHeadVersion:null,
      snapshotSchemaVersion:1,selectionContractVersion:1,reviewDigest:'a'.repeat(64),confirmed:true,...extra})).toThrow('REPORT_PROOF_INVALID');
  }
});
it('HB19-R01 normalizes the entire consent command before authorization yields',async()=>{
  let authorize!:()=>void;const wait=new Promise<void>(r=>authorize=r),repo=repository();
  vi.mocked(repo.preview).mockResolvedValue({ok:true,value:null});
  const use=createMonthClosing(async()=>{await wait;return scope;},repo),raw={requestId:'00000000-0000-4000-8000-000000000003',expectedRevision:'0',effectiveDate:'2026-11-04',reason:'Original reason',payload:{period:'2026-10'}};
  const call=use.preview(scope.accountId,raw);raw.reason='Changed';raw.payload.period='2026-11';authorize();await call;
  expect(vi.mocked(repo.preview).mock.calls[0][1]).toMatchObject({reason:'Original reason',payload:{period:'2026-10'}});
});
it.each([1048576,1048577,8388608])('HB19-R03 complete %i-byte report reassembly, multibyte boundaries and digest',async size=>{
  const start=Buffer.from('{"title":"'),end=Buffer.from('"}'),prefix=131071-start.length;
  const body=Buffer.concat([start,Buffer.from('x'.repeat(prefix)),Buffer.from('\u00e9'),Buffer.from('x'.repeat(size-start.length-end.length-prefix-2)),end]);
  expect(body.length).toBe(size);const digest=createHash('sha256').update(body).digest('hex');let calls=0;
  const r=await readCompleteDocument(async offset=>{calls++;const end=Math.min(offset+131072,body.length);return {ok:true,value:{offset,totalBytes:size,digest,nextOffset:end===size?null:end,base64:body.subarray(offset,end).toString('base64')}};},digest);
  expect((r as {title:string}).title[prefix]).toBe('\u00e9');expect(calls).toBe(Math.ceil(size/131072));
});
it.each(['offset','digest','length','gap','bytes'] as const)('HB19-R07 refuses %s tampering before complete document display',async variant=>{
  const body=Buffer.from('{"amount":"30000"}'),digest=createHash('sha256').update(body).digest('hex');
  const value:Record<string,Json>={offset:0,totalBytes:body.length,digest,nextOffset:null,base64:body.toString('base64')};
  if(variant==='offset')value.offset=1;if(variant==='digest')value.digest='f'.repeat(64);if(variant==='length')value.totalBytes=body.length+1;if(variant==='gap')value.nextOffset=131072;if(variant==='bytes')value.base64=Buffer.from('{"amount":"40000"}').toString('base64');
  await expect(readCompleteDocument(async()=>({ok:true,value}),digest)).rejects.toThrow('REPORT_PROOF_INVALID');
});

it.each(['terminal-next','noncanonical-base64','invalid-utf8','invalid-json'])('HB19-R07 rejects %s with a matching byte checksum',async variant=>{
  const body=variant==='invalid-utf8'?Buffer.from([0xff]):variant==='invalid-json'?Buffer.from('{'):Buffer.from('{"text":"'+('a'.repeat(131072-11))+'"}');
  const digest=createHash('sha256').update(body).digest('hex');const base64=variant==='noncanonical-base64'?' '+body.toString('base64'):body.toString('base64');
  await expect(readCompleteDocument(async()=>({ok:true,value:{offset:0,totalBytes:body.length,digest,nextOffset:variant==='terminal-next'?body.length:null,base64}}),digest)).rejects.toThrow();
});
