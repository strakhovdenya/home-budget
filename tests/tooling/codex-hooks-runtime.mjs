import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import readline from 'node:readline';

const binary = process.env.HB_CODEX_RUNTIME_BINARY;

if (!binary) {
  throw new Error('Set HB_CODEX_RUNTIME_BINARY to the reviewed installed Codex executable.');
}

const evidenceRoot = path.resolve('tmp/code-quality-hooks-review/native-runtime');
fs.mkdirSync(evidenceRoot, { recursive: true });
const root = fs.mkdtempSync(path.join(evidenceRoot, 'run-'));
const project = path.join(root, 'project with spaces');
const home = path.join(root, 'isolated-home');
fs.mkdirSync(project, { recursive: true });
fs.mkdirSync(home, { recursive: true });
const initialized = spawnSync('git', ['init', '--quiet', project], { encoding: 'utf8' });
assert.equal(initialized.status, 0);

for (const file of [
  'scripts/codex-quality/hook.cjs',
  'scripts/codex-quality/scope.cjs',
  'scripts/codex-quality/lint.cjs',
  '.agents/skills/clean-code-ts-react/SKILL.md',
  '.agents/skills/code-simplifier/SKILL.md'
]) {
  const target = path.join(project, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(file, target);
}

fs.mkdirSync(path.join(project, '.codex'), { recursive: true });
fs.copyFileSync('scripts/codex-quality/hooks.json', path.join(project, '.codex', 'hooks.json'));
fs.writeFileSync(path.join(project, '.gitignore'), 'tmp/\nnode_modules/\n');
fs.writeFileSync(path.join(project, 'sample.ts'), 'export const initial = 1;\n');
let modelRequests = 0;
const requests = [];
const expectedCommands = new Set();
const provider = http.createServer(async (request, response) => {
  let body = '';

  for await (const chunk of request) {
    body += chunk;
  }

  const parsed = JSON.parse(body);
  requests.push(parsed);
  const step = modelRequests++;
  let item;

  if (step === 0 || step === 2) {
    let source = 'if (true) console.log(1);\n';

    if (step === 2) {
      source = 'if (true) {\n  console.log(1);\n}\n';
    }

    const encoded = Buffer.from(source).toString('base64');
    const command = `node -e "require('fs').writeFileSync('sample.ts',Buffer.from('${encoded}','base64'))"`;
    expectedCommands.add(command);
    item = {
      type: 'function_call',
      id: `fc_${step}`,
      call_id: `call_${step}`,
      name: 'exec_command',
      arguments: JSON.stringify({
        cmd: command,
        sandbox_permissions: 'require_escalated',
        justification: 'Write only the owned synthetic hook test sample.'
      })
    };
  } else {
    item = {
      type: 'message',
      id: `msg_${step}`,
      role: 'assistant',
      status: 'completed',
      content: [{ type: 'output_text', text: `Synthetic completion ${step}` }]
    };
  }

  response.writeHead(200, { 'Content-Type': 'text/event-stream' });

  for (const event of [
    { type: 'response.created', response: { id: `resp_${step}` } },
    { type: 'response.output_item.done', output_index: 0, item },
    {
      type: 'response.completed',
      response: { id: `resp_${step}`, status: 'completed', output: [item] }
    }
  ]) {
    response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  }

  response.end();
});
await new Promise(resolve => provider.listen(0, '127.0.0.1', resolve));
const port = provider.address().port;
fs.writeFileSync(path.join(home, 'config.toml'), [
  'check_for_update_on_startup = false',
  'model_provider = "quality_fixture"',
  'model = "fixture"',
  '[model_providers.quality_fixture]',
  'name = "Owned offline hook test"',
  `base_url = "http://127.0.0.1:${port}/v1"`,
  'wire_api = "responses"',
  'requires_openai_auth = false',
  'request_max_retries = 0',
  'stream_max_retries = 0',
  `[projects.${JSON.stringify(project)}]`,
  'trust_level = "trusted"',
  ''
].join('\n'));

const child = spawn(binary, ['app-server', '--stdio'], {
  cwd: project,
  env: { ...process.env, CODEX_HOME: home },
  windowsHide: true,
  stdio: ['pipe', 'pipe', 'pipe']
});
const pending = new Map();
const events = [];
let stderr = '';
let nextId = 0;
let approvalFailure;
child.stderr.on('data', chunk => {
  stderr += chunk;
});

const reader = readline.createInterface({ input: child.stdout });
reader.on('line', line => {
  const message = JSON.parse(line);

  if (message.method === 'item/commandExecution/requestApproval') {
    const wireCommand = JSON.stringify(message.params.command);
    const matchesFixture = [...expectedCommands].some(command => {
      const encoded = command.match(/Buffer\.from\('([^']+)'/)[1];
      return wireCommand.includes(encoded) && wireCommand.includes('sample.ts');
    });
    const approved = path.resolve(message.params.cwd) === project && matchesFixture;

    if (!approved) {
      approvalFailure = new Error('Unexpected command in the owned fixture approval request.');
    }

    child.stdin.write(`${JSON.stringify({
      jsonrpc: '2.0',
      id: message.id,
      result: { decision: approved ? 'accept' : 'decline' }
    })}\n`);
    events.push({ method: 'ownedFixtureCommandApproved' });
    return;
  }

  const request = pending.get(message.id);

  if (request) {
    pending.delete(message.id);

    if (message.error) {
      request.reject(new Error(JSON.stringify(message.error)));
    } else {
      request.resolve(message.result);
    }
  } else {
    events.push(message);
  }
});

function request(method, params) {
  const id = ++nextId;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Native Codex timed out: ${method}`));
    }, 20_000);
    pending.set(id, {
      resolve(value) {
        clearTimeout(timer);
        resolve(value);
      },
      reject(error) {
        clearTimeout(timer);
        reject(error);
      }
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}

try {
  const version = spawnSync(binary, ['--version'], { encoding: 'utf8' });
  const initialize = await request('initialize', {
    clientInfo: { name: 'home-budget-quality-hook-test', version: '1' },
    capabilities: { experimentalApi: true }
  });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'initialized' })}\n`);
  const before = await request('hooks/list', { cwds: [project] });
  fs.writeFileSync(path.join(root, 'untrusted.json'), JSON.stringify(before, null, 2));
  const hooks = before.data.flatMap(entry => entry.hooks);
  assert.equal(hooks.length, 4);
  assert.ok(hooks.every(hook => hook.trustStatus === 'untrusted'));
  assert.deepEqual(new Set(hooks.map(hook => hook.eventName)), new Set([
    'sessionStart', 'preToolUse', 'postToolUse', 'stop'
  ]));

  // Review/trust only this owned disposable fixture, through the same config API as /hooks.
  const trust = await request('config/batchWrite', {
    edits: hooks.map(hook => ({
      keyPath: `hooks.state.${JSON.stringify(hook.key)}.trusted_hash`,
      value: hook.currentHash,
      mergeStrategy: 'upsert'
    })),
    filePath: null,
    expectedVersion: null,
    reloadUserConfig: true
  });
  const after = await request('hooks/list', { cwds: [project] });
  assert.ok(after.data.flatMap(entry => entry.hooks).every(hook => hook.trustStatus === 'trusted'));
  fs.writeFileSync(path.join(root, 'trusted.json'), JSON.stringify(after, null, 2));
  const started = await request('thread/start', {
    cwd: project,
    model: 'fixture',
    modelProvider: 'quality_fixture',
    ephemeral: true,
    approvalPolicy: 'on-request',
    sandbox: 'workspace-write'
  });
  fs.writeFileSync(path.join(root, 'start.json'), JSON.stringify(started, null, 2));
  await request('turn/start', {
    threadId: started.thread.id,
    input: [{ type: 'text', text: 'Synthetic local hook test only.', text_elements: [] }]
  });
  const deadline = Date.now() + 60_000;

  while (!events.some(event => event.method === 'turn/completed')) {
    if (Date.now() > deadline) {
      throw new Error('Native turn did not complete before the offline test deadline.');
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(JSON.stringify({
    version: version.stdout.trim(),
    trust: trust.status,
    modelRequests,
    methods: [...new Set(events.map(event => event.method))]
  }));
  fs.writeFileSync(path.join(root, 'requests.json'), JSON.stringify(requests, null, 2));
  assert.equal(approvalFailure, undefined);
  assert.equal(modelRequests, 4, 'Stop must cause continuation and the synthetic fix before completion.');
  assert.equal(fs.readFileSync(path.join(project, 'sample.ts'), 'utf8'), 'if (true) {\n  console.log(1);\n}\n');
  const completedHooks = events
    .filter(event => event.method === 'hook/completed')
    .map(event => event.params.run);
  assert.deepEqual(new Set(completedHooks.map(hook => hook.eventName)), new Set([
    'sessionStart', 'preToolUse', 'postToolUse', 'stop'
  ]));
  const context = completedHooks
    .filter(hook => hook.eventName === 'sessionStart')
    .flatMap(hook => hook.entries)
    .map(entry => entry.text)
    .join('\n');

  for (const file of [
    '.agents/skills/clean-code-ts-react/SKILL.md',
    '.agents/skills/code-simplifier/SKILL.md'
  ]) {
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(context.includes(content));
    assert.ok(JSON.stringify(requests[0]).includes(JSON.stringify(content).slice(1, -1)),
      'The actual first model request must contain the complete required skill.');
  }

  const stopRuns = completedHooks.filter(hook => hook.eventName === 'stop');
  assert.equal(stopRuns.length, 2);
  assert.ok(stopRuns[0].entries.some(entry => entry.text.includes('[curly]')));
  assert.ok(stopRuns[1].entries.some(entry => entry.text.includes('readability: PASS')));
  const changedConfig = JSON.parse(fs.readFileSync(path.join(project, '.codex/hooks.json'), 'utf8'));
  changedConfig.hooks.Stop[0].hooks[0].command = changedConfig.hooks.Stop[0].hooks[0].command
    .replace('node -e', 'node --no-warnings -e');
  fs.writeFileSync(path.join(project, '.codex/hooks.json'), JSON.stringify(changedConfig));
  const changedTrust = await request('hooks/list', { cwds: [project] });
  assert.equal(changedTrust.data.flatMap(entry => entry.hooks)
    .find(hook => hook.eventName === 'stop').trustStatus, 'modified');
  const summary = {
    version: version.stdout.trim(),
    platform: initialize.platformOs,
    trustBefore: 'untrusted',
    trustAfterReview: 'trusted',
    trustAfterDefinitionChange: 'modified',
    actualEvents: [...new Set(completedHooks.map(hook => hook.eventName))],
    fullSkillsDelivered: true,
    modelRequests,
    stopBlockedBeforeFix: true,
    stopPassedAfterFix: true,
    externalModelCalls: 0,
    nativeResumeAndCompact: 'NOT EXECUTED',
    interactiveSlashHooksUI: 'NOT EXECUTED'
  };
  fs.writeFileSync(path.join(evidenceRoot, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
} finally {
  child.stdin.end();
  child.kill();
  reader.close();
  fs.writeFileSync(path.join(root, 'events.json'), JSON.stringify(events, null, 2));
  fs.writeFileSync(path.join(root, 'stderr.log'), stderr);
  fs.writeFileSync(path.join(evidenceRoot, 'last-run.json'), JSON.stringify({ root }));
  provider.closeAllConnections();
  await new Promise(resolve => provider.close(resolve));
}
