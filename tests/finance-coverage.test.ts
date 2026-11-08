import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error Deliberately test the dependency-free Node CLI without changing the TS/runner configuration.
import { cli, definitions, sourceContexts, reportIndex, repoPath, validateGate, validateManifest, validateReceipt } from '../scripts/check-finance-coverage.mjs';

const timezoneFiles = ['forecast','forecast-boundary','forecast-oracles','checkpoints','checkpoint-reconciliation','obligations','savings','transitions','transition-calendar','shared/pure/calendar','shared/pure/berlin-date','domain/period','domain/money','domain/money-codec'].map(s=>`tests/${s}.test.ts`);
const specs = [{path:'tests/scenarios/phase-01/core-rules.md',style:'heading',namespace:'F'}];
function fixture() {
  const contents = {[specs[0].path]:'## F-001 — synthetic no-double-debit contract\nGiven authoritative bank state.\n'};
  const manifest = {version:2,contexts:sourceContexts(contents,specs,[]),timezoneFiles:[...timezoneFiles],tests:{u:{suite:'unit',path:timezoneFiles[0],name:'synthetic passed'},p:{suite:'integration',path:'tests/integration/persistence.test.ts',name:'synthetic passed'}},
    scenarios:[{id:'F-001',source:{path:specs[0].path,locator:'## F-001 — synthetic no-double-debit contract',definitionHash:definitions(contents,specs).get('F-001').definitionHash},br:['BR-02'],adr:['ADR0001'],disposition:'required',obligations:[{key:'behavior',assertion:'Bank preserved by lifecycle',gate:'runtime',coverage:'equivalent-guarantee',tests:['u','p'],evidence:[{ref:'u',guarantee:'Synthetic unit proof for validator contract'},{ref:'p',guarantee:'Synthetic integration proof for validator contract'}],proof:'Synthetic checker fixture, no financial result asserted'}]}],
    support:[{area:'HB-006',tests:['p']},{area:'HB-007',tests:['u']},{area:'HB-008',tests:['u']}],typecheck:[{path:'tests/forecast-types.ts',gate:'typecheck',assertion:'readonly proof'}]};
  const context={root:'/repo',runId:'synthetic-run',startedAt:1000,now:2000};
  const report=(files:string[])=>({success:true,startTime:1100,snapshot:{},numTotalTestSuites:files.length,numPassedTestSuites:files.length,numFailedTests:0,numFailedTestSuites:0,numPendingTests:0,numPendingTestSuites:0,numTodoTests:0,numPassedTests:files.length,numTotalTests:files.length,
    testResults:files.map(path=>({name:`/repo/${path}`,status:'passed',startTime:1101,endTime:1200,assertionResults:[{title:'synthetic passed',ancestorTitles:[] as string[],fullName:'synthetic passed',status:'passed'}]}))});
  return {manifest,contents,context,reports:{unit:report(timezoneFiles),integration:report(['tests/integration/persistence.test.ts']),timezone:report(timezoneFiles)}};
}
type Fixture = ReturnType<typeof fixture>;
const run=(f:Fixture)=>validateGate(f.manifest,f.contents,f.reports,f.context,specs,[]);

it('FPG-010 rejects forged missing or changed report receipts',()=>{
  const context={runId:'new-run'},digest='a'.repeat(64);
  for(const receipt of [{},{runId:'old-run',digest},{runId:'new-run',digest:'b'.repeat(64)}])
    expect(()=>validateReceipt(context,receipt,digest)).toThrow('MISMATCHED_REPORT_EVIDENCE');
});
it('FPG-011 rejects missing duplicate and extra normative context',()=>{
  for(const mode of ['missing','duplicate','extra']){const f=fixture();
    if(mode==='missing')f.manifest.contexts=[];
    else f.manifest.contexts.push(mode==='duplicate'?f.manifest.contexts[0]:{path:'docs/unreviewed.md',sha256:'a'.repeat(64)});
    expect(()=>run(f)).toThrow();}
});
it('FPG-012 rejects absent failed skipped and pending executions',()=>{
  for(const status of ['absent','failed','skipped','pending']){const f=fixture();
    if(status==='absent')f.reports.unit.testResults=[];else f.reports.unit.testResults[0].assertionResults[0].status=status;
    expect(()=>run(f)).toThrow();}
});
it('FPG-013 UTC and LA identities cannot be substituted by equal counts',()=>{
  const f=fixture();const a=f.reports.timezone.testResults[0].assertionResults[0];a.fullName='different passed';a.title=a.fullName;
  expect(()=>run(f)).toThrow('TIMEZONE_IDENTITY_MISMATCH');
});

