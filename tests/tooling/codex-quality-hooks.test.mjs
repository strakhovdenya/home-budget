import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { digest, sessionDirectory } = require('../../scripts/codex-quality/scope.cjs');
const projectRoot = process.cwd();
const fixtureRoot = path.resolve('tmp/code-quality-hooks-review/unit-fixtures');
fs.mkdirSync(fixtureRoot, { recursive: true });
const skillFiles = [
  '.agents/skills/clean-code-ts-react/SKILL.md',
  '.agents/skills/code-simplifier/SKILL.md'
];

function fixture(initial = {}) {
  const root = fs.mkdtempSync(path.join(fixtureRoot, 'case with spaces-'));
  const initialized = spawnSync('git', ['init', '--quiet', root], { encoding: 'utf8' });
  assert.equal(initialized.status, 0);
  fs.writeFileSync(path.join(root, '.gitignore'), 'tmp/\nnode_modules/\n');

  for (const file of [
    ...skillFiles,
    'scripts/codex-quality/hook.cjs',
    'scripts/codex-quality/scope.cjs',
    'scripts/codex-quality/lint.cjs'
  ]) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(projectRoot, file), target);
  }

  function write(file, source) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
  }

  for (const [file, source] of Object.entries(initial)) {
    write(file, source);
  }

  function invoke(event, extra = {}, environment = {}) {
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/codex-quality/hook.cjs')], {
      cwd: root,
      env: { ...process.env, ...environment },
      input: JSON.stringify({
        session_id: 'owned-test-session',
        cwd: root,
        hook_event_name: event,
        source: 'startup',
        ...extra
      }),
      encoding: 'utf8',
      timeout: 20_000,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  }

  function receipt(event) {
    const directory = sessionDirectory(root, 'owned-test-session');
    return JSON.parse(fs.readFileSync(path.join(directory, `${event}.json`), 'utf8'));
  }

  return { root, write, invoke, receipt };
}

function start(subject) {
  return subject.invoke('SessionStart');
}

test('SessionStart injects the actual complete contents and hashes of both required skills', () => {
  const subject = fixture();
  const result = start(subject);
  assert.equal(result.hookSpecificOutput.hookEventName, 'SessionStart');

  for (const file of skillFiles) {
    const bytes = fs.readFileSync(file);
    assert.ok(result.hookSpecificOutput.additionalContext.includes(bytes.toString('utf8')));
    assert.ok(result.hookSpecificOutput.additionalContext.includes(digest(bytes)));
  }
});

test('PreToolUse gives model context without preventing repair of an existing style violation', () => {
  const subject = fixture();
  start(subject);
  subject.write('repair.ts', 'if (true) console.log(1);\n');
  const result = subject.invoke('PreToolUse', { tool_name: 'apply_patch' });
  assert.ok(result.hookSpecificOutput.additionalContext.includes('code-simplifier'));
  assert.equal(result.hookSpecificOutput.permissionDecision, undefined);
});

test('a new valid TS file passes the fresh Stop check', () => {
  const subject = fixture();
  start(subject);
  subject.write('valid.ts', 'if (true) {\n  console.log(1);\n}\n');
  const result = subject.invoke('Stop');
  assert.equal(result.decision, undefined);
  assert.equal(subject.receipt('Stop').status, 'PASS');
  assert.equal(subject.receipt('Stop').files, 1);
});

test('a new valid TSX file is parsed and checked as TSX', () => {
  const subject = fixture();
  start(subject);
  subject.write('view.tsx', 'export function View() {\n  return <button type="button">Run</button>;\n}\n');
  subject.invoke('Stop');
  assert.equal(subject.receipt('Stop').status, 'PASS');
});

test('curly reports the exact changed file, line, rule and repair instruction', () => {
  const subject = fixture();
  start(subject);
  subject.write('bad.ts', 'const ready = true;\nif (ready) console.log(1);\n');
  const result = subject.invoke('PostToolUse');
  assert.equal(result.decision, 'block');
  assert.match(result.reason, /bad\.ts:2:\d+ \[curly\]/);
  assert.match(result.reason, /Fix: Add braces/);
});

test('brace-style rejects a single-line TS block', () => {
  const subject = fixture();
  start(subject);
  subject.write('block.ts', 'if (true) { console.log(1); }\n');
  const result = subject.invoke('Stop');
  assert.equal(result.decision, 'block');
  assert.match(result.reason, /\[brace-style\]/);
});

