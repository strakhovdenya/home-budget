/* global process */
import { readFileSync, writeFileSync, statSync, realpathSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Buffer } from 'node:buffer';

// No financial values, reporter messages or caller-controlled text enter diagnostics.
const fail = code => { throw new Error(code); };
const check = (condition, code) => { if (!condition) fail(code); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 4000;
const hash = value => createHash('sha256').update(value).digest('hex');
const LIMIT = 16 * 1024 * 1024;
export const sources = [
  ['core-rules.md','heading','F'],
  ['hb-001-checkpoints-and-allocations.md','heading','HB1'],
  ['hb-002-month-closing-and-corrections.md','heading','HB2'],
  ['hb-003-daily-forecast.md','heading','HB3'],
  ['hb-003-allocation-correction.md','heading','HBA'],
  ['hb-003-safe-liquidity.md','heading','HBL'],
  ['hb-009-audit-idempotency.md','heading','HB9'],
  ['hb-010-bank-checkpoints.md','bullet','HB10'],
  ['hb-011-obligations.md','table','HB11'],
  ['hb-012-savings.md','short','HB12'],
  ['hb-013-period-allocations.md','transition','HB13'],
  ['hb-014-daily-forecast.md','numeric','HB14'],
  ['hb-015-finance-tests-ci.md','heading','HB15'],
].map(([name,style,namespace]) => ({path:`tests/scenarios/phase-01/${name}`,style,namespace}));

// Whole-file context is deliberately conservative: shared GIVENs, table legends,
// between-row prose and linked contracts cannot disappear between definition slices.
export const normativeContexts = [
  'docs/BUSINESS_RULES.md','docs/DECISIONS.md',
  'docs/adr/0001-checkpoints-and-allocations.md','docs/adr/0002-month-closing-and-corrections.md','docs/adr/0003-daily-forecast-and-liquidity.md',
  'docs/ARCHITECTURE.md','docs/architecture.json','docs/DATA_MODEL.md','docs/conventions.md',
  'docs/PRD.md','docs/TASKS.md','docs/OPEN_QUESTIONS.md','docs/IMPLEMENTATION_PLAN.md',
  'docs/planning/hb-008-money-dates.md','docs/planning/hb-009-audit-idempotency.md',
  'docs/planning/hb-010-bank-checkpoints.md','docs/planning/hb-011-obligations.md','docs/planning/hb-012-savings.md',
  'docs/planning/hb-013-period-allocations.md','docs/planning/hb-014-daily-forecast.md','docs/planning/hb-015-finance-tests-ci.md',
];
export function sourceContexts(contents, specs=sources, contextPaths=normativeContexts) {
  const paths=[...specs.map(s=>s.path),...contextPaths];
  check(paths.length<=64 && new Set(paths).size===paths.length,'INVALID_CONTEXT_SET');
  let bytes=0;
  return paths.map(path=>{
    repoPath(path); const body=contents[path];
    check(typeof body==='string' && body.length>0,'MISSING_CONTEXT_SOURCE');
    // At most 16 MiB per file and 64 MiB total, including worst-case UTF-8.
    const size=Buffer.byteLength(body,'utf8'); bytes+=size;
    check(size<=LIMIT && bytes<=4*LIMIT,'CONTEXT_LIMIT');
    return {path,sha256:hash(body.replaceAll('\r\n','\n'))};
  });
}

export function repoPath(value) {
  check(text(value) && !value.includes('\\') && !value.includes(':') && !value.includes('\0') && !isAbsolute(value), 'INVALID_PATH');
  check(value.split('/').every(p => p && p !== '.' && p !== '..'), 'INVALID_PATH');
  return value;
}
function expand(expression, namespace) {
  let prefix = '';
  const result = [];
  for (const part of expression.split('/')) {
    const bounds = part.split(/–|\.\./);
    const parse = token => {
      const match = /^(.*?)(\d+)([ab]?)$/.exec(token);
      check(match, 'INVALID_DEFINITION');
      if (match[1]) prefix = prefix.startsWith('PG-') && /^[RFP]$/.test(match[1]) ? `PG-${match[1]}` : match[1];
      return {prefix, number:Number(match[2]), width:match[2].length, suffix:match[3]};
    };
    const a = parse(bounds[0]), b = bounds[1] ? parse(bounds[1]) : a;
    check(bounds.length <= 2 && a.prefix === b.prefix && b.number >= a.number && b.number-a.number < 100 && (!bounds[1] || (!a.suffix && !b.suffix)), 'INVALID_RANGE');
    for (let n=a.number;n<=b.number;n++) {
      const local = `${a.prefix}${String(n).padStart(a.width,'0')}${a.suffix}`;
      result.push(local.startsWith(`${namespace}-`) ? local : `${namespace}-${local}`);
    }
  }
  return result;
}

/** File-specific definition positions only. References and archived evidence are not definitions. */
export function definitions(contents, specs = sources) {
  const found = new Map();
  for (const spec of specs) {
    repoPath(spec.path);
    check(typeof contents[spec.path]==='string' && contents[spec.path].length>0, 'MISSING_SOURCE');
    check(contents[spec.path].length <= LIMIT, 'SOURCE_LIMIT');
    let review = false;
    const lines = contents[spec.path].split(/\r?\n/);
    lines.forEach((line,index) => {
      if (spec.style === 'transition' && line === '## Re-review scenarios') review = true;
      if (spec.style === 'transition' && line === '## Explicit exclusions') review = false;
      let expressions = [];
      if (spec.style === 'heading') {
        const m = /^## ((?:F|HB1|HB2|HB3|HBA|HBL|HB9|HB15)-[A-Z]*\d+(?:[ab])?)\s/.exec(line);
        if (m) expressions = [m[1]];
      } else if (spec.style === 'bullet') {
        const m = /^- \*\*(HB10-[A-Z]+\d+)/.exec(line); if(m) expressions=[m[1]];
      } else if (spec.style === 'table') {
        const m = /^\| (HB11-(?:\d+[ab]?|M\d+|Medium-[A-F])) \|/.exec(line);
        if (m) expressions = [m[1]];
      } else if (spec.style === 'short') {
        const m = /^\| ([SEO]\d{2}) \|/.exec(line); if (m) expressions=[m[1]];
      } else if (spec.style === 'numeric') {
        const m = /^\| (\d{3}) \|/.exec(line); if (m) expressions=[m[1]];
      } else if (spec.style === 'transition') {
        const m = /^\| (T\d{2}(?:–T\d{2})?) \|/.exec(line); if (m) expressions=[m[1]];
        if (review) expressions=[...line.matchAll(/PG-([RFP]\d{2}(?:(?:\/|\.\.)(?:PG-)?[RFP]?\d{2})*)/g)].map(m=>`PG-${m[1]}`);
      } else fail('UNKNOWN_SOURCE_STYLE');
      for (const expression of expressions) {
        // Metadata Medium IDs have letter endings, not numerical ranges.
        const ids = expression.startsWith('HB11-Medium-') ? [expression] : expand(expression,spec.namespace);
        for(const id of ids) {
          check(!found.has(id),'DUPLICATE_DEFINITION');
          let end=index+1;
          if(spec.style==='heading') { while(end<lines.length && !/^## /.test(lines[end])) end++; }
          else if(spec.style==='bullet' || (spec.style==='transition' && review)) { while(end<lines.length && lines[end].trim() && !/^## /.test(lines[end])) end++; }
          found.set(id,{path:spec.path,line:index+1,locator:line,definitionHash:hash(lines.slice(index,end).join('\n').trim())});
        }
      }
    });
  }
  check(found.size>0 && found.size<=1000,'INVENTORY_LIMIT');
  return found;
}

// Scope exclusions are explicit individual IDs, never prefix exemptions. All other scenarios need runtime proof.
const pureFuture = new Map([['F-012','HB-026'],['F-016','HB-020']]);
const futureParts = new Map([
  ['F-014','HB-024'],['F-013','HB-019'],
  ['HB2-009','HB-019'],['HB2-010','HB-019'],['HB2-029','HB-019'],
  ['HB2-043','HB-017'],
  ...['HB1-005','HB1-006','HB1-007','HB1-019','HB2-018'].map(id=>[id,'HB-026']),
  ...['HB1-016','HB1-017','HB1-018','HB2-001','HB2-002','HB2-003','HB2-004','HB2-005','HB2-006','HB2-007','HB2-008','HB2-022','HB2-026','HB2-027','HB2-028','HB2-030','HB2-036','HB2-040'].map(id=>[id,'HB-019']),
  // R1: actual future operation/report/UI branches, not exemptions for implemented facts.
  ...['F-004','F-011','F-015','HB1-001','HB1-003','HB1-006','HB1-010','HB1-013','HBA-006'].map(id=>[id,'HB-024']),
  ...['F-009','HB2-012','HB2-016','HB3-028'].map(id=>[id,'HB-019']),
  ...['HB1-011','HB1-012','HB2-020'].map(id=>[id,'HB-022']),
  ['HB1-014',['HB-016','HB-022']],
  ...['HB2-033','HB2-044'].map(id=>[id,'HB-017']),
  ...['HBL-013','HBL-019','HBL-020','HBL-021','HBL-022','HBL-023','HBL-024','HBL-025','HBL-026','HBL-028'].map(id=>[id,'HB-016']),
]);
// These cases only consume an existing closing in GIVEN or do not close at all.
// Their implemented history/transfer guarantees must not be hidden behind HB-019.
for(const id of ['HB1-016','HB2-003','HB2-005']) futureParts.delete(id);
export function deferredTasks(id) { return [pureFuture.get(id)??futureParts.get(id)??[]].flat(); }

// Independent minimum obligation structure for audited compound scenarios.
// Human review still establishes semantics; runtime execution is not an oracle proof.
export const compoundContracts = new Map();
for(const [ids,keys] of [
  [['F-009','HB1-010','HB1-014','HB1-015','HB1-016','HB2-003','HB2-010','HB2-011','HB2-025','HB2-031','HB2-032','HB2-035','HB2-037','HB3-015','HB3-016','HBA-007','HBA-013','HBL-018'],['confirmed-carry','unconfirmed-state','historical-selection']],
  [['HB2-039','HB2-040','HB2-041','HB2-042','HB2-043','HB2-046','HB3-017','HB3-018','HB3-033','HBA-008','HBA-009','HBA-010','HBA-015','HBL-018'],['confirmed-fresh-start','preserved-earmarks','historical-selection']],
  [['HB1-008','HB2-009','HB2-013','HB2-029','HB3-019','HBL-011'],['payment-state','observed-cash']],
  [['HBL-012'],['cancellation','voluntary-release']],
]) for(const id of ids) compoundContracts.set(id,[...new Set([...(compoundContracts.get(id)??[]),...keys])]);

const f009Bindings = {
  'confirmed-carry': [
    ['tests/integration/transitions.test.ts','HB13 T13..T16/T19/T39/T41/T51..T53 CARRY full histories and unchanged bank date'],
    ['tests/integration/budget-projection.test.ts','HB14-015/016/017/041/061 PG genuine HB13 CARRY full lineage'],
  ],
  'unconfirmed-state': [
    ['tests/integration/transitions.test.ts','HB13 T29/T68 prepare and preview persist only immutable control review'],
    ['tests/integration/budget-projection.test.ts','HB14-054 F-009 PG immutable report bytes/head/flags survive repeated projection'],
  ],
  'historical-selection': [
    ['tests/integration/transitions.test.ts','HB13 T13..T16/T19/T39/T41/T51..T53 CARRY full histories and unchanged bank date'],
    ['tests/integration/transitions.test.ts','HB13 T44 later CARRY leaves original closing bytes, pinned K and pending flag unchanged'],
    ['tests/integration/persistence.test.ts','DB20 closing an older observation keeps end NULL and validates copied checkpoint/vector facts'],
  ],
};

export function validateManifest(manifest, contents, specs = sources, contextPaths=normativeContexts) {
  check(plain(manifest) && manifest.version===2 && Array.isArray(manifest.scenarios) && plain(manifest.tests),'INVALID_MANIFEST');
  const inventory=definitions(contents,specs), seen=new Set();
  check(manifest.scenarios.length===inventory.size,'INVENTORY_MISMATCH');
  const entries=Object.entries(manifest.tests);
  check(entries.length>0 && entries.length<=2000,'REFERENCE_LIMIT');
  const referenceIdentities=new Set();
  for(const [key,ref] of entries) {
    check(/^[a-z][a-z0-9-]{0,60}$/.test(key) && plain(ref),'INVALID_REFERENCE');
    repoPath(ref.path);
    check(ref.path.startsWith('tests/') && /\.test\.tsx?$/.test(ref.path) && text(ref.name),'INVALID_REFERENCE');
    check(ref.suite===(ref.path.startsWith('tests/integration/')?'integration':'unit'),'REFERENCE_SUITE');
    const identity=`${ref.path}\0${ref.name}`;
    check(!referenceIdentities.has(identity),'DUPLICATE_REFERENCE'); referenceIdentities.add(identity);
  }
  for(const entry of manifest.scenarios) {
    check(plain(entry) && text(entry.id) && !seen.has(entry.id),'INVALID_SCENARIO'); seen.add(entry.id);
    const def=inventory.get(entry.id);
    check(def && plain(entry.source) && entry.source.path===def.path && entry.source.locator===def.locator && entry.source.definitionHash===def.definitionHash,'DEFINITION_MISMATCH');
    check(Array.isArray(entry.br) && entry.br.length>0 && entry.br.every(v=>/^BR-(?:0[1-9]|10|11)$/.test(v)),'MISSING_NORM');
    check(Array.isArray(entry.adr) && entry.adr.length>0 && entry.adr.every(v=>/^ADR000[123]$/.test(v)),'MISSING_NORM');
    check(['required','partial','deferred'].includes(entry.disposition),'INVALID_DISPOSITION');
    check(Array.isArray(entry.obligations) && entry.obligations.length>0 && entry.obligations.length<=20,'MISSING_OBLIGATION');
    let required=0,deferred=0; const keys=new Set(),tasks=new Set();
    for(const obligation of entry.obligations) {
      check(plain(obligation) && /^[a-z][a-z0-9-]{0,60}$/.test(obligation.key) && !keys.has(obligation.key) && text(obligation.assertion),'INVALID_OBLIGATION'); keys.add(obligation.key);
      if(obligation.gate==='runtime') {
        required++;
        check(Array.isArray(obligation.tests) && obligation.tests.length>0 && obligation.tests.length<=1000 && new Set(obligation.tests).size===obligation.tests.length,'MISSING_TEST_REFERENCE');
        for(const ref of obligation.tests) check(Object.hasOwn(manifest.tests,ref),'UNKNOWN_TEST_REFERENCE');
        check(text(obligation.proof),'MISSING_SEMANTIC_PROOF');
        check(['exact-oracle','equivalent-guarantee'].includes(obligation.coverage),'MISSING_COVERAGE_QUALIFIER');
        if(obligation.coverage==='exact-oracle' || entry.fixtureBasis==='exact-original')
          check(['F-001','F-002','HB15-M01','HB15-M02','HB15-M03','HB15-M04','HB15-M05','HB15-M06'].includes(entry.id) && obligation.coverage==='exact-oracle','FALSE_EXACT_ORACLE');
        check(!obligation.assertion.startsWith('Implemented foundation guarantee:'),'GENERIC_SCENARIO_CLAIM');
        check(Array.isArray(obligation.evidence) && obligation.evidence.length===obligation.tests.length,'MISSING_GUARANTEE_EVIDENCE');
        const evidence=new Set();
        for(const item of obligation.evidence) {
          check(plain(item) && obligation.tests.includes(item.ref) && !evidence.has(item.ref) && text(item.guarantee) && item.guarantee.length>=20,'INVALID_GUARANTEE_EVIDENCE');
          evidence.add(item.ref);
        }
      } else if(obligation.gate==='typecheck') {
        required++;
        check(entry.id==='HB9-027' && Array.isArray(obligation.paths) && obligation.paths.length>0 && obligation.paths.every(path=>manifest.typecheck?.some(ref=>ref.path===path && ref.gate==='typecheck')) && !obligation.tests,'INVALID_TYPECHECK_CONTRACT');
      } else if(obligation.gate==='deferred') {
        deferred++;
        check(deferredTasks(entry.id).includes(obligation.task) && !tasks.has(obligation.task) && text(obligation.reason) && !obligation.tests,'FALSE_DEFERRAL'); tasks.add(obligation.task);
      } else fail('INVALID_OBLIGATION_GATE');
    }
    check(entry.disposition===(required?(deferred?'partial':'required'):'deferred'),'DISPOSITION_MISMATCH');
    check(pureFuture.has(entry.id) ? !required && deferred===1 : required>0,'IMPLEMENTED_OBLIGATION_REQUIRED');
    check(deferredTasks(entry.id).length===deferred,'FUTURE_OBLIGATION_REQUIRED');
    for(const key of compoundContracts.get(entry.id)??[])
      check(entry.obligations.some(o=>o.key===key && o.gate==='runtime'),'COMPOUND_OBLIGATION_REQUIRED');
    if(entry.id==='F-009') for(const [key,bindings] of Object.entries(f009Bindings)) {
      const obligation=entry.obligations.find(o=>o.key===key);
      for(const [path,name] of bindings) check(obligation.tests.some(ref=>manifest.tests[ref].path===path && manifest.tests[ref].name===name),'COMPOUND_EVIDENCE_REQUIRED');
    }
    if(entry.id==='HB9-027') check(entry.obligations.length===1 && entry.obligations[0].gate==='typecheck','INVALID_TYPECHECK_CONTRACT');
  }
  check([...inventory.keys()].every(id=>seen.has(id)),'INVENTORY_MISMATCH');
  const expectedContexts=sourceContexts(contents,specs,contextPaths);
  check(Array.isArray(manifest.contexts) && manifest.contexts.length===expectedContexts.length,'CONTEXT_SET_MISMATCH');
  const contextMap=new Map();
  for(const context of manifest.contexts) {
    check(plain(context) && !contextMap.has(context.path) && /^[a-f0-9]{64}$/.test(context.sha256),'INVALID_CONTEXT');
    contextMap.set(repoPath(context.path),context.sha256);
  }
  for(const context of expectedContexts) check(contextMap.get(context.path)===context.sha256,'NORMATIVE_CONTEXT_MISMATCH');
  check(Array.isArray(manifest.timezoneFiles) && manifest.timezoneFiles.length===14 && new Set(manifest.timezoneFiles).size===14,'INVALID_TIMEZONE_SET');
  for(const file of manifest.timezoneFiles) check(repoPath(file).startsWith('tests/') && !file.startsWith('tests/integration/') && file.endsWith('.test.ts'),'INVALID_TIMEZONE_SET');
  check(Array.isArray(manifest.support) && manifest.support.length>=3,'MISSING_SUPPORT');
  for(const support of manifest.support) {
    check(plain(support) && text(support.area) && Array.isArray(support.tests) && support.tests.length>0,'INVALID_SUPPORT');
    for(const ref of support.tests) check(Object.hasOwn(manifest.tests,ref),'UNKNOWN_TEST_REFERENCE');
  }
  check(Array.isArray(manifest.typecheck) && manifest.typecheck.length>0,'MISSING_TYPECHECK_CONTRACT');
  for(const ref of manifest.typecheck) check(plain(ref) && repoPath(ref.path).startsWith('tests/') && text(ref.assertion) && ref.gate==='typecheck','INVALID_TYPECHECK_CONTRACT');
  return inventory;
}

function reportPath(value, root) {
  check(text(value),'INVALID_REPORT_PATH');
  const portable=value.replaceAll('\\','/'), base=root.replaceAll('\\','/').replace(/\/$/,'');
  check(portable.startsWith(`${base}/`),'REPORT_OUTSIDE_ROOT');
  return repoPath(portable.slice(base.length+1));
}
export function reportIndex(report, suite, context) {
  check(plain(report) && report.success===true && Number.isFinite(report.startTime),'INVALID_REPORT');
  const keys=['numTotalTestSuites','numPassedTestSuites','numFailedTestSuites','numPendingTestSuites','numTotalTests','numPassedTests','numFailedTests','numPendingTests','numTodoTests','snapshot','startTime','success','testResults','coverageMap'];
  check(Object.keys(report).every(key=>keys.includes(key)) && plain(report.snapshot) && Number.isInteger(report.numTotalTestSuites) && report.numTotalTestSuites>0 && report.numPassedTestSuites===report.numTotalTestSuites,'UNEXPECTED_REPORT_SCHEMA');
  check(report.startTime>=context.startedAt && report.startTime<=context.now && context.now-context.startedAt<=30*60*1000,'STALE_REPORT');
  for(const key of ['numFailedTests','numFailedTestSuites','numPendingTests','numPendingTestSuites','numTodoTests']) check(report[key]===0,'UNPASSED_REPORT');
  check(Number.isInteger(report.numTotalTests) && report.numTotalTests>0 && report.numPassedTests===report.numTotalTests && Array.isArray(report.testResults) && report.testResults.length>0 && report.testResults.length<=200,'EMPTY_REPORT');
  const result=new Map(),files=new Set(); let count=0;
  for(const file of report.testResults) {
    check(plain(file) && file.status==='passed' && Number.isFinite(file.startTime) && file.startTime>=report.startTime && Number.isFinite(file.endTime) && file.endTime>=file.startTime && file.endTime<=context.now,'INVALID_FILE_RESULT');
    const path=reportPath(file.name,context.root); check(!files.has(path),'DUPLICATE_REPORT_FILE'); files.add(path);
    check(path.startsWith('tests/') && /\.test\.tsx?$/.test(path) && (path.startsWith('tests/integration/')===(suite==='integration')),'REPORT_SUITE_MISMATCH');
    check(Array.isArray(file.assertionResults) && file.assertionResults.length>0 && file.assertionResults.length<=5000,'EMPTY_FILE_RESULT');
    for(const assertion of file.assertionResults) {
      check(plain(assertion) && assertion.status==='passed' && text(assertion.fullName) && text(assertion.title) && Array.isArray(assertion.ancestorTitles) && assertion.ancestorTitles.every(text),'UNPASSED_ASSERTION');
      check(assertion.fullName===[...assertion.ancestorTitles,assertion.title].join(' '),'INVALID_FULL_NAME');
      const identity=`${path}\0${assertion.fullName}`;
      check(!result.has(identity),'DUPLICATE_TEST_IDENTITY'); result.set(identity,assertion); count++;
      check(count<=10000,'TEST_LIMIT');
    }
  }
  check(count===report.numTotalTests,'REPORT_COUNT_MISMATCH');
  return result;
}
export function validateGate(manifest, contents, reports, context, specs = sources, contextPaths=normativeContexts) {
  validateManifest(manifest,contents,specs,contextPaths);
  check(plain(context) && text(context.root) && text(context.runId) && Number.isFinite(context.startedAt) && Number.isFinite(context.now),'INVALID_RUN');
  const indices=Object.fromEntries(['unit','integration','timezone'].map(suite=>[suite,reportIndex(reports[suite],suite,context)]));
  for(const ref of Object.values(manifest.tests)) check(indices[ref.suite].has(`${ref.path}\0${ref.name}`),'TEST_NOT_EXECUTED');
  const utc=[...indices.unit.keys()].filter(key=>manifest.timezoneFiles.includes(key.split('\0')[0])).sort();
  const la=[...indices.timezone.keys()].sort();
  check(utc.length>0 && utc.length===la.length && utc.every((key,i)=>key===la[i]),'TIMEZONE_IDENTITY_MISMATCH');
  for(const file of manifest.timezoneFiles) check(utc.some(key=>key.startsWith(`${file}\0`)),'MISSING_TIMEZONE_FILE');
  return {scenarios:manifest.scenarios.length,dispositions:Object.fromEntries(['required','partial','deferred'].map(d=>[d,manifest.scenarios.filter(e=>e.disposition===d).length])),obligations:manifest.scenarios.reduce((n,e)=>n+e.obligations.length,0),references:Object.keys(manifest.tests).length,unit:indices.unit.size,integration:indices.integration.size,timezone:la.length};
}

export function validateReceipt(context, receipt, digest) {
  check(plain(context) && plain(receipt) && text(context.runId) && receipt.runId===context.runId && /^[a-f0-9]{64}$/.test(digest) && receipt.digest===digest,'MISMATCHED_REPORT_EVIDENCE');
}

function readJson(path) {
  check(statSync(path).isFile() && statSync(path).size<=LIMIT,'FILE_LIMIT');
  try { return JSON.parse(readFileSync(path,'utf8')); } catch { fail('INVALID_JSON'); }
}
function within(root,path) {
  repoPath(path); const target=realpathSync(resolve(root,path));
  check(!relative(realpathSync(root),target).split(sep).includes('..'),'PATH_ESCAPE'); return target;
}
function loadSources(root) {
  let bytes=0;
  return Object.fromEntries([...sources.map(s=>s.path),...normativeContexts].map(path=>{
    const file=within(root,path),size=statSync(file).size; bytes+=size;
    check(size<=LIMIT && bytes<=4*LIMIT,'CONTEXT_LIMIT');
    return [path,readFileSync(file,'utf8')];
  }));
}
function fingerprint(root) {
  const files=[];
  let visited=0;
  function visit(dir) { for(const e of readdirSync(resolve(root,dir),{withFileTypes:true})) { check(++visited<=5000,'SOURCE_LIMIT'); const p=`${dir}/${e.name}`; if(e.isDirectory()) visit(p); else if(/\.(?:mjs|ts|tsx|json|md|yml)$/.test(p)) files.push(p); } }
  for(const dir of ['src','tests','drizzle','scripts']) visit(dir);
  files.push('package.json','pnpm-lock.yaml','vitest.config.ts','vitest.integration.config.ts','.github/workflows/ci.yml',...normativeContexts);
  check(files.length<=3000,'SOURCE_LIMIT');
  let bytes=0;
  return hash([...new Set(files)].sort().map(p=>{
    const file=within(root,p),size=statSync(file).size; bytes+=size;
    check(size<=LIMIT && bytes<=4*LIMIT,'SOURCE_LIMIT');
    return `${p}:${hash(readFileSync(file))}`;
  }).join('\n'));
}

/** CLI returns an exit status; adversarial unit fixtures call pure validators instead of nested processes. */
export function cli(args, root=process.cwd()) {
  try {
    check(args.length>=2 && args.length<=4,'INVALID_ARGUMENTS');
    const [mode,dir,suite]=args; const directory=resolve(dir),runFile=resolve(directory,'run.json');
    check(args.length===(mode==='record'?3:2),'INVALID_ARGUMENTS');
    const manifest=readJson(within(root,'tests/finance/coverage.json'));
    validateManifest(manifest,loadSources(root));
    for(const ref of [...Object.values(manifest.tests),...manifest.typecheck]) within(root,ref.path);
    if(mode==='init') {
      mkdirSync(directory,{recursive:true});
      writeFileSync(runFile,JSON.stringify({runId:randomUUID(),startedAt:Date.now(),root:realpathSync(root).replaceAll('\\','/'),fingerprint:fingerprint(root),job:process.env.GITHUB_RUN_ID?`${process.env.GITHUB_RUN_ID}/${process.env.GITHUB_RUN_ATTEMPT}/${process.env.GITHUB_JOB}`:'local'}),{flag:'wx'});
      return 0;
    }
    const context=readJson(runFile);context.now=Date.now();
    check(context.root===realpathSync(root).replaceAll('\\','/') && context.fingerprint===fingerprint(root),'MISMATCHED_RUN');
    check(context.job===(process.env.GITHUB_RUN_ID?`${process.env.GITHUB_RUN_ID}/${process.env.GITHUB_RUN_ATTEMPT}/${process.env.GITHUB_JOB}`:'local'),'MISMATCHED_JOB');
    if(mode==='timezone') {
      const executable=resolve(root,'node_modules/vitest/vitest.mjs');
      const result=spawnSync(process.execPath,[executable,'run',...manifest.timezoneFiles,'--reporter=default','--reporter=json',`--outputFile.json=${resolve(directory,'timezone.json')}`],{cwd:root,env:{...process.env,TZ:'America/Los_Angeles'},stdio:'inherit'});
      return result.status??1;
    }
    if(mode==='record') {
      check(['unit','integration','timezone'].includes(suite),'INVALID_SUITE');
      if(suite!=='integration') check(process.env.TZ===(suite==='unit'?'UTC':'America/Los_Angeles'),'MISMATCHED_TIMEZONE');
      const file=resolve(directory,`${suite}.json`),report=readJson(file);
      reportIndex(report,suite,context);
      check(statSync(file).mtimeMs>=context.startedAt,'STALE_REPORT_FILE');
      writeFileSync(resolve(directory,`${suite}.receipt.json`),JSON.stringify({runId:context.runId,digest:hash(readFileSync(file))}),{flag:'wx'});
      return 0;
    }
    check(mode==='check' && !suite,'INVALID_ARGUMENTS');
    const reports={};
    for(const key of ['unit','integration','timezone']) {
      const file=resolve(directory,`${key}.json`),receipt=readJson(resolve(directory,`${key}.receipt.json`));
      validateReceipt(context,receipt,hash(readFileSync(file)));
      reports[key]=readJson(file);
    }
    const summary=validateGate(manifest,loadSources(root),reports,context);
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    return 0;
  } catch {
    process.stderr.write('HB015_GATE_REJECTED (manifest, current-run evidence or executed assertions invalid)\n');
    return 1;
  }
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) process.exitCode=cli(process.argv.slice(2));