describe('HB15-G01 exact current-run execution coverage',()=>{
  it('accepts the real schema shape with all obligations and timezone identities passed',()=>{
    expect(run(fixture())).toMatchObject({scenarios:1,references:2,unit:14,integration:1,timezone:14});
  });
  it.each(['failed','skipped','todo','pending'])('rejects assertion status %s even under success=true',status=>{
    const f=fixture();f.reports.unit.testResults[0].assertionResults[0].status=status;
    expect(()=>run(f)).toThrow('UNPASSED_ASSERTION');
  });
  it.each(['absent','empty','wrong-json-shape','missing-field','wrong-total','wrong-title','wrong-path','duplicate-case','duplicate-file','wrong-suite','stale','future'])('rejects %s report evidence',variant=>{
    const f=fixture(),r=f.reports.unit;
    switch(variant){
      case 'absent': Reflect.deleteProperty(f.reports,'unit');break;
      case 'empty':r.testResults=[];break;
      case 'wrong-json-shape':Reflect.set(f.reports,'unit',[]);break;
      case 'missing-field':Reflect.deleteProperty(r,'numTodoTests');break;
      case 'wrong-total':r.numTotalTests++;break;
      case 'wrong-title':r.testResults[0].assertionResults[0].title='different';break;
      case 'wrong-path':r.testResults[0].name='/elsewhere/tests/forecast.test.ts';break;
      case 'duplicate-case':r.testResults[0].assertionResults.push(r.testResults[0].assertionResults[0]);break;
      case 'duplicate-file':r.testResults.push(r.testResults[0]);break;
      case 'wrong-suite':r.testResults[0].name='/repo/tests/integration/forecast.test.ts';break;
      case 'stale':r.startTime=999;break;
      case 'future':r.startTime=2001;break;
    }
    expect(()=>run(f)).toThrow();
  });
  it.each(['missing','extra','renamed','skipped'])('rejects timezone %s identity with no count-only shortcut',variant=>{
    const f=fixture(),r=f.reports.timezone;
    if(variant==='missing'){r.testResults.pop();r.numTotalTests--;r.numPassedTests--;}
    if(variant==='extra'){r.testResults.push({...r.testResults[0],name:'/repo/tests/extra.test.ts'});r.numTotalTests++;r.numPassedTests++;}
    if(variant==='renamed'){r.testResults[0].assertionResults[0].title='renamed';r.testResults[0].assertionResults[0].fullName='renamed';}
    if(variant==='skipped')r.testResults[0].assertionResults[0].status='skipped';
    expect(()=>run(f)).toThrow();
  });
  it('uses exact expanded each names rather than a template or scenario substring',()=>{
    const f=fixture();f.manifest.tests.u.name='synthetic %s';expect(()=>run(f)).toThrow('TEST_NOT_EXECUTED');
  });
  it('rejects an unexpected reporter schema and a duplicated reference catalog identity',()=>{
    const f=fixture();Reflect.set(f.reports.unit,'unknownFutureReporterField',true);
    expect(()=>run(f)).toThrow('UNEXPECTED_REPORT_SCHEMA');
    const g=fixture();Reflect.set(g.manifest.tests,'alias',g.manifest.tests.u);
    expect(()=>run(g)).toThrow('DUPLICATE_REFERENCE');
  });
  it('rejects wrong fullName ancestors rather than joining arbitrary titles permissively',()=>{
    const f=fixture();f.reports.unit.testResults[0].assertionResults[0].ancestorTitles.push('unreported suite');expect(()=>run(f)).toThrow('INVALID_FULL_NAME');
  });
});
describe('HB15-G02 normative inventory and explicit obligation scope',()=>{
  it.each(['missing-scenario','duplicate-scenario','nonexistent-scenario','wrong-locator','missing-obligations','missing-tests','missing-norm','false-deferred','false-partial','unknown-disposition','unknown-ref'])('rejects %s',variant=>{
    const f=fixture(),e=f.manifest.scenarios[0];
    switch(variant){
      case 'missing-scenario':f.manifest.scenarios=[];break;
      case 'duplicate-scenario':f.manifest.scenarios.push(e);break;
      case 'nonexistent-scenario':e.id='F-099';break;
      case 'wrong-locator':e.source.locator='incidental reference F-001';break;
      case 'missing-obligations':e.obligations=[];break;
      case 'missing-tests':e.obligations[0].tests=[];break;
      case 'missing-norm':e.br=[];break;
      case 'false-deferred':e.disposition='deferred';Reflect.set(e,'obligations',[{key:'future',assertion:'money invariant',gate:'deferred',task:'HB-026',reason:'unapproved exemption'}]);break;
      case 'false-partial':e.disposition='partial';break;
      case 'unknown-disposition':e.disposition='ignored';break;
      case 'unknown-ref':e.obligations[0].tests=['absent'];break;
    }
    expect(()=>run(f)).toThrow();
  });
  it('requires every definition, not only the IDs already included by the manifest',()=>{
    const f=fixture();f.contents[specs[0].path]+='## F-002 — new normative case\n';expect(()=>run(f)).toThrow('INVENTORY_MISMATCH');
  });
  it('rejects changed GIVEN/WHEN/THEN even when its heading/ID is unchanged',()=>{
    const f=fixture();f.contents[specs[0].path]+='Then altered financial meaning.\n';expect(()=>run(f)).toThrow('DEFINITION_MISMATCH');
  });
  it('cannot replace a financial execution obligation with a compile-time gate',()=>{
    const f=fixture();Reflect.set(f.manifest.scenarios[0],'obligations',[{key:'substitute',assertion:'bank invariant',gate:'typecheck',paths:['tests/forecast-types.ts']}]);
    expect(()=>run(f)).toThrow('INVALID_TYPECHECK_CONTRACT');
  });
  it('keeps the implemented obligation required when a compound historical scenario is partial',()=>{
    const f=fixture(),e=f.manifest.scenarios[0];
    f.contents[specs[0].path]='## F-014 — independent future statistics\n';
    e.id='F-014';e.source.locator='## F-014 — independent future statistics';e.source.definitionHash=definitions(f.contents,specs).get('F-014').definitionHash;
    f.manifest.contexts=sourceContexts(f.contents,specs,[]);
    e.disposition='partial';
    const future={key:'future',assertion:'separate statistics integration',gate:'deferred',task:'HB-024',reason:'future statistics use case'};
    Reflect.set(e,'obligations',[...e.obligations,future]);expect(run(f).scenarios).toBe(1);
    e.disposition='deferred';Reflect.set(e,'obligations',[future]);
    expect(()=>run(f)).toThrow('IMPLEMENTED_OBLIGATION_REQUIRED');
  });
  it('does not accept compile-time proof as a passed Vitest case',()=>{
    const f=fixture();f.manifest.tests.u.path='tests/forecast-types.ts';expect(()=>run(f)).toThrow('INVALID_REFERENCE');
  });
  it('detects duplicate definitions while ignoring incidental and historical mentions',()=>{
    const body='## F-001 — definition\nReference F-001\n## Archived verification\nF-001 passed historically\n';
    expect(definitions({[specs[0].path]:body},specs).size).toBe(1);
    expect(()=>definitions({[specs[0].path]:body+'## F-001 — duplicate\n'},specs)).toThrow('DUPLICATE_DEFINITION');
  });
  it('normalizes short-ID namespaces, ranges and suffixes at actual definition positions',()=>{
    const cases=[
      {path:'tests/a.md',style:'short',namespace:'HB12',body:'| S01 | full amount |\nS02 referenced only\n',ids:['HB12-S01']},
      {path:'tests/b.md',style:'table',namespace:'HB11',body:'| HB11-20a | correction |\n| HB11-20b | reviewed |\n| HB11-Medium-F | refused |',ids:['HB11-20a','HB11-20b','HB11-Medium-F']},
      {path:'tests/c.md',style:'transition',namespace:'HB13',body:'| T01–T03 | vector |\n## Re-review scenarios\nPG-P04..P08 mutate evidence.\n## Explicit exclusions\nPG-P09 incidental\n',ids:['HB13-T01','HB13-T02','HB13-T03','HB13-PG-P04','HB13-PG-P05','HB13-PG-P06','HB13-PG-P07','HB13-PG-P08']},
    ];
    for(const c of cases)expect([...definitions({[c.path]:c.body},[c]).keys()]).toEqual(c.ids);
  });
  it.each(['../secrets','tests/../private','/absolute','C:/private','tests\\escape.ts','tests//empty','tests/./dot','tests/x\0y'])('rejects path scope problem %j',path=>expect(()=>repoPath(path)).toThrow('INVALID_PATH'));
  it('bounds source content and total report work',()=>{
    const f=fixture();expect(()=>definitions({[specs[0].path]:'x'.repeat(16*1024*1024+1)},specs)).toThrow('SOURCE_LIMIT');
    f.reports.unit.testResults[0].assertionResults=Array(5001).fill(f.reports.unit.testResults[0].assertionResults[0]);expect(()=>run(f)).toThrow('EMPTY_FILE_RESULT');
  });
});
describe('HB15-G03 CLI rejection and repository contract',()=>{
  it('returns nonzero for absent evidence without exposing private content',()=>{
    const directory=mkdtempSync(join(tmpdir(),'hb015-checker-negative-'));
    try{expect(cli(['check',directory])).toBe(1);}finally{rmSync(directory,{recursive:true});}
  });
  it('returns nonzero for malformed current-run JSON and refuses context reuse',()=>{
    const directory=mkdtempSync(join(tmpdir(),'hb015-checker-json-'));
    try {
      expect(cli(['init',directory])).toBe(0);
      expect(cli(['init',directory])).toBe(1);
      writeFileSync(join(directory,'run.json'),'{private-invalid-json');
      expect(cli(['check',directory])).toBe(1);
    } finally { rmSync(directory,{recursive:true}); }
  });
  it.each(['wrong-run','changed-report','missing-receipt','bad-digest'])('rejects %s evidence binding',variant=>{
    const context={runId:'current-run'},digest='a'.repeat(64),receipt={runId:'current-run',digest};
    if(variant==='wrong-run')receipt.runId='old-run';
    if(variant==='changed-report')receipt.digest='b'.repeat(64);
    if(variant==='missing-receipt')Reflect.deleteProperty(receipt,'runId');
    if(variant==='bad-digest')receipt.digest='unbounded-private-content';
    expect(()=>validateReceipt(context,receipt,digest)).toThrow('MISMATCHED_REPORT_EVIDENCE');
  });
  it('validates the actual normative inventory and approved timezone source list',()=>{
    const manifest=JSON.parse(readFileSync('tests/finance/coverage.json','utf8'));
    const paths:string[]=manifest.contexts.map((e:{path:string})=>e.path);
    const contents=Object.fromEntries(paths.map(p=>[p,readFileSync(p,'utf8')]));
    expect(validateManifest(manifest,contents).size).toBe(manifest.scenarios.length);
    expect(manifest.timezoneFiles).toEqual([...timezoneFiles,'tests/closing.test.ts','tests/closing-boundary.test.ts']);
  });
  it('rejects a schema without positive passed results before resolving references',()=>{
    expect(()=>reportIndex({success:true},'unit',fixture().context)).toThrow('INVALID_REPORT');
  });
});