test('max-statements-per-line rejects multiple operations on a changed line', () => {
  const subject = fixture();
  start(subject);
  subject.write('steps.ts', 'const first = 1; const second = 2;\n');
  assert.match(subject.invoke('Stop').reason, /steps\.ts:1:\d+ \[max-statements-per-line\]/);
});

test('style violations inside TSX handlers are checked', () => {
  const subject = fixture();
  start(subject);
  subject.write('handler.tsx', 'export const view = <button onClick={() => { console.log(1); console.log(2); }}>Run</button>;\n');
  const result = subject.invoke('Stop');
  assert.equal(result.decision, 'block');
  assert.match(result.reason, /handler\.tsx:1:/);
});

test('documentation-only changes are NOT_APPLICABLE, never a fabricated code PASS', () => {
  const subject = fixture({ 'old.ts': 'if (true) console.log(1);\n' });
  start(subject);
  subject.write('notes.md', '# Documentation only\n');
  const result = subject.invoke('Stop');
  assert.match(result.systemMessage, /NOT_APPLICABLE/);
  assert.equal(subject.receipt('Stop').status, 'NOT_APPLICABLE');
});

test('original dirty TS code remains outside the checked scope', () => {
  const subject = fixture({ 'dirty.ts': 'if (true) console.log(1);\n' });
  const before = fs.readFileSync(path.join(subject.root, 'dirty.ts'));
  start(subject);
  subject.write('new.ts', 'export const added = 1;\n');
  subject.invoke('Stop');
  assert.equal(subject.receipt('Stop').status, 'PASS');
  assert.equal(subject.receipt('Stop').files, 1);
  assert.deepEqual(fs.readFileSync(path.join(subject.root, 'dirty.ts')), before);
});

test('only directly edited lines of an originally dirty file are reported', () => {
  const original = 'if (true) console.log(1);\nexport const original = 1;\n';
  const subject = fixture({ 'mixed.ts': original });
  start(subject);
  subject.write('mixed.ts', `${original}const first = 1; const second = 2;\n`);
  const result = subject.invoke('Stop');
  assert.equal(result.decision, 'block');
  assert.ok(subject.receipt('Stop').findings.every(finding => finding.line === 3));
  assert.ok(subject.receipt('Stop').findings.length > 0);
});

test('baseline comparison works for long Windows paths and rejects the actual changed line', () => {
  const subject = fixture({ 'nested/original.ts': 'export const original = 1;\n' });
  start(subject);
  subject.write('nested/original.ts', 'if (true) console.log(1);\n');
  assert.equal(subject.invoke('Stop').decision, 'block');
  assert.deepEqual(subject.receipt('Stop').sourceHashes[0].ranges, [[1, 1]]);
});

for (const source of ['resume', 'compact', 'clear', 'fork']) {
  test(`${source} reloads actual skill text without resetting an existing dirty baseline`, () => {
    const subject = fixture({ 'saved.ts': 'export const original = 1;\n' });
    start(subject);
    subject.write('saved.ts', 'if (true) console.log(1);\n');
    const result = subject.invoke('SessionStart', { source });
    assert.ok(result.hookSpecificOutput.additionalContext.includes(fs.readFileSync(skillFiles[0], 'utf8')));
    assert.equal(subject.invoke('Stop').decision, 'block');
  });
}

test('resume with no original baseline stops rather than adopting unknown prior edits', () => {
  const subject = fixture();
  const result = subject.invoke('SessionStart', { source: 'resume' });
  assert.equal(result.continue, false);
  assert.match(result.stopReason, /NOT EXECUTED/);
});

