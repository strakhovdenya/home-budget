# HB-019.1 documentation alignment — 2026-11-08

**Status:** documentation prepared for independent review; HB-019.1 remains Planned.
Owner reports independent ChatGPT APPROVED of the audit plan and approves four
scope decisions; that is not approval or runtime testing of these resulting edits.
See [D46–D49](../DECISIONS.md#saved-financial-history-and-evidence-scope--2026-11-08).

## Changed scope

Product principle is routed through AGENTS/PRD/BR and synchronized with UX/PRODUCT,
ROADMAP/IMPLEMENTATION_PLAN/TASKS and human/machine architecture/data-model docs.
Original Accepted ADR0001–0003 and old decision/evidence records remain unchanged.
HB-019.2 Planned P0 owns HBH-001–007; HBUX-001–036 and HB20 oracles stay with
their existing tasks. HB-019.2/HB-020 independently follow HB-019.1, both before
HB-021. [History plan](hb-019-2-financial-history.md) and
[fingerprint follow-up](finance-fingerprint-follow-up.md) record remaining design.

HBH-001 complete index beyond ten;002 as-known/corrected knowledge;003 immutable
report perspective;004 UNKNOWN/zero/gaps;005 funding/payment lineage;006 owned
bounded consistent pages;007 multilingual accessible browser navigation.
FPG-001–014 are future gate-regression specifications, not executable tests or PASS.

## Exact documentary validation commands

Commands run at repository root in PowerShell. No dependencies, env files, database,
OAuth, network, build, Vitest or browser are accessed. The following read-only Node
body is executed by the PowerShell command below; it contains assertions about
documentation and permitted scope only. It is not an application test suite.

```powershell
git diff --check
git diff --cached --stat
git status --short
```

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$report = Get-Content -Raw -Encoding UTF8 docs/planning/hb-019-1-documentation-alignment-verification.md
$body = [regex]::Match($report, '(?s)```javascript\r?\n(.*?)\r?\n```').Groups[1].Value
$body | node --input-type=module
```

```javascript
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { validateManifest } from './scripts/check-finance-coverage.mjs';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const read = p => fs.readFileSync(p, 'utf8').replaceAll('\r\n', '\n');
const before = p => execFileSync('git', ['show', `HEAD:${p}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replaceAll('\r\n', '\n');
const tracked = git('diff', '--name-only').split('\n').filter(Boolean);
const added = git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean);
const changed = [...tracked, ...added];
assert(changed.every(p => p === 'AGENTS.md' || /^docs\/.*\.(md|json)$/.test(p) || /^tests\/scenarios\/.*\.md$/.test(p)));
assert.equal(git('diff', '--cached', '--name-only'), '');
for (const p of ['docs/adr/0001-checkpoints-and-allocations.md', 'docs/adr/0002-month-closing-and-corrections.md', 'docs/adr/0003-daily-forecast-and-liquidity.md', 'scripts/check-finance-coverage.mjs', 'tests/finance/coverage.json']) assert.equal(read(p), before(p));
const decisions = read('docs/DECISIONS.md'), oldDecisions = before('docs/DECISIONS.md');
const retained = '## HB-019.1 budget-update UX';
assert.equal(decisions.slice(decisions.indexOf(retained)), oldDecisions.slice(oldDecisions.indexOf(retained)));
for (const id of ['D46', 'D47', 'D48', 'D49']) assert.equal([...decisions.matchAll(new RegExp(`^- \\*\\*${id} `, 'gm'))].length, 1);
const tasks = read('docs/TASKS.md');
const sections = new Map([...tasks.matchAll(/^### (HB-\d+(?:\.\d+)?) .*\n([\s\S]*?)(?=^### |^## |$(?![\s\S]))/gm)].map(m => [m[1], m[2]]));
assert.match(sections.get('HB-019.2'), /^\*\*Status:\*\* Planned .*\*\*Priority:\*\* P0/m);
assert.match(sections.get('HB-019.2').split('\n')[0], /HB-019\.1/);
assert.match(sections.get('HB-020').split('\n')[0], /HB-019\.1/);
assert(!sections.get('HB-020').split('\n')[0].includes('HB-019.2'));
assert.match(sections.get('HB-021').split('\n')[0], /HB-019\.2/);
assert.match(sections.get('HB-021').split('\n')[0], /HB-016\.\.HB-020/);
for (const m of before('docs/TASKS.md').matchAll(/^### (HB-\d+(?:\.\d+)?) .*\n\*\*Status:\*\* ([A-Za-z ]+)/gm)) assert.equal(sections.get(m[1]).match(/^\*\*Status:\*\* ([A-Za-z ]+)/m)[1].trim(), m[2].trim());
const hbu = 'tests/scenarios/phase-01/hb-019-1-budget-update-ux.md';
const rows = s => s.match(/^\| HBUX-\d{3} \|.*$/gm);
assert.deepEqual(rows(read(hbu)), rows(before(hbu)));
assert.equal(read(hbu).slice(read(hbu).indexOf('### HBUX-033')), before(hbu).slice(before(hbu).indexOf('### HBUX-033')));
const hb20 = 'tests/scenarios/phase-01/hb-020-first-run-and-recurring-templates.md';
assert.equal(read(hb20).split('## Shared fixture and proof rules')[1], before(hb20).split('## Shared fixture and proof rules')[1]);
const historyIds = [...read('tests/scenarios/phase-01/hb-019-2-financial-history.md').matchAll(/^## (HBH-\d{3}) /gm)].map(m => m[1]);
assert.deepEqual(historyIds, Array.from({ length: 7 }, (_, i) => `HBH-${String(i + 1).padStart(3, '0')}`));
const gateIds = [...read('docs/planning/finance-fingerprint-follow-up.md').matchAll(/^\| (FPG-\d{3}) \|/gm)].map(m => m[1]);
assert.equal(new Set(gateIds).size, 14);
const architecture = JSON.parse(read('docs/architecture.json'));
assert.deepEqual(architecture.layers, JSON.parse(before('docs/architecture.json')).layers);
assert.equal(architecture.hb0192_history_planning.status, 'Planned_owner_D46_D48_2026_11_08_not_implemented');
const smoke = read('scripts/check_agent_docs.py');
const literals = name => [...smoke.match(new RegExp(`${name} = \\[([\\s\\S]*?)\\]`))[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
const required = literals('REQUIRED'), skills = literals('SKILLS');
for (const p of required) assert(fs.existsSync(p), p);
for (const name of skills) { const s = read(`.agents/skills/${name}/SKILL.md`); assert(s.startsWith('---\n')); assert(s.includes(`name: ${name}\n`)); assert.match(s, /^description:\s*\S+/m); }
assert.deepEqual(architecture.layers.map(l => l.name).sort(), ['domain', 'features', 'infrastructure', 'app', 'shared-pure', 'shared-ui', 'shared-i18n'].sort());
const slug = s => s.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}_\- ]/gu, '').replaceAll(' ', '-');
const anchors = s => { const counts = new Map(); return new Set([...s.matchAll(/^#{1,6} (.+)$/gm)].map(m => { const v = slug(m[1]); const n = counts.get(v) ?? 0; counts.set(v, n + 1); return n ? `${v}-${n}` : v; })); };
let links = 0, legacy = 0;
const broken = (p, s, count) => { const bad = new Set(); for (const m of s.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) { let href = m[1].replace(/^<|>$/g, ''); if (/^[a-z]+:/i.test(href)) continue; href = decodeURIComponent(href); const [file, anchor] = href.split('#'); const target = file ? path.resolve(path.dirname(p), file) : path.resolve(p); if (count) links++; if (!fs.existsSync(target) || (anchor && target.endsWith('.md') && !anchors(read(target)).has(anchor))) bad.add(`${p} -> ${href}`); } return bad; };
for (const p of changed.filter(p => p.endsWith('.md'))) {
  const current = read(p); assert(!current.includes('\uFFFD'), `UTF8 ${p}`);
  assert(!/D\d+\?D\d+|\?{3,}/.test(current), `damaged text ${p}`);
  const oldBad = tracked.includes(p) ? broken(p, before(p), false) : new Set();
  for (const b of broken(p, current, true)) { if (oldBad.has(b)) legacy++; else throw Error(b); }
}
const manifest = JSON.parse(read('tests/finance/coverage.json'));
const contents = Object.fromEntries(manifest.contexts.map(c => [c.path, fs.readFileSync(c.path, 'utf8')]));
const stale = manifest.contexts.filter(c => createHash('sha256').update(contents[c.path].replaceAll('\r\n', '\n')).digest('hex') !== c.sha256).map(c => c.path);
assert(stale.length > 0);
assert.throws(() => validateManifest(manifest, contents), /NORMATIVE_CONTEXT_MISMATCH/);
console.log(JSON.stringify({ changedFiles: changed.length, localLinksChecked: links, newBrokenLinks: 0, retainedLegacyBrokenLinks: legacy, smoke: { coreFiles: required.length, skills: skills.length, layers: architecture.layers.length }, HBUX: 36, HBH: historyIds.length, FPG: gateIds.length, previousOraclesStatusesADRsAndLayers: 'unchanged', manifest: 'expected NORMATIVE_CONTEXT_MISMATCH; not runtime PASS', staleContexts: stale }, null, 2));
```

## Results and limits

Executed from `D:/projects_js/home-budget` with Node v22.23.0:

| Check | Actual result |
|---|---|
| `git diff --check` | exit0; no whitespace errors |
| Document validator command/body above | exit0;20 changed/new documentation files,230 local links,0 broken links |
| Node equivalent of inspected bootstrap checker |22 required core files,10 skill frontmatters,7 expected architecture layers verified; Python script itself was not executed |
| Scope and chronology assertions | All existing task status words, original decision-log suffix, ADR0001–0003, finance checker/manifest and architecture layers unchanged |
| Scenario assertions | HBUX-001–036 original oracles retained; HB20 shared fixture and scenario bodies unchanged;7 unique HBH scenarios and14 future FPG specifications |
| Dependencies | HB-019.2 and HB-020 both depend on HB-019.1; HB-020 does not depend on HB-019.2; HB-021 requires both plus fingerprint stage |
| `validateManifest()` within document validator | Expected `NORMATIVE_CONTEXT_MISMATCH` observed and asserted;9 stale contexts, no runtime finance PASS |
| `git diff --cached --stat` / index assertion | Empty index; no staging or commit |

The first validator attempt exited1 with `spawnSync git ENOBUFS` when reading the
large unchanged coverage manifest using Node's default child-output buffer. The
documentary validator's read buffer was raised to16MiB; the final command above
then exited0. No application limit or test assertion was changed. Intermediate
editing checks also caught/corrected PowerShell pipe encoding; the final check
uses explicit UTF-8 and rejects replacement characters/damaged decision ranges.
Git printed an advisory about the inaccessible global ignore file; status and
diff commands completed. No elevated access or global configuration change used.

Stale contexts: BUSINESS_RULES, DECISIONS, ARCHITECTURE, architecture.json,
DATA_MODEL, PRD, TASKS, OPEN_QUESTIONS and IMPLEMENTATION_PLAN under docs/.
Current normative hashes
are deliberately not refreshed: coverage.json, checker, test code, SQL and runtime
files are outside this stage. A stale normative-context refusal is expected and
must not be called a passing finance gate. Old HB-019 receipts/PASS remain archival.

Remaining implementation gates: Q-HB192-01 complete indexing/cursor/resource design,
Q-HB192-02 unambiguous H/K interaction, D49 SQL fingerprint protection and fresh
evidence regression. HB19-Q07 remains OPEN / NOT REPRODUCED. No new runtime proof
or independent review of this documentation diff is claimed. No commit/publication.

## Owner Acceptance of documentation — 2026-11-08

The owner reports independent ChatGPT APPROVED 0/0/0/0 for these20 documents
and accepts this stage. Later separately authorized implementation changes the
working tree and gate; the documentary commands/results above remain their
original evidence, not a claim they pass against the implementation candidate.
HB-019.1 as a whole remains Review pending independent implementation review and
separate Owner Acceptance. ADRs and prior evidence remain preserved.
