import { closingCases, runClosingCases } from './closing-harness';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, writeFile, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
// @ts-expect-error Existing dependency-free gate exports have no TS declarations.
import { normativeContexts, fingerprintRootFiles } from '../check-finance-coverage.mjs';
import { fileURLToPath } from 'node:url';
import { assertNoPublishedPorts, assertOwnedContainer, browserImage, cleanEnvironment, copyTree, labelKey,
  postgresImage, rejectDatabaseOverrides, removeSnapshot, snapshotInventory, type ContainerInspection } from './safety';

const execute = promisify(execFile);
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
type Resource = { kind: 'container' | 'network' | 'volume'; id: string; name: string; removed?: boolean };

export async function run() {
  rejectDatabaseOverrides(process.env);
  const args=process.argv.slice(2),filter=args.find(a=>a.startsWith('--case='))?.slice(7),verify=args.includes('--verify');
  if(args.some(a=>a!=='--verify'&&a!=='--fail-after-database'&&!a.startsWith('--case='))||
    (filter!==undefined&&!filter.split(',').every(part=>closingCases.some(c=>c===part)))||(verify&&filter))throw Error('E2E_UNKNOWN_ARGUMENT');
  const mode=verify?'G-verify':'G-focused';
  const runId = randomBytes(16).toString('hex');
  const name = 'hb21_' + runId, database = 'hb_e2e_' + runId;
  const output = join(root, 'tmp', 'hb021-g-reports', runId);
  await mkdir(output, { recursive: true });
  const workspace = await mkdtemp(join(tmpdir(), 'hb021-' + runId + '-'));
  const snapshot = join(workspace, 'checkout'), dockerConfig = join(workspace, 'docker');
  await mkdir(dockerConfig); await writeFile(join(dockerConfig, 'config.json'), '{}');
  const env = cleanEnvironment(process.env);
  const resources: Resource[] = [], steps: { step: string; exit: number }[] = [];
  const report: Record<string, unknown> = { runId, startedAt:new Date().toISOString(), source: '', steps, resources, status: 'RUNNING',
    output, scope: 'HB21 G offline synthetic templates; Google provider proof NOT EXECUTED' };
  const docker = async (args: string[], input?: string, timeout = 180_000) => {
    // execFile never invokes a shell and never inherits user Docker auth configuration.
    if (input !== undefined) {
      const child = execFile('docker', ['--config', dockerConfig, ...args], { env, timeout, maxBuffer: 8 * 1024 * 1024 });
      child.stdin!.end(input);
      return await new Promise<string>((resolve, reject) => {
        let stdout = '';
        child.stdout!.on('data', b => { stdout += b; });
        child.once('error', () => reject(new Error('E2E_DOCKER_FAILED')));
        child.once('close', code => code === 0 ? resolve(stdout.trim()) : reject(new Error('E2E_DOCKER_FAILED')));
      });
    }
    const result = await execute('docker', ['--config', dockerConfig, ...args], { env, timeout, maxBuffer: 8 * 1024 * 1024 });
    return result.stdout.trim();
  };
  const inspect = async (id: string) => JSON.parse(await docker(['inspect', id]))[0] as ContainerInspection;
  const step = async (title: string, action: () => Promise<unknown>) => {
    try { const value = await action(); steps.push({ step: title, exit: 0 }); console.log(title + ': exit 0'); return value; }
    catch (error) {
      steps.push({ step: title, exit: 1 });
      const failure = error as { stdout?: string; stderr?: string };
      const safe = ((failure.stdout ?? '') + (failure.stderr ?? ''))
        .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[DATABASE_URL_REDACTED]').replace(/(?<![a-f0-9])[a-f0-9]{48}(?![a-f0-9])/gi, '[SYNTHETIC_PASSWORD_REDACTED]');
      if (safe) await writeFile(join(output, title + '.txt'), safe);
      throw new Error(title + '_FAILED', { cause: error });
    }
  };
  const create = async (kind: Resource['kind'], suffix: string, flags: string[]) => {
    const resourceName = name + suffix;
    const base = kind === 'container' ? ['create', '--name', resourceName] : [kind, 'create'];
    const tail = kind === 'container' ? [] : [resourceName];
    const result = await docker([...base, '--label', labelKey + '=' + runId, ...flags, ...tail]);
    const id = kind === 'volume' ? resourceName : result;
    const resource = { kind, id, name: resourceName }; resources.push(resource);
    return resource;
  };
  const remove = async (resource: Resource) => {
    if (resource.removed) return;
    const raw = JSON.parse(await docker([...(resource.kind === 'container' ? [] : [resource.kind]), 'inspect', resource.id]))[0];
    const labels = resource.kind === 'container' ? raw.Config?.Labels : raw.Labels;
    const actualId = resource.kind === 'volume' ? raw.Name : (raw.Id ?? raw.ID);
    if (labels?.[labelKey] !== runId || actualId !== resource.id) throw new Error('E2E_FOREIGN_CLEANUP_REFUSED');
    await docker(resource.kind === 'container' ? ['rm', '--force', '--volumes', resource.id] : [resource.kind, 'rm', resource.id]);
    resource.removed = true;
  };
  let interrupted = false;
  const interrupt = () => { interrupted = true; };
  process.on('SIGINT', interrupt); process.on('SIGTERM', interrupt);
  try {
    const source = await execute('git', ['rev-parse', 'HEAD'], { cwd: root, env });
    report.source = source.stdout.trim();
    report.hostNode = process.version;
    await step('snapshot', async () => {
      await mkdir(snapshot);
      for (const file of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'next.config.ts',
        'tsconfig.json', 'eslint.config.mjs', 'playwright.config.ts', 'vitest.config.ts']) {
        await copyTree(join(root, file), join(snapshot, file));
      }
      for (const directory of ['src', 'drizzle', 'tests/e2e', 'scripts/e2e']) await copyTree(join(root, directory), join(snapshot, directory));
      await copyTree(join(root, 'scripts/db-migrate.ts'), join(snapshot, 'scripts/db-migrate.ts'));
      await copyTree(join(root, 'tests/e2e-harness.test.ts'), join(snapshot, 'tests/e2e-harness.test.ts'));
      // Public assets are optional; absence is distinct from a failed/read-denied copy.
      try { await access(join(root, 'public')); await copyTree(join(root, 'public'), join(snapshot, 'public')); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    });
    // Verification-only clean snapshot; approved A launcher remains byte-identical.
    for (const directory of ['tests', 'scripts']) await copyTree(join(root, directory), join(snapshot, directory));
    for (const file of [...normativeContexts, ...fingerprintRootFiles]) {
      await mkdir(dirname(join(snapshot, file)), { recursive: true });
      await copyTree(join(root, file), join(snapshot, file));
    }
    for(const config of ['playwright.closing.config.ts'])await copyTree(join(root,config),join(snapshot,config));
    report.correctionMode = mode;
    report.scope = 'HB21 G closing '+mode+'; offline synthetic only; actual steps/results authoritative';
    report.verificationDriverSha256 = createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
    const inventory = await snapshotInventory(snapshot);
    await writeFile(join(output, 'source-inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
    report.snapshot = { files: Object.keys(inventory).length,
      sha256: createHash('sha256').update(JSON.stringify(inventory)).digest('hex') };
    const pgImage = JSON.parse(await docker(['image', 'inspect', postgresImage]))[0];
    report.images = { postgres: pgImage.Id };
    const network = await create('network', '_net', ['--internal']);
    const ni = JSON.parse(await docker(['network', 'inspect', network.id]))[0];
    if (ni.Internal !== true) throw new Error('E2E_INTERNAL_NETWORK_REQUIRED');
    const migratorPassword = randomBytes(24).toString('hex');
    const runtimePassword = randomBytes(24).toString('hex');
    if (migratorPassword === runtimePassword) throw new Error('E2E_ROLE_PASSWORD_COLLISION');
    const pg = await create('container', '_pg', ['--network', network.name, '--dns', '127.0.0.1',
      '--tmpfs', '/var/lib/postgresql:rw,nosuid,size=512m',
      '--env', 'POSTGRES_USER=hb_migrator', '--env', 'POSTGRES_DB=' + database,
      '--env', 'POSTGRES_PASSWORD=' + migratorPassword, '--env', 'POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256',
      postgresImage, 'postgres', '-c', 'listen_addresses=127.0.0.1']);
    await docker(['start', pg.id]);
    const expectedPg = { id: pg.id, name: pg.name, runId, imageId: pgImage.Id, network: network.name };
    const checkPg = async () => {
      const info = await inspect(pg.id); assertOwnedContainer(info, expectedPg);
      assertNoPublishedPorts(info);
      const net = JSON.parse(await docker(['network', 'inspect', network.id]))[0];
      if (net.Id !== network.id || net.Internal !== true || net.Labels?.[labelKey] !== runId ||
          Object.keys(net.Containers ?? {}).some(id => id !== pg.id)) throw new Error('E2E_FOREIGN_NETWORK_REFUSED');
      if (!info.State.Running || Object.keys(info.NetworkSettings.Networks).join() !== network.name ||
          !info.Config.Env.includes('POSTGRES_DB=' + database)) throw new Error('E2E_DATABASE_CONTAINER_MISMATCH');
      return { database: 5432, http: 3000, hostPublished: false, namespaceContainer: pg.id };
    };
    report.ports = await checkPg();
    await step('postgres-ready', async () => {
      for (let n = 0; n < 60; n++) {
        try { await docker(['exec', pg.id, 'pg_isready', '-U', 'hb_migrator', '-d', database]); return; } catch { /* bounded readiness only */ }
        await new Promise(r => setTimeout(r, 500));
      }
      throw new Error('E2E_POSTGRES_TIMEOUT');
    });
    if (args.includes('--fail-after-database')) throw new Error('E2E_INJECTED_STARTUP_FAILURE');
    const pwImage = JSON.parse(await docker(['image', 'inspect', browserImage]))[0];
    report.images = { postgres: pgImage.Id, browser: pwImage.Id, browserDigests: pwImage.RepoDigests };
    const volume = await create('volume', '_work', []);
    // Dependency acquisition has no DB namespace, source, secrets or user-config mounts.
    const setup = await create('container', '_install', ['--mount', 'type=volume,src=' + volume.name + ',dst=/work',
      '--workdir', '/work', browserImage, 'sh', '-c', 'npm install --global pnpm@12.16.1 && pnpm install --frozen-lockfile --ignore-scripts']);
    for (const manifest of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) await docker(['cp', join(snapshot, manifest), setup.id + ':/work/' + manifest]);
    await step('isolated-dependency-install', async () => { await docker(['start', '--attach', setup.id], undefined, 600_000); });
    await remove(setup);
    const runner = await create('container', '_runner', ['--network', 'container:' + pg.id,
      '--mount', 'type=volume,src=' + volume.name + ',dst=/work', '--workdir', '/work',
      '--shm-size', '512m', browserImage, 'sleep', 'infinity']);
    await docker(['cp', snapshot + '/.', runner.id + ':/work']);
    await docker(['start', runner.id]);
    assertOwnedContainer(await inspect(runner.id), { id: runner.id, name: runner.name, runId, imageId: pwImage.Id, network: 'container:' + pg.id });
    await step('foreign-container-refusal', async () => {
      let refused = false;
      try { assertOwnedContainer(await inspect(runner.id), expectedPg); } catch { refused = true; }
      if (!refused || !(await inspect(runner.id)).State.Running || !(await inspect(pg.id)).State.Running) {
        throw new Error('E2E_FOREIGN_CONTAINER_GUARD_FAILED');
      }
    });
    const commands: { executable: string; args: string[]; environmentKeys: string[]; exit: number; durationMs: number }[] = [];
    report.commands = commands;
    const node = async (argv: string[], extra: Record<string, string> = {}, timeout = 180_000) => {
      if (interrupted) throw new Error('E2E_INTERRUPTED');
      await checkPg();
      const entries = Object.entries({ NEXT_TELEMETRY_DISABLED: '1', TZ: 'Europe/Berlin', ...extra });
      const started=Date.now();
      // Only code/paths and key names are recorded: all credentials stay in env.
      try {
        const value=await docker(['exec', ...entries.flatMap(([k, v]) => ['--env', k + '=' + v]), runner.id, 'node', ...argv], undefined, timeout);
        commands.push({executable:'node',args:argv,environmentKeys:entries.map(([key])=>key).sort(),exit:0,durationMs:Date.now()-started});return value;
      } catch(error) {
        const code=(error as {code?:unknown}).code;
        commands.push({executable:'node',args:argv,environmentKeys:entries.map(([key])=>key).sort(),exit:typeof code==='number'?code:1,durationMs:Date.now()-started});throw error;
      }
    };
    report.runtimeVersions = await node(['-e', "console.log(JSON.stringify({node:process.version,pnpm:require('./package.json').packageManager,playwright:require('@playwright/test/package.json').version,next:require('next/package.json').version}))"]);
    await step('internal-network-no-default-route', () => node(['-e', "const s=require('fs').readFileSync('/proc/net/route','utf8');if(s.split('\\n').slice(1).some(l=>l.trim().split(/\\s+/)[1]==='00000000'))process.exit(1)"]));
    const dbEnv = (user: 'hb_migrator' | 'hb_runtime') => {
      const rolePassword = user === 'hb_migrator' ? migratorPassword : runtimePassword;
      const url = 'postgresql://' + user + ':' + rolePassword + '@127.0.0.1:5432/' + database;
      return { DATABASE_URL: url, DATABASE_URL_UNPOOLED: url, TEST_DATABASE_URL: url,
        HB_DATABASE_TARGET: 'isolated-development', HB_TEST_DATABASE_TARGET: 'disposable-local-container' };
    };
    const adminEnv = dbEnv('hb_migrator');
    const journals: string[] = [];
    for (const n of [1, 2]) {
      await step('migrate-' + n, () => node(['--conditions=react-server', '--import', 'tsx', 'scripts/db-migrate.ts'], adminEnv));
      journals.push(await node(['--input-type=module', '-e',
        `import pg from 'pg';const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();const rows=(await c.query('SELECT id,hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY id')).rows;if(rows.length!==6)throw Error('E2E_MIGRATION_COUNT');console.log(JSON.stringify(rows));await c.end();`], adminEnv));
    }
    if (journals[0] !== journals[1]) throw new Error('E2E_MIGRATION_REAPPLY_CHANGED_JOURNAL');
    report.migrationReapply = { unchanged: true, journal: JSON.parse(journals[0]) };
    const sql = `CREATE ROLE hb_runtime LOGIN PASSWORD '${runtimePassword}'; GRANT CONNECT ON DATABASE ${database} TO hb_runtime; GRANT USAGE ON SCHEMA public TO hb_runtime; GRANT SELECT ON ALL TABLES IN SCHEMA public TO hb_runtime;`;
    await step('synthetic-read-only-role', () => docker(['exec', '--interactive', pg.id, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'hb_migrator', '-d', database], sql));
    // Migrator credentials are scoped to provisioning/migration commands only.
    // Runtime, Playwright and the Next server receive only the independent runtime password.
    const runtimeEnv = { ...dbEnv('hb_runtime'), HB_E2E_RUN_ID: runId, HB_E2E_DATABASE: database, HB_E2E_PASSWORD: runtimePassword };
    report.databaseIdentity = await step('database-identity-and-target-guard', () => node(['--import', 'tsx', '--input-type=module', '-e',
      `import pg from 'pg';import {assertTargets} from './scripts/e2e/safety.ts';assertTargets(process.env,{database:process.env.HB_E2E_DATABASE,port:5432,user:'hb_runtime',password:process.env.HB_E2E_PASSWORD});const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();const r=(await c.query("select current_database() as db,current_user as usr,current_setting('server_version_num')::int as version,inet_server_port() as port")).rows[0];if(r.db!==process.env.HB_E2E_DATABASE||r.usr!=='hb_runtime'||r.version<180000||r.version>=190000||r.port!==5432)throw Error('E2E_DATABASE_IDENTITY_REFUSED');console.log(JSON.stringify({postgres:r.version}));await c.end();`], runtimeEnv));
    const failedSteps:string[]=[];
    const attempt=async(title:string,action:()=>Promise<unknown>)=>{try{return await step(title,action);}catch{failedSteps.push(title);}};
    if(verify){await step('lint-G',()=>node(['node_modules/eslint/bin/eslint.js','scripts/e2e/closing*.ts','tests/e2e/support/closing*.ts','tests/closing-e2e','tests/closing-e2e-flight.test.ts','tests/closing-review-source-replacement.test.ts','playwright.closing.config.ts','--max-warnings=0']));await step('next-typegen',()=>node(['node_modules/next/dist/bin/next','typegen']));await step('typecheck',()=>node(['node_modules/typescript/bin/tsc','--noEmit']));}
    await step('own-next-build',()=>node(['node_modules/next/dist/bin/next','build'],{},300_000));
    const verifierPassword=randomBytes(24).toString('hex');
    if([migratorPassword,runtimePassword].includes(verifierPassword))throw Error('E2E_PASSWORD_COLLISION');
    const ownedSql=async(statement:string)=>{await checkPg();return docker(['exec','--interactive',pg.id,'psql','-v','ON_ERROR_STOP=1','-U','hb_migrator','-d',database],statement);};
    await step('verification-role',()=>ownedSql("CREATE ROLE hb_verifier LOGIN SUPERUSER PASSWORD '"+verifierPassword+"';"));
    const url='postgresql://hb_verifier:'+verifierPassword+'@127.0.0.1:5432/'+database;
    const verifierEnv={DATABASE_URL:url,DATABASE_URL_UNPOOLED:url,TEST_DATABASE_URL:url,HB_DATABASE_TARGET:'isolated-development',HB_TEST_DATABASE_TARGET:'disposable-local-container'};
    const shared={node,sql:ownedSql,copy:(source:string,dest:string)=>docker(['cp',runner.id+':'+source,dest]),step,verifier:verifierEnv,output,forbiddenPasswords:[migratorPassword,runtimePassword,verifierPassword]};
    report.closing=await runClosingCases({...shared,caseFilter:filter});
    if((report.closing as {failures:number}).failures)failedSteps.push('G-closing');
    if(verify){
      const vitest=['node_modules/vitest/vitest.mjs','run'],evidence='/work/test-results/g-lower';
      await node(['-e',"require('fs').mkdirSync('"+evidence+"',{recursive:true})"]);
      await attempt('G-unit',()=>node([...vitest,'tests/closing.test.ts','tests/closing-boundary.test.ts','tests/closing-ui.test.tsx','tests/closing-page.test.tsx','tests/closing-review-content.test.ts','tests/closing-review-difference.test.ts','tests/closing-e2e-flight.test.ts','tests/closing-review-source-replacement.test.ts','--reporter=json','--outputFile='+evidence+'/unit.json'],{TZ:'UTC'},300_000));
      await attempt('G-pg',()=>node([...vitest,'--config','vitest.integration.config.ts','tests/integration/month-closing.test.ts','--reporter=json','--outputFile='+evidence+'/pg.json'],verifierEnv,600_000));
      await docker(['cp',runner.id+':'+evidence,join(output,'lower')]);
    }
    report.failedSteps = failedSteps;
    if (failedSteps.length) throw Error('E2E_CORRECTION_CHECKS_FAILED');
    report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL';
    // Never serialize driver/Docker errors: arguments may contain synthetic credentials.
    report.failure = error instanceof Error && /^E2E_[A-Z_]+$|^[a-z-]+_FAILED$/.test(error.message) ? error.message : 'E2E_OPERATION_FAILED';
    process.exitCode = 1;
  } finally {
    const failures: string[] = [];
    for (const resource of [...resources].reverse()) {
      try { await remove(resource); } catch { failures.push(resource.name); }
    }
    try { await removeSnapshot(tmpdir(), workspace); } catch { failures.push('snapshot'); }
    process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt);
    report.cleanupFailures = failures;
    report.endedAt = new Date().toISOString();
    if (failures.length) { report.status = 'FAIL'; process.exitCode = 1; }
    await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('HB21 G ' + report.status + '; report: ' + join(output, 'report.json'));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(() => { console.error('E2E_ADMISSION_REFUSED'); process.exitCode = 1; });
}
