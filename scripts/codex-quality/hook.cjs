const fs = require('node:fs');
const path = require('node:path');
const {
  captureBaseline,
  changedSources,
  digest,
  git,
  loadBaseline,
  sessionDirectory
} = require('./scope.cjs');
const { checkChanges } = require('./lint.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const SKILLS = [
  '.agents/skills/clean-code-ts-react/SKILL.md',
  '.agents/skills/code-simplifier/SKILL.md'
];
const EVENTS = ['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop'];

function readSkills() {
  return SKILLS.map(file => {
    const bytes = fs.readFileSync(path.join(ROOT, file));

    if (bytes.length === 0 || bytes.length > 32_768) {
      throw new Error(`Missing or oversized required skill: ${file}`);
    }

    return { file, sha256: digest(bytes), content: bytes.toString('utf8') };
  });
}

function contextOutput(event, context) {
  return {
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: context
    }
  };
}

function failureOutput(event, reason) {
  if (event === 'PreToolUse') {
    return {
      hookSpecificOutput: {
        hookEventName: event,
        permissionDecision: 'deny',
        permissionDecisionReason: reason
      }
    };
  }

  if (event === 'SessionStart') {
    return { continue: false, stopReason: reason, systemMessage: reason };
  }

  return { decision: 'block', reason };
}

async function run(input) {
  const event = input.hook_event_name;

  if (!EVENTS.includes(event) || typeof input.session_id !== 'string' || !input.session_id) {
    throw new Error('Invalid lifecycle event or missing session id.');
  }

  if (typeof input.cwd !== 'string') {
    throw new Error('Missing session working directory.');
  }

  const actualRoot = git(input.cwd, ['rev-parse', '--show-toplevel']).trim();

  if (fs.realpathSync(actualRoot) !== fs.realpathSync(ROOT)) {
    throw new Error('Hook command and session belong to different repositories.');
  }

  const directory = sessionDirectory(ROOT, input.session_id);
  const skills = readSkills();

  if (event === 'SessionStart') {
    if (!fs.existsSync(path.join(directory, 'baseline.json'))) {
      if (!['startup', 'fork', 'clear'].includes(input.source)) {
        throw new Error('Original baseline unavailable on resume/compact. Start a fresh trusted session.');
      }

      captureBaseline(ROOT, directory);
    } else {
      loadBaseline(ROOT, directory);
    }

    fs.writeFileSync(path.join(directory, 'skills.json'), JSON.stringify(
      skills.map(({ file, sha256 }) => ({ file, sha256 }))
    ));
    const context = skills.map(skill => (
      `\n## Required skill: ${skill.file}\nSHA-256: ${skill.sha256}\n\n${skill.content}`
    )).join('\n');

    return contextOutput(event,
      'Apply both skills to newly/directly edited TS/TSX only. Preserve dirty work and all behavior. '
      + 'Do not refactor neighboring code or protected tests. Mechanical rules do not prove subjective quality.\n'
      + context
    );
  }

  const baseline = loadBaseline(ROOT, directory);
  const loadedSkills = JSON.parse(fs.readFileSync(path.join(directory, 'skills.json'), 'utf8'));
  const currentSkills = skills.map(({ file, sha256 }) => ({ file, sha256 }));

  if (JSON.stringify(currentSkills) !== JSON.stringify(loadedSkills)) {
    throw new Error('Required skills changed after loading. Resume the session to reload actual contents.');
  }

  if (event === 'PreToolUse') {
    return contextOutput(event,
      'TS/TSX edits must follow the loaded clean-code-ts-react and code-simplifier skills: '
      + 'multiline braces and one statement per line. Preserve scope/behavior; no auto-fix. '
      + 'PostToolUse checks actual disk changes; Stop reruns the changed-code gate.'
    );
  }

  const changes = changedSources(ROOT, directory, baseline);
  const result = await checkChanges(ROOT, changes);
  const afterCheck = changedSources(ROOT, directory, baseline);
  const checkedHashes = changes.map(({ file, hash }) => ({ file, hash }));
  const currentHashes = afterCheck.map(({ file, hash }) => ({ file, hash }));

  if (JSON.stringify(checkedHashes) !== JSON.stringify(currentHashes)) {
    throw new Error('Source changed during the quality check. Rerun the gate on the current files.');
  }

  const receipt = {
    event,
    ...result,
    checked: ['curly', 'brace-style', 'max-statements-per-line'],
    notChecked: ['typecheck', 'tests', 'subjective skill compliance'],
    sourceHashes: changes.map(({ file, hash, ranges }) => ({ file, hash, ranges }))
  };
  fs.writeFileSync(path.join(directory, `${event}.json`), JSON.stringify(receipt, null, 2));

  if (result.status === 'FAIL') {
    const diagnostics = result.findings.map(item => (
      `${item.file}:${item.line}:${item.column} [${item.rule}] ${item.message} Fix: ${item.instruction}`
    ));

    return failureOutput(event,
      'Changed-code readability gate FAILED. Fix only the new/directly edited code; do not use --fix.\n'
      + diagnostics.join('\n')
    );
  }

  const summary = `Changed-code readability: ${result.status}; checked ${result.files} TS/TSX files. `
    + 'Typecheck, tests and subjective review are NOT EXECUTED by this gate.';

  if (event === 'PostToolUse') {
    return contextOutput(event, summary);
  }

  return { systemMessage: summary };
}

async function main() {
  let input;

  try {
    let raw = '';

    for await (const chunk of process.stdin) {
      raw += chunk;

      if (Buffer.byteLength(raw) > 1_048_576) {
        throw new Error('Hook input exceeds 1 MiB.');
      }
    }

    input = JSON.parse(raw);
    const result = await run(input);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    let message = 'Unexpected checker failure.';

    if (error instanceof Error) {
      message = error.message;
    }

    let reason = `Quality gate NOT EXECUTED: ${message}`;

    if (input && typeof input.session_id === 'string' && EVENTS.includes(input.hook_event_name)) {
      const directory = sessionDirectory(ROOT, input.session_id);

      if (fs.existsSync(directory)) {
        try {
          fs.writeFileSync(path.join(directory, `${input.hook_event_name}.json`), JSON.stringify({
            event: input.hook_event_name,
            status: 'NOT_EXECUTED',
            reason
          }, null, 2));
        } catch {
          reason += ' Could not update the local check receipt.';
        }
      }
    }

    if (input && EVENTS.includes(input.hook_event_name)) {
      process.stdout.write(`${JSON.stringify(failureOutput(input.hook_event_name, reason))}\n`);
    } else {
      process.stderr.write(`${reason}\n`);
      process.exitCode = 2;
    }
  }
}

void main();
