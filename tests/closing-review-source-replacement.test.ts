import {expect,it} from 'vitest';import {createTranslator} from 'next-intl';
import {catalogs} from '@/shared/i18n/catalogs';import {closingReviewContent} from '@/features/month-closing/review-content';import {groupedClosingReview} from '@/features/month-closing/grouped-review';
const translator=createTranslator({locale:'en',messages:catalogs.en,namespace:'monthClosing'});
const t=(key:string,values?:Record<string,string|number>)=>translator(key as Parameters<typeof translator>[0],values);
it('closing review distinguishes removed and added bank sources at the same array index',()=>{
 // Minimal presentation input for the real browser's accepted late-point
 // candidate. The browser separately proves valid persisted source/H/K data.
 const evidence=(id:string,bank:string,balanceCents:string)=>({id,document:{schemaVersion:1,eventIndex:0,entity:{type:'BANK_CHECKPOINT',id:bank},before:null,after:{balanceCents}}});
 const before={sourceManifest:{evidence:[evidence('old-audit','old-check','80000')]}},after={sourceManifest:{evidence:[evidence('new-audit','new-check','76000')]}};
 const raw=closingReviewContent(before,after,'en',t),coverage=raw.flatMap(r=>r.coverage);
 expect(()=>groupedClosingReview(raw,false,t)).not.toThrow();
 expect(new Set(coverage).size).toBe(coverage.length);
});
it('closing review still rejects genuinely duplicated coverage',()=>{
 const raw=closingReviewContent({note:'old'},{note:'new'},'en',t);
 expect(raw.length).toBeGreaterThan(0);
 expect(()=>groupedClosingReview([raw[0],raw[0]],false,t)).toThrow('REPORT_PROOF_INVALID');
});
