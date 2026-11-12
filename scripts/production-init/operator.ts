import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectVerifiedOperator } from './transport';
import pg from 'pg';
import { InitRefusal, initialize, loadMigrations, requireCondition, target, verify, catalogHash, type Connection } from './core';

export function validateUrl(value: string | undefined) {
  let u: URL;
  try { u=new URL(value ?? ''); } catch { throw new InitRefusal('DIRECT_TLS_URL_REQUIRED'); }
  requireCondition(u.protocol==='postgresql:' && u.hostname===target.host && (!u.port||u.port==='5432') &&
    u.pathname==='/'+target.database && decodeURIComponent(u.username)===target.owner && u.password && !u.hash &&
    [...u.searchParams.keys()].every(k=>k==='sslmode'||k==='channel_binding') &&
    u.searchParams.getAll('sslmode').length===1 && u.searchParams.getAll('channel_binding').length<=1 &&
    (!u.searchParams.has('channel_binding')||u.searchParams.get('channel_binding')==='require') &&
    ['require','verify-full'].includes(u.searchParams.get('sslmode')??''),
    'EXACT_DIRECT_TLS_TARGET_REQUIRED');
  // Translate security parameters into explicit pg options; require is enforced by transport, never ignored.
  const requireChannelBinding=u.searchParams.get('channel_binding')==='require';
  u.search='';
  return {connectionString:u.toString(),requireChannelBinding};
}
export function requireApproval(env: Readonly<Record<string,string|undefined>>, head: string) {
  requireCondition(/^[a-f0-9]{40}$/.test(head) && env.HB_PRODUCTION_INIT_REVIEWED_COMMIT===head,'REVIEWED_COMMIT_REQUIRED');
  requireCondition(env.HB_PRODUCTION_INIT_GO===`INITIALIZE:${target.project}:${target.branch}:${target.database}:${head}`,
    'EXPLICIT_PRODUCTION_GO_REQUIRED');
}
export async function verifyNeon(apiKey: string, get: typeof fetch=fetch) {
  requireCondition(apiKey && !/[\r\n]/.test(apiKey), 'NEON_API_KEY_REQUIRED');
  async function json(path: string) {
    const response=await get('https://console.neon.tech/api/v2/projects/'+target.project+path,{
      headers:{Authorization:'Bearer '+apiKey},redirect:'error',signal:AbortSignal.timeout(10000),
    });
    requireCondition(response.ok,'NEON_IDENTITY_READ_FAILED');
    const body=await response.text();requireCondition(body.length<=65536,'NEON_RESPONSE_TOO_LARGE');
    return JSON.parse(body);
  }
  const project=(await json('')).project;
  requireCondition(project?.id===target.project && project.region_id===target.region && project.pg_version===18 &&
    project.proxy_host===target.host.slice(target.endpoint.length+1),'NEON_PROJECT_MISMATCH');
  const branch=(await json('/branches/'+target.branch)).branch;
  requireCondition(branch?.id===target.branch && branch.project_id===target.project && branch.name==='production' &&
    branch.primary===true && branch.default===true && branch.current_state==='ready','NEON_BRANCH_MISMATCH');
  const endpoint=(await json('/endpoints/'+target.endpoint)).endpoint;
  requireCondition(endpoint?.id===target.endpoint && endpoint.project_id===target.project && endpoint.branch_id===target.branch &&
    endpoint.type==='read_write' && endpoint.disabled===false,'NEON_ENDPOINT_MISMATCH');
  const databases=(await json('/branches/'+target.branch+'/databases')).databases;
  requireCondition(Array.isArray(databases) && databases.some(d=>d.name===target.database && d.owner_name===target.owner),'NEON_DATABASE_MISMATCH');
}

export async function runOperator(env: Readonly<Record<string,string|undefined>>, argv: readonly string[]) {
  requireCondition(argv.length===1 && ['--initialize','--verify-empty'].includes(argv[0]),'MODE_REQUIRED');
  const root=realpathSync(resolve(dirname(fileURLToPath(import.meta.url)),'../..'));
  requireCondition(realpathSync(process.cwd())===root,'RUN_FROM_REVIEWED_ROOT');
  const git=(args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  const head=git(['rev-parse','HEAD']);
  // Both modes require explicit operator approval. Neither is a build/start hook.
  requireApproval(env,head);
  requireCondition(git(['status','--porcelain','--untracked-files=all'])==='','CLEAN_CHECKOUT_REQUIRED');
  requireCondition(git(['diff',target.sourceCommit,'HEAD','--','src','drizzle','package.json','pnpm-lock.yaml'])==='','APPLICATION_BASE_CHANGED');
  const migrations=loadMigrations(root);
  const expected=JSON.parse(readFileSync(join(root,'scripts/production-init/schema.json'),'utf8'));
  requireCondition(expected.version===1 && /^[a-f0-9]{64}$/.test(expected.sha256) && catalogHash(expected.catalog)===expected.sha256,'EXPECTED_CATALOG_REQUIRED');
  const url=validateUrl(env.HB_PRODUCTION_INIT_DIRECT_URL);
  await verifyNeon(env.NEON_API_KEY??'');
  const client=new pg.Client({connectionString:url.connectionString,ssl:{rejectUnauthorized:true},
    enableChannelBinding:url.requireChannelBinding,connectionTimeoutMillis:10000,
    application_name:'home-budget-reviewed-initializer'});
  // Never display driver/provider errors or credentials, including asynchronous socket errors.
  client.on('error',()=>{});
  try {
    await connectVerifiedOperator(client,url.requireChannelBinding);
    const db:Connection={query:(sql,values)=>client.query(sql,values),tlsVerified:true};
    // Recheck provider identity after connecting, before any SQL write.
    await verifyNeon(env.NEON_API_KEY??'');
    if(argv[0]==='--initialize') return await initialize(db,{migrations,expectedHash:expected.sha256,
      database:target.database,owner:target.owner,requireTls:true});
    await client.query('BEGIN READ ONLY');
    try {
      await client.query("SET LOCAL statement_timeout='30000ms'");
      await client.query('SET LOCAL search_path=public,pg_catalog');
      const identity=(await client.query('SELECT current_database() AS db,current_user AS role')).rows[0];
      requireCondition(identity.db===target.database && identity.role===target.owner,'DATABASE_IDENTITY_MISMATCH');
      await verify(db,migrations,expected.sha256);await client.query('ROLLBACK');
      return {status:'VERIFIED_EMPTY',migrations:migrations.length,applicationRows:0};
    } catch(error) {await client.query('ROLLBACK');throw error;}
  } finally {await client.end().catch(()=>{});}
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  runOperator(process.env,process.argv.slice(2)).then(result=>console.log(JSON.stringify(result))).catch(error=>{
    console.error(error instanceof InitRefusal?error.message:'OPERATOR_FAILED_INSPECT_PRIVATELY');process.exitCode=1;
  });
}
