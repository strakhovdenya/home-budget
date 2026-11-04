import {expect,it} from 'vitest';
import {reviewDifference} from '@/features/month-closing/review-difference';

it('HB19-E02/E07 review preserves complete long evidence and paths in bounded fragments',()=>{
  const key='proof/'.repeat(100),note='界😀\n'.repeat(500),lines=reviewDifference(null,{[key]:note});
  expect(lines.slice(1).map(x=>x.after??'').join('')).toBe(JSON.stringify(note).replace(/[\uD800-\uDFFF]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')));
  expect(lines.every(x=>(x.before?.length??0)<=256&&(x.after?.length??0)<=256&&x.path.length<280)).toBe(true);
  expect(lines.length).toBeGreaterThan(20);
});
it('HB19-E02 unchanged money cannot hide replaced source order and audit identities',()=>{
  const old={amount:'10000',orderingRevisionRefs:['old-order'],sourceManifest:{evidence:[{id:'old-audit',document:{ref:'old-source'}}]}};
  const next={...old,orderingRevisionRefs:['new-order'],sourceManifest:{evidence:[{id:'new-audit',document:{ref:'new-source'}}]}};
  const lines=reviewDifference(old,next),text=JSON.stringify(lines);
  for(const ref of ['old-order','new-order','old-audit','new-audit','old-source','new-source'])expect(text).toContain(ref);
  expect(text).not.toContain('10000');expect(reviewDifference(next,next)).toEqual([]);
});
it('HB19-E02 missing values empty containers and prototype-named evidence stay distinct',()=>{
  const old=JSON.parse('{"__proto__":null,"constructor":"old","empty":{},"shape":[]}');
  const next=JSON.parse('{"constructor":null,"empty":[],"shape":{}}');
  const lines=reviewDifference(old,next);expect(lines.find(x=>x.path.includes('__proto__'))).toMatchObject({before:'null',after:null});
  expect(lines.find(x=>x.path.includes('constructor'))).toMatchObject({before:'"old"',after:'null'});
  expect(lines.some(x=>x.path.includes('empty')&&x.before==='"object"'&&x.after==='"array"')).toBe(true);
});
