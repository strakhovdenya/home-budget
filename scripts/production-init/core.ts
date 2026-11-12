import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import manifest from './manifest.json';

export interface Connection {
  readonly tlsVerified?: boolean;
  query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}
export type Catalog = Record<string, Record<string, unknown>[]>;
export type Migration = { tag: string; when: number; hash: string; statements: string[] };
export class InitRefusal extends Error {}
export function requireCondition(condition: unknown, code: string): asserts condition {
  if (!condition) throw new InitRefusal(code);
}
export const target = Object.freeze(manifest);
export function loadMigrations(root: string): Migration[] {
  requireCondition(JSON.stringify(readdirSync(join(root,'drizzle')).filter(p=>p.endsWith('.sql')).sort())===
    JSON.stringify(manifest.migrations.map(m=>m.tag+'.sql').sort()), 'MIGRATION_FILE_SET_MISMATCH');
  const journal = JSON.parse(readFileSync(join(root, 'drizzle/meta/_journal.json'), 'utf8'));
  requireCondition(journal.version === '7' && journal.dialect === 'postgresql' &&
    JSON.stringify(journal.entries.map((e: { tag: string; when: number; idx: number; version: string; breakpoints: boolean }) =>
      ({tag: e.tag, when: e.when, idx: e.idx, version: e.version, breakpoints: e.breakpoints}))) ===
    JSON.stringify(manifest.migrations.map((m, idx) => ({tag:m.tag,when:m.when,idx,version:'7',breakpoints:true}))), 'JOURNAL_MISMATCH');
  return manifest.migrations.map(m => {
    // Git migration blobs are LF. Windows checkout conversion is not a new SQL/hash.
    const sql = readFileSync(join(root, 'drizzle', m.tag + '.sql'), 'utf8').replaceAll('\r\n', '\n');
    const hash = createHash('sha256').update(sql).digest('hex');
    requireCondition(hash === m.sha256, 'MIGRATION_HASH_MISMATCH');
    return { tag: m.tag, when: m.when, hash, statements: sql.split('--> statement-breakpoint').filter(s => s.trim()) };
  });
}

