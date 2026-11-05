import type { Json,ClosingResult } from '@/domain/closing/contracts';
import type { CommitReceipt } from '@/domain/updates/contracts';
export type ReportSummary=Readonly<{id?:string;version?:number;historicalThroughDate:string;lastBankObservedDate:string|null;lastObservedBalanceCents:string|null;
  endBalanceCents:string|null;allocationEffectiveDate:string|null;historicalAllocatedCents:string|null;historicalReservedCents:string;historicalSavingsCents:string;
  historicalFreeCents:string|null;bankDataCompleteness:string;operationDetailStatus:string;digest?:string;reason?:string}>;
export type MonthView=Readonly<{period:string;today:string;revision:string;knowledgeCut:string;state:string;headId:string|null;headVersion:number|null;correctionPending:boolean;
  versions:readonly {version:number;id:string}[];nextVersionOffset:number|null;report:ReportSummary|null}>;
export type CloseReview=Readonly<{command:{requestId:string;expectedRevision:string;effectiveDate:string;reason:string;payload:Json};before:ReportSummary|null;after:ReportSummary;detailDigest:string;detailBytes:number}>;
export type Chunk=Readonly<{digest:string;totalBytes:number;offset:number;nextOffset:number|null;base64:string}>;
export type ClosingActions=Readonly<{load(input:unknown):Promise<ClosingResult<Json>>;preview(input:unknown):Promise<ClosingResult<Json>>;confirm(input:unknown):Promise<ClosingResult<CommitReceipt>>;
  status(input:unknown):Promise<ClosingResult<CommitReceipt|null>>;chunk(input:unknown):Promise<ClosingResult<Json>>;review(input:unknown,offset:number):Promise<ClosingResult<Json>>}>;
/** Reject incomplete/gapped/mixed-version chunk streams; validate bytes before JSON parsing. */
export async function readCompleteDocument(read:(offset:number)=>Promise<ClosingResult<Json>>,expectedDigest:string|null):Promise<Json>{
  const chunks:Uint8Array[]=[];let offset=0,total:number|null=null,digest=expectedDigest;
  for(let n=0;n<64;n++){
    const r=await read(offset);if(!r.ok)throw Error(r.code);const c=r.value as unknown as Chunk;
    if(c.offset!==offset||!Number.isSafeInteger(c.totalBytes)||c.totalBytes<1||c.totalBytes>8388608||!(/^[a-f0-9]{64}$/).test(c.digest)
      ||(total!==null&&c.totalBytes!==total)||(digest!==null&&digest!==c.digest)||typeof c.base64!=='string'||c.base64.length>174764
      ||c.base64.length%4!==0||!(/^[A-Za-z0-9+/]*={0,2}$/).test(c.base64))throw Error('REPORT_PROOF_INVALID');
    total=c.totalBytes;digest=c.digest;const binary=atob(c.base64),bytes=Uint8Array.from(binary,x=>x.charCodeAt(0));
    if(btoa(binary)!==c.base64||bytes.length<1||bytes.length>131072||offset+bytes.length>total)throw Error('REPORT_PROOF_INVALID');
    chunks.push(bytes);offset+=bytes.length;
    if(c.nextOffset===null){if(offset!==total)throw Error('REPORT_PROOF_INVALID');break;}
    if(c.nextOffset!==offset||offset>=total||offset%131072!==0)throw Error('REPORT_PROOF_INVALID');
  }
  if(total===null||offset!==total)throw Error('REPORT_PROOF_INVALID');
  const bytes=new Uint8Array(total);let start=0;for(const c of chunks){bytes.set(c,start);start+=c.length;}
  const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(actual!==digest)throw Error('REPORT_PROOF_INVALID');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as Json;
}
