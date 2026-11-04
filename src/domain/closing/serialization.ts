import type { ClosingError, Json } from './contracts';
export const CLOSING_LIMITS=Object.freeze({bytes:8388608,wire:1048576,chunk:131072,nodes:100000,depth:32,work:4000000,chain:1000});
export class ClosingFailure extends Error { constructor(readonly code:ClosingError){super(code);} }
export function fail(code:ClosingError):never{throw new ClosingFailure(code);}
/** Separate report codec. HB-009 command/audit limits are never widened. */
export function canonicalDocument(input:unknown,onVisit:()=>void=()=>{}):string {
  const ancestors=new Set<object>();let nodes=0,bytes=0;
  const encoder=new TextEncoder();
  function part(s:string){bytes+=encoder.encode(s).length;if(bytes>CLOSING_LIMITS.bytes)fail('REPORT_LIMIT_EXCEEDED');return s;}
  function visit(v:unknown,depth:number):string {
    onVisit();if(++nodes>CLOSING_LIMITS.nodes||depth>CLOSING_LIMITS.depth)fail('REPORT_LIMIT_EXCEEDED');
    if(v===null||typeof v==='boolean')return part(String(v));
    if(typeof v==='string')return part(JSON.stringify(v));
    if(typeof v==='number'&&Number.isSafeInteger(v))return part(JSON.stringify(v));
    if(!v||typeof v!=='object'||ancestors.has(v))return fail('REPORT_PROOF_INVALID');
    const array=Array.isArray(v),keys=Reflect.ownKeys(v);
    if(Object.getPrototypeOf(v)!==(array?Array.prototype:Object.prototype)||keys.some(k=>typeof k!=='string'))fail('REPORT_PROOF_INVALID');
    if(keys.length>CLOSING_LIMITS.nodes)fail('REPORT_LIMIT_EXCEEDED');
    ancestors.add(v);
    function value(k:string){const d=Object.getOwnPropertyDescriptor(v,k);if(!d||!('value'in d)||!d.enumerable)fail('REPORT_PROOF_INVALID');return visit(d.value,depth+1);}
    let out:string;
    if(array){if(keys.length!==v.length+1)fail('REPORT_PROOF_INVALID');out=part('[')+Array.from({length:v.length},(_,i)=>(i?part(','):'')+value(String(i))).join('')+part(']');}
    else out=part('{')+(keys as string[]).sort().map((k,i)=>(i?part(','):'')+part(JSON.stringify(k)+':')+value(k)).join('')+part('}');
    ancestors.delete(v);return out;
  }
  return visit(input,0);
}
export function reportJson(input:unknown):Json {return JSON.parse(canonicalDocument(input)) as Json;}
export function operationBudget(workRows:readonly number[],visits:number):number{
  if(!Number.isSafeInteger(visits)||visits<0||workRows.some(w=>!Number.isSafeInteger(w)||w<0||w>2000))fail('REPORT_LIMIT_EXCEEDED');
  const total=workRows.reduce((n,w)=>n+w*w,visits);if(total>CLOSING_LIMITS.work)fail('REPORT_LIMIT_EXCEEDED');return total;
}
export function chainBudget(links:number,bytes:number):void{
  if(!Number.isSafeInteger(links)||links<0||links>CLOSING_LIMITS.chain||!Number.isSafeInteger(bytes)||bytes<0||bytes>CLOSING_LIMITS.wire)fail('REPORT_LIMIT_EXCEEDED');
}