// Only fixed catalog SQL: never data values, owner identities or connection strings.
const ns = "n.nspname='public'";
export const catalogQueries = {
  columns: `SELECT c.relname AS table_name,a.attname AS column_name,pg_catalog.format_type(a.atttypid,a.atttypmod) AS type,
    a.attnotnull AS not_null,pg_get_expr(d.adbin,d.adrelid) AS default_value,a.attidentity AS identity_kind,a.attgenerated AS generated
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
    WHERE ${ns} AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`,
  constraints: `SELECT c.relname AS table_name,k.conname,k.contype,k.condeferrable,k.condeferred,k.convalidated,
    pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${ns} ORDER BY c.relname,k.conname`,
  triggers: `SELECT c.relname AS table_name,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) AS definition
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE ${ns} AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`,
  indexes: `SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname`,
  functions: `SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE ${ns}
    AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.objid=p.oid AND d.classid='pg_proc'::regclass AND d.deptype='e')
    ORDER BY p.proname,pg_get_function_identity_arguments(p.oid)`,
  relations: `SELECT c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${ns} ORDER BY c.relname`,
};
export async function readCatalog(db: Connection): Promise<Catalog> {
  const result: Catalog = {};
  for (const [name, sql] of Object.entries(catalogQueries)) result[name] = (await db.query(sql)).rows.map(row=>
    Object.fromEntries(Object.entries(row).map(([key,value])=>[key,typeof value==='string'?value.replaceAll('\r\n','\n'):value])));
  return result;
}
export function catalogHash(catalog: Catalog): string {
  return createHash('sha256').update(JSON.stringify(catalog)).digest('hex');
}
export async function requireEmpty(db: Connection) {
  const { rows } = await db.query(`SELECT
    (SELECT count(*)::int FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname NOT IN ('public','information_schema')) AS schemas,
    (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public') AS relations,
    (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') AS functions,
    (SELECT count(*)::int FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public') AS types`);
  requireCondition(rows.length === 1 && Object.values(rows[0]).every(v => v === 0), 'TARGET_NOT_EMPTY');
}
async function requireIdentity(db: Connection, identity: {database: string; owner: string}, tls: boolean) {
  const { rows } = await db.query(`SELECT current_database() AS database,current_user AS owner,
    current_setting('server_version_num')::int AS version,
    COALESCE((SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),false) AS tls`);
  requireCondition(rows.length===1 && rows[0].database===identity.database && rows[0].owner===identity.owner &&
    Number(rows[0].version)>=180000 && Number(rows[0].version)<190000, 'DATABASE_IDENTITY_MISMATCH');
  // Neon proxies can terminate TLS before PostgreSQL. Verify the operator's TLS socket, not the proxy/backend hop.
  requireCondition(!tls || db.tlsVerified===true, 'TLS_SESSION_REQUIRED');
}
export async function verify(db: Connection, migrations: Migration[], expectedHash: string) {
  const namespaces=(await db.query("SELECT nspname FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname NOT IN ('public','drizzle','information_schema')")).rows;
  requireCondition(namespaces.length===0, 'UNEXPECTED_SCHEMA');
  requireCondition(catalogHash(await readCatalog(db)) === expectedHash, 'SCHEMA_MISMATCH');
  const journal = (await db.query('SELECT hash,created_at::text AS created_at FROM drizzle.__drizzle_migrations ORDER BY id')).rows;
  requireCondition(JSON.stringify(journal) === JSON.stringify(migrations.map(m => ({hash:m.hash,created_at:String(m.when)}))), 'APPLIED_JOURNAL_MISMATCH');
  const tables = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
  requireCondition(tables.length===20, 'TABLE_COUNT_MISMATCH');
  // Fixed names from the verified catalog, with defensive identifier validation.
  for (const {tablename} of tables) {
    requireCondition(typeof tablename==='string' && /^[a-z_]+$/.test(tablename), 'INVALID_TABLE_NAME');
    const count=(await db.query('SELECT count(*)::text AS count FROM public."'+tablename+'"')).rows[0]?.count;
    requireCondition(count==='0', 'UNEXPECTED_APPLICATION_ROWS');
  }
}
export async function initialize(db: Connection, options: {
  migrations: Migration[]; expectedHash: string; database: string; owner: string; requireTls: boolean;
}) {
  let committing=false;
  try {
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout='5000ms'");
    await db.query("SET LOCAL statement_timeout='30000ms'");
    await db.query("SET LOCAL idle_in_transaction_session_timeout='30000ms'");
    await db.query('SET LOCAL search_path=public,pg_catalog');
    await requireIdentity(db,options,options.requireTls);
    const lock=(await db.query("SELECT pg_try_advisory_xact_lock(72604920012026) AS locked")).rows[0]?.locked;
    requireCondition(lock===true, 'INITIALIZER_BUSY');
    await requireEmpty(db);
    // Unlike Drizzle's helper, journal/schema creation is INSIDE the same transaction.
    await db.query('CREATE SCHEMA drizzle');
    await db.query('CREATE TABLE drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)');
    for(const m of options.migrations) {
      for(const sql of m.statements) await db.query(sql);
      await db.query('INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES($1,$2)',[m.hash,m.when]);
    }
    await db.query('SET CONSTRAINTS ALL IMMEDIATE');
    await verify(db,options.migrations,options.expectedHash);
    committing=true;
    await db.query('COMMIT');
    return {status:'COMMITTED' as const, migrations:options.migrations.length, applicationRows:0};
  } catch (error) {
    if(committing) throw new InitRefusal('COMMIT_OUTCOME_UNKNOWN_READ_ONLY_INSPECTION_REQUIRED');
    try { await db.query('ROLLBACK'); } catch { throw new InitRefusal('ROLLBACK_UNCONFIRMED_READ_ONLY_INSPECTION_REQUIRED'); }
    throw error instanceof InitRefusal ? error : new InitRefusal('INITIALIZATION_ROLLED_BACK');
  }
}
