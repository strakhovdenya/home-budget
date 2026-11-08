import { afterEach, expect, it } from 'vitest';
import { appendFileSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
// @ts-expect-error Dependency-free Node gate is exercised without changing TS configuration.
import { administrativeReports, cli, fingerprint, fingerprintFiles, fingerprintRootFiles, validateRun } from '../scripts/check-finance-coverage.mjs';

const roots:string[]=[];
afterEach(()=>{for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});
function fixture(){
  const root=mkdtempSync(join(tmpdir(),'hb0191-fingerprint-'));roots.push(root);
  for(const p of fingerprintFiles(process.cwd()) as string[]){const dest=join(root,p);mkdirSync(dirname(dest),{recursive:true});copyFileSync(p,dest);}
  const context={root:realpathSync(root).replaceAll('\\','/'),fingerprint:fingerprint(root),job:process.env.GITHUB_RUN_ID?`${process.env.GITHUB_RUN_ID}/${process.env.GITHUB_RUN_ATTEMPT}/${process.env.GITHUB_JOB}`:'local'};
  return {root,context,change:(p:string)=>appendFileSync(join(root,p),'\nSynthetic changed financial input.\n')};
}
it('FPG-001 administrative reports preserve the financial digest without excluding mixed contracts',()=>{
  const f=fixture();for(const p of administrativeReports as string[]){mkdirSync(dirname(join(f.root,p)),{recursive:true});writeFileSync(join(f.root,p),'Accepted status only\n');}
  expect(fingerprint(f.root)).toBe(f.context.fingerprint);expect(()=>validateRun(f.context,f.root)).not.toThrow();
  f.change('docs/TASKS.md');expect(()=>validateRun(f.context,f.root)).toThrow('MISMATCHED_RUN');
});
it.each(['docs/BUSINESS_RULES.md','docs/adr/0002-month-closing-and-corrections.md','docs/planning/hb-013-period-allocations.md'])('FPG-002 protects financial rules and contracts %s',p=>{
  const f=fixture();f.change(p);expect(()=>validateRun(f.context,f.root)).toThrow('MISMATCHED_RUN');
});
it('FPG-003 protects shared scenario prose outside definition headings',()=>{
  const f=fixture(),p='tests/scenarios/phase-01/hb-012-savings.md';writeFileSync(join(f.root,p),'Changed common GIVEN\n'+readFileSync(join(f.root,p),'utf8'));
  expect(()=>validateRun(f.context,f.root)).toThrow('MISMATCHED_RUN');
});
it.each(['src/domain/money/money.ts','tests/forecast.test.ts'])('FPG-004 source and tests remain protected %s',p=>{
  const f=fixture();f.change(p);expect(()=>validateRun(f.context,f.root)).toThrow('MISMATCHED_RUN');
});
it('FPG-005 SQL bytes invalidate the run with unchanged journal',()=>{
  const f=fixture(),journal=readFileSync(join(f.root,'drizzle/meta/_journal.json'));f.change('drizzle/0000_foundation.sql');
  expect(readFileSync(join(f.root,'drizzle/meta/_journal.json'))).toEqual(journal);expect(()=>validateRun(f.context,f.root)).toThrow('MISMATCHED_RUN');
});
it.each(['add','delete','rename','unknown-extension'])('FPG-006 migration file set protects %s',variant=>{
  const f=fixture(),p=join(f.root,'drizzle/0000_foundation.sql');
  if(variant==='add')writeFileSync(join(f.root,'drizzle/9999_synthetic.sql'),'SELECT 1;');
  if(variant==='delete')unlinkSync(p);
  if(variant==='rename')renameSync(p,join(f.root,'drizzle/renamed.sql'));
  if(variant==='unknown-extension')writeFileSync(join(f.root,'drizzle/new-migration.future'),'new contract');
  expect(()=>validateRun(f.context,f.root)).toThrow('MISMATCHED_RUN');
});
it.each([...fingerprintRootFiles,'tests/finance/coverage.json','scripts/check-finance-coverage.mjs'])('FPG-007 policy and execution configuration %s',p=>{
  const f=fixture();f.change(p);expect(()=>validateRun(f.context,f.root)).toThrow('MISMATCHED_RUN');
});
it('FPG-008 actual CLI init cannot record after a financial edit',()=>{
  const f=fixture(),evidence=join(f.root,'evidence');expect(cli(['init',evidence],f.root)).toBe(0);
  const run=JSON.parse(readFileSync(join(evidence,'run.json'),'utf8'));f.change('drizzle/0000_foundation.sql');
  expect(()=>validateRun(run,f.root)).toThrow('MISMATCHED_RUN');expect(cli(['record',evidence,'unit'],f.root)).toBe(1);
});
it('FPG-009 run root and job are bound before report consumption',()=>{
  const f=fixture();expect(()=>validateRun({...f.context,root:f.context.root+'/foreign'},f.root)).toThrow('MISMATCHED_RUN');
  expect(()=>validateRun({...f.context,job:'foreign'},f.root)).toThrow('MISMATCHED_JOB');
});
it('FPG-014 archived run is rejected after checker policy changes',()=>{
  const f=fixture();f.change('scripts/check-finance-coverage.mjs');expect(()=>validateRun(f.context,f.root)).toThrow('MISMATCHED_RUN');
});
it('FPG path aliases and deterministic enumeration fail closed',()=>{
  const f=fixture();expect(fingerprint(f.root)).toBe(fingerprint(f.root));
  const target=mkdtempSync(join(tmpdir(),'hb0191-foreign-'));roots.push(target);writeFileSync(join(target,'outside.sql'),'SELECT 1;');
  symlinkSync(target,join(f.root,'drizzle/alias'),process.platform==='win32'?'junction':'dir');
  expect(()=>fingerprint(f.root)).toThrow('PATH_ALIAS');
});
