import type { Json } from '@/domain/closing/contracts';

export type ReviewDifference=Readonly<{path:string;before:string|null;after:string|null}>;
// Low-level byte/field oracle for independent proof and diagnostics. The user
// interface renders closingReviewContent, not these JSON paths/fragments.
/** Documents have already passed complete chunk/SHA verification. Preserve every
 * changed leaf, including evidence documents, ordering edges and typed identities.
 * Page strings as well as rows: a single audit note must never create a huge DOM.
 * null here means absent; the JSON value null is rendered as the text "null". */
export function reviewDifference(before:Json|null,after:Json):readonly ReviewDifference[]{
  const changes:ReviewDifference[]=[];let visits=0;
  // Escape UTF-16 surrogates explicitly so fragment boundaries cannot replace a
  // half of a visible character. Fragments concatenate to the exact JSON text.
  const visible=(v:string)=>v.replace(/[\uD800-\uDFFF]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
  function scalar(v:Json|undefined){return v===undefined?null:visible(JSON.stringify(v));}
  function add(path:string,a:Json|undefined,b:Json|undefined){
    path=visible(JSON.stringify(path));
    const old=scalar(a),next=scalar(b),length=Math.max(path.length,old?.length??0,next?.length??0);
    for(let offset=0;offset<length;offset+=256)changes.push({path:path.slice(offset,offset+256)+' ['+offset+']',before:old===null?null:old.slice(offset,offset+256),after:next===null?null:next.slice(offset,offset+256)});
  }
  function walk(a:Json|undefined,b:Json|undefined,path:string,depth:number){
    if(++visits>200000||depth>32)throw Error('REPORT_LIMIT_EXCEEDED');
    if(a===b)return;
    const ao=a!==null&&typeof a==='object',bo=b!==null&&typeof b==='object';
    if(ao||bo){
      // A changed container type is explicit, including empty objects/arrays.
      const kind=(v:Json|undefined)=>v===undefined?'absent':Array.isArray(v)?'array':v!==null&&typeof v==='object'?'object':'value';
      if(kind(a)!==kind(b))add(path+' / type',kind(a),kind(b));
      const keys=[...new Set([...Object.keys(ao?a:{}),...Object.keys(bo?b:{})])].sort();
      const own=(v:Json|undefined,object:boolean,key:string)=>object&&Object.hasOwn(v as object,key)?(v as Record<string,Json>)[key]:undefined;
      for(const key of keys)walk(own(a,ao,key),own(b,bo,key),path+'/'+key.replaceAll('~','~0').replaceAll('/','~1'),depth+1);
      if(!ao&&a!==undefined)add(path,a,undefined);
      if(!bo&&b!==undefined)add(path,undefined,b);
    }else add(path,a,b);
  }
  walk(before===null?undefined:before,after,'',0);return changes;
}