function repositoryContract() {
  const manifest=JSON.parse(readFileSync('tests/finance/coverage.json','utf8'));
  const contents:Record<string,string>=Object.fromEntries(manifest.contexts.map((c:{path:string})=>[c.path,readFileSync(c.path,'utf8')]));
  return {manifest,contents};
}
describe('HB15-G02 R1 shared normative context and compound meaning',()=>{
  it.each([
    ['HB12 common GIVEN','tests/scenarios/phase-01/hb-012-savings.md','B=A[Oct]=40000','B=A[Oct]=50000'],
    ['HB12 legend','tests/scenarios/phase-01/hb-012-savings.md','NONE = all tables','NONE = some tables'],
    ['HB12 between-row qualification','tests/scenarios/phase-01/hb-012-savings.md','Changing confirmed release2000 implicitly is forbidden.','Changing confirmed release2000 implicitly is permitted.'],
    ['HB13 shared row baseline','tests/scenarios/phase-01/hb-013-period-allocations.md','all18 scoped tables','all17 scoped tables'],
    ['HB14 common observation','tests/scenarios/phase-01/hb-014-daily-forecast.md','GIVEN defaults: observed/effective Nov20','GIVEN defaults: observed/effective Nov21'],
  ])('rejects changed %s with individual definitions untouched',(_label,path,before,after)=>{
    const f=repositoryContract();expect(f.contents[path]).toContain(before);
    const originalDefinitions=definitions(f.contents);
    f.contents[path]=f.contents[path].replace(before,after);
    expect([...definitions(f.contents)]).toEqual([...originalDefinitions]);
    expect(()=>validateManifest(f.manifest,f.contents)).toThrow('NORMATIVE_CONTEXT_MISMATCH');
  });
  it('pins every scenario preamble and every declared external normative source',()=>{
    const f=repositoryContract();
    for(const context of f.manifest.contexts as {path:string}[]) {
      const changed={...f.contents,[context.path]:'GIVEN changed global normative context.\n'+f.contents[context.path]};
      expect(()=>validateManifest(f.manifest,changed)).toThrow('NORMATIVE_CONTEXT_MISMATCH');
    }
  });
  it('accepts CRLF/LF changes without treating money/meaning edits as formatting',()=>{
    const f=fixture();f.contents[specs[0].path]=f.contents[specs[0].path].replaceAll('\n','\r\n');expect(run(f).scenarios).toBe(1);
  });
  it.each(['missing','duplicate','extra','wrong-digest'])('rejects %s normative context record',variant=>{
    const f=repositoryContract();
    if(variant==='missing')f.manifest.contexts.pop();
    if(variant==='duplicate')f.manifest.contexts[1]=f.manifest.contexts[0];
    if(variant==='extra')f.manifest.contexts.push({path:'docs/unreviewed.md',sha256:'a'.repeat(64)});
    if(variant==='wrong-digest')f.manifest.contexts[0].sha256='a'.repeat(64);
    expect(()=>validateManifest(f.manifest,f.contents)).toThrow();
  });
  it('bounds whole-file context input before hashing it',()=>{
    expect(()=>sourceContexts({[specs[0].path]:'x'.repeat(16*1024*1024+1)},specs,[])).toThrow('CONTEXT_LIMIT');
  });
  it('requires a per-reference guarantee rather than only the shared scenario heading',()=>{
    const f=fixture();f.manifest.scenarios[0].obligations[0].evidence=[];
    expect(()=>run(f)).toThrow('MISSING_GUARANTEE_EVIDENCE');
  });
  it.each(['missing-before','pretend-complete','closing-as-runtime','after-test-as-before','false-exact','wrong-evidence'])('rejects F-009 %s',variant=>{
    const f=repositoryContract(),e=f.manifest.scenarios.find((s:{id:string})=>s.id==='F-009');
    const before=e.obligations.find((o:{key:string})=>o.key==='unconfirmed-state');
    const after=e.obligations.find((o:{key:string})=>o.key==='confirmed-carry');
    if(variant==='missing-before')e.obligations=e.obligations.filter((o:{key:string})=>o.key!=='unconfirmed-state');
    if(variant==='pretend-complete')e.obligations=e.obligations.filter((o:{key:string})=>o.key!=='manual-closing');
    if(variant==='closing-as-runtime'){const index=e.obligations.findIndex((o:{key:string})=>o.key==='manual-closing');e.obligations[index]={...structuredClone(after),key:'manual-closing'};}
    if(variant==='after-test-as-before'){before.tests=structuredClone(after.tests);before.evidence=structuredClone(after.evidence);}
    if(variant==='false-exact')after.coverage='exact-oracle';
    if(variant==='wrong-evidence')before.evidence[0].ref=after.tests[0];
    expect(()=>validateManifest(f.manifest,f.contents)).toThrow();
  });
  it.each(['F-011','HB1-011','HB2-018','HB1-006','HBL-023'])('cannot present the future branch of %s as fully executed',id=>{
    const f=repositoryContract(),e=f.manifest.scenarios.find((s:{id:string})=>s.id===id);
    expect(e.disposition).toBe('partial');
    e.obligations=e.obligations.filter((o:{gate:string})=>o.gate!=='deferred');e.disposition='required';
    expect(()=>validateManifest(f.manifest,f.contents)).toThrow('FUTURE_OBLIGATION_REQUIRED');
  });
  it('does not let a closing label replace future statistics or operation workflows',()=>{
    const f=repositoryContract(),e=f.manifest.scenarios.find((s:{id:string})=>s.id==='HB1-011');
    e.obligations.find((o:{gate:string})=>o.gate==='deferred').task='HB-019';
    expect(()=>validateManifest(f.manifest,f.contents)).toThrow('FALSE_DEFERRAL');
  });
});

