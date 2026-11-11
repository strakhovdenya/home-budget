import { capture } from '@/domain/forecast/validation';
import { exactKeys } from '@/domain/checkpoints/validation';
import { MAX_CENTS } from '@/domain/money/money';
import { validUuid } from '@/domain/updates/validation';
import { parsePeriod } from '@/domain/periods/period';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { parseInstant, berlinDateOfInstant } from '@/shared/pure/instant';
import type { Basis, PageQuery } from './contracts';

export function sequence(v:unknown):v is string {
  return typeof v==='string' && /^(0|[1-9][0-9]{0,18})$/.test(v) && BigInt(v)<=MAX_CENTS;
}
export function month(v:unknown):v is string|null {return v===null || typeof v==='string' && parsePeriod(v).ok;}
export function requestCopy(input:unknown):unknown {
  const copied=capture(input);
  if(new TextEncoder().encode(JSON.stringify(copied,(_,v)=>typeof v==='bigint'?'INVALID_BIGINT':v)).byteLength>16384)throw Error('INVALID_INPUT');
  return copied;
}
export function parseBasis(v:unknown):Basis {
  if(!exactKeys(v,['schemaVersion','indexAnchor','knowledgeCut','month','today','capturedAt']) || v.schemaVersion!==1
    || !sequence(v.knowledgeCut) || !month(v.month) || !parseBerlinDate(v.today).ok
    || (v.knowledgeCut==='0'?v.indexAnchor!==null:!validUuid(v.indexAnchor)))throw Error('INVALID_INPUT');
  const at=parseInstant(v.capturedAt);
  if(!at.ok||at.value!==v.capturedAt)throw Error('INVALID_INPUT');
  const day=berlinDateOfInstant(at.value);
  if(!day.ok||day.value!==v.today)throw Error('INVALID_INPUT');
  return v as Basis;
}
export function parsePageQuery(raw:unknown):PageQuery {
  const v=requestCopy(raw);
  if(!exactKeys(v,['schemaVersion','basis','fromLastSeq','lastSeq'])||v.schemaVersion!==1)throw Error('INVALID_INPUT');
  const basis=parseBasis(v.basis);
  for(const boundary of [v.fromLastSeq,v.lastSeq])if(boundary!==null&&(!sequence(boundary)||boundary==='0'||BigInt(boundary)>BigInt(basis.knowledgeCut)))throw Error('INVALID_INPUT');
  if(v.lastSeq===null&&v.fromLastSeq!==null || v.lastSeq!==null&&v.fromLastSeq!==null&&BigInt(v.lastSeq as string)>=BigInt(v.fromLastSeq as string))throw Error('INVALID_INPUT');
  return {...v,basis} as PageQuery;
}
export function sameBasis(a:Basis,b:Basis):boolean {
  return a.schemaVersion===b.schemaVersion&&a.indexAnchor===b.indexAnchor&&a.knowledgeCut===b.knowledgeCut&&a.month===b.month&&a.today===b.today&&a.capturedAt===b.capturedAt;
}