test('missing skills deny PreToolUse and never claim successful loading', () => {
  const subject = fixture();
  start(subject);
  fs.renameSync(path.join(subject.root, skillFiles[0]), path.join(subject.root, `${skillFiles[0]}.missing`));
  const result = subject.invoke('PreToolUse');
  assert.equal(result.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(result.hookSpecificOutput.permissionDecisionReason, /NOT EXECUTED/);
});

test('missing baseline denies PreToolUse instead of silently resetting the scope', () => {
  const subject = fixture();
  const result = subject.invoke('PreToolUse');
  assert.equal(result.hookSpecificOutput.permissionDecision, 'deny');
});

test('checker failure blocks Stop and invalidates a prior successful receipt', () => {
  const subject = fixture();
  start(subject);
  subject.write('valid.ts', 'export const value = 1;\n');
  subject.invoke('Stop');
  assert.equal(subject.receipt('Stop').status, 'PASS');
  subject.write('scripts/codex-quality/lint.cjs', 'exports.checkChanges = async () => { throw new Error("Synthetic checker failure"); };\n');
  const result = subject.invoke('Stop');
  assert.equal(result.decision, 'block');
  assert.match(result.reason, /NOT EXECUTED.*Synthetic checker failure/);
  assert.equal(subject.receipt('Stop').status, 'NOT_EXECUTED');
});

test('parse failure blocks rather than treating an unverified file as clean', () => {
  const subject = fixture();
  start(subject);
  subject.write('syntax.ts', 'export const = ;\n');
  assert.match(subject.invoke('Stop').reason, /\[parser\]/);
});

test('a concurrent edit during checking invalidates the result instead of reusing PASS', () => {
  const subject = fixture();
  start(subject);
  subject.write('valid.ts', 'export const value = 1;\n');
  subject.write('scripts/codex-quality/lint.cjs', [
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    'exports.checkChanges = async root => {',
    "  fs.writeFileSync(path.join(root, 'valid.ts'), 'if (true) console.log(1);\\n');",
    "  return { status: 'PASS', files: 1, findings: [] };",
    '};',
    ''
  ].join('\n'));
  const result = subject.invoke('Stop');
  assert.equal(result.decision, 'block');
  assert.match(result.reason, /NOT EXECUTED.*Source changed during/);
  assert.equal(subject.receipt('Stop').status, 'NOT_EXECUTED');
});

test('eslint-disable comments cannot suppress the mandatory rules', () => {
  const subject = fixture();
  start(subject);
  subject.write('disabled.ts', '/* eslint-disable */\nif (true) console.log(1);\n');
  assert.equal(subject.invoke('Stop').decision, 'block');
});

test('an already-active Stop hook still blocks unfixed violations', () => {
  const subject = fixture();
  start(subject);
  subject.write('unfixed.ts', 'if (true) console.log(1);\n');
  assert.equal(subject.invoke('Stop').decision, 'block');
  assert.equal(subject.invoke('Stop', { stop_hook_active: true }).decision, 'block');
});

test('PostToolUse never auto-formats or modifies the checked source', () => {
  const subject = fixture();
  start(subject);
  const source = 'if (true) { console.log(1); }\n';
  subject.write('untouched.ts', source);
  subject.invoke('PostToolUse');
  assert.equal(fs.readFileSync(path.join(subject.root, 'untouched.ts'), 'utf8'), source);
});

test('a Git error returning status 1 without hunks cannot become NOT_APPLICABLE or PASS', () => {
  const subject = fixture({ 'changed.ts': 'export const original = 1;\n' });
  start(subject);
  subject.write('changed.ts', 'if (true) console.log(1);\n');
  const preload = path.join(subject.root, 'inject-git-error.cjs');
  fs.writeFileSync(preload, [
    "const cp = require('node:child_process');",
    'const original = cp.spawnSync;',
    'cp.spawnSync = (binary, args, options) => {',
    "  if (binary === 'git' && args.includes('--no-index')) {",
    "    return { status: 1, stdout: '', stderr: 'Synthetic Git failure' };",
    '  }',
    '  return original(binary, args, options);',
    '};',
    ''
  ].join('\n'));
  const result = subject.invoke('Stop', {}, {
    NODE_OPTIONS: `--require="${preload.replaceAll('\\', '/')}"`
  });
  assert.equal(result.decision, 'block');
  assert.match(result.reason, /NOT EXECUTED.*did not return text hunks/);
  assert.equal(subject.receipt('Stop').status, 'NOT_EXECUTED');
});

for (const [label, executable, args] of [
  ['Git Bash', 'C:/Program Files/Git/bin/bash.exe', ['--noprofile', '--norc', '-c']],
  ['Windows PowerShell', 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', ['-NoProfile', '-NonInteractive', '-Command']]
]) {
  test(`${label} runs the exact configured launcher from a directory with spaces`, {
    skip: !fs.existsSync(executable)
  }, () => {
    const subject = fixture();
    const config = JSON.parse(fs.readFileSync('scripts/codex-quality/hooks.json', 'utf8'));
    const command = config.hooks.SessionStart[0].hooks[0].command;
    const result = spawnSync(executable, [...args, command], {
      cwd: subject.root,
      input: JSON.stringify({
        session_id: 'shell-fixture',
        cwd: subject.root,
        hook_event_name: 'SessionStart',
        source: 'startup'
      }),
      encoding: 'utf8',
      timeout: 20_000,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.ok(output.hookSpecificOutput.additionalContext.includes(fs.readFileSync(skillFiles[1], 'utf8')));
  });
}