describe('HB19 finance inventory and honest verification status',()=>{
  it('cannot green a required failed or unexecuted verification using other passed reports',()=>{
    for(const status of ['FAILED','NOT_EXECUTED']){const f=fixture();Reflect.set(f.manifest,'blockingVerification',[{key:'required-boundary',scenario:'F-001',status,reason:'A required PostgreSQL boundary has not passed.'}]);expect(()=>run(f)).toThrow('BLOCKED_REQUIRED_VERIFICATION');}
  });
  it('rejects a fabricated PASS or unknown scenario in the blocking registry',()=>{
    for(const item of [{key:'invalid-pass',scenario:'F-001',status:'PASS',reason:'This must never bypass a missing proof.'},{key:'unknown-case',scenario:'HB19-Z99',status:'FAILED',reason:'Unknown scenarios cannot replace the normative inventory.'}]){
      const f=fixture();Reflect.set(f.manifest,'blockingVerification',[item]);expect(()=>run(f)).toThrow('INVALID_BLOCKING_VERIFICATION');
    }
  });
  it('registers 91 base plus 7 QA HB19 definitions and all46 HB2 rows',()=>{
    const f=repositoryContract(),inventory=definitions(f.contents);
    expect([...inventory.keys()].filter(id=>id.startsWith('HB19-'))).toHaveLength(98);
    expect(f.manifest.scenarios.filter((s:{id:string})=>s.id.startsWith('HB2-'))).toHaveLength(46);
  });
  it('parses HB19 definition headings without treating references as definitions',()=>{
    const path='tests/scenarios/phase-01/hb-019-month-closing-versions-rollover.md';
    const result=definitions({[path]:'See HB19-B01 and HB19-R03.\n## HB19-A01 actual contract\nGIVEN synthetic.\n## HB19-R07 chunk contract\nTHEN no partial proof.\n'},[{path,style:'heading',namespace:'HB19'}]);
    expect([...result.keys()]).toEqual(['HB19-A01','HB19-R07']);
  });
  it('binds shared HB19 fixture prose before the first case to the normative hash',()=>{
    const f=repositoryContract(),path='tests/scenarios/phase-01/hb-019-month-closing-versions-rollover.md';
    f.contents[path]='Altered shared fixture admission\n'+f.contents[path];
    expect(()=>validateManifest(f.manifest,f.contents)).toThrow('NORMATIVE_CONTEXT_MISMATCH');
  });
  it.each(['fake-pass','runtime-substitute','manual-finance','tests-under-manual'])('refuses %s browser/verification laundering',variant=>{
    const f=repositoryContract(),browser=f.manifest.scenarios.find((s:{id:string})=>s.id==='HB19-E08'),finance=f.manifest.scenarios.find((s:{id:string})=>s.id==='HB19-B01');
    if(variant==='fake-pass')browser.obligations[0].status='PASS';
    if(variant==='runtime-substitute'){browser.obligations=structuredClone(finance.obligations);browser.disposition='required';}
    if(variant==='manual-finance'){finance.obligations=structuredClone(browser.obligations);finance.disposition='verification';}
    if(variant==='tests-under-manual')browser.obligations[0].tests=[finance.obligations[0].tests[0]];
    expect(()=>validateManifest(f.manifest,f.contents)).toThrow();
  });
  it('cannot replace actual F009 closing with a seeded report projection',()=>{
    const f=repositoryContract(),entry=f.manifest.scenarios.find((s:{id:string})=>s.id==='F-009'),obligation=entry.obligations.find((o:{key:string})=>o.key==='manual-closing');
    obligation.tests=['i0568'];obligation.evidence=[{ref:'i0568',guarantee:'Seeded immutable rows alone are not an actual closing API proof.'}];
    expect(()=>validateManifest(f.manifest,f.contents)).toThrow('PRODUCTION_CLOSING_PROOF_REQUIRED');
  });
  it('requires both added closing timezone files without reducing the prior source set',()=>{
    const f=repositoryContract(),i=f.manifest.timezoneFiles.indexOf('tests/closing.test.ts');
    f.manifest.timezoneFiles[i]='tests/unreviewed.test.ts';expect(()=>validateManifest(f.manifest,f.contents)).toThrow('INVALID_TIMEZONE_SET');
  });
});
