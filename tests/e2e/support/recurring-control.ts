import fs from 'node:fs';
import pg from 'pg';
import { requireLocalDatabaseTargets } from '../../../src/infrastructure/db/local-target';

const directory = '/work/test-results/e-control';
const pause = () => new Promise(resolve => setTimeout(resolve, 10));
async function wait(name: string, timeout = 90_000) {
  const end = Date.now() + timeout;
  while (!fs.existsSync(directory + '/' + name)) { if (fs.existsSync(directory+'/cancel')) throw Error('E_CONTROL_CANCELLED'); if (Date.now() > end) throw Error('E_CONTROL_TIMEOUT'); await pause(); }
}
async function control() {
  const targets = requireLocalDatabaseTargets(process.env), url = new URL(targets.TEST_DATABASE_URL);
  if (process.cwd() !== '/work' || process.env.HB_TEST_DATABASE_TARGET !== 'disposable-local-container' ||
    url.username !== 'hb_verifier' || url.hostname !== '127.0.0.1' || url.port !== '5432' ||
    url.pathname !== '/hb_e2e_' + process.env.HB_E2E_RUN_ID) throw Error('E_CONTROL_ADMISSION');
  const client = new pg.Client({ connectionString: url.toString() }); await client.connect();
  try {
      await wait('hold'); await client.query('BEGIN');
      const ownPid=(await client.query('SELECT pg_backend_pid() pid')).rows[0].pid as number;
      await client.query('SELECT id FROM users WHERE email_verified FOR UPDATE');
      fs.writeFileSync(directory + '/held','held');
      // Observe outside the blocking transaction: PostgreSQL statistics snapshots
      // can otherwise stay cached for the lifetime of that transaction.
      const observer=new pg.Client({connectionString:url.toString()});await observer.connect();
      const deadline = Date.now() + 2000; let pids: number[] = [],observed: {pid:number;wait_event_type:string;blockers:number[]}[]=[];
      try {
        while (Date.now() < deadline) {
          const rows=(await observer.query<{pid:number;wait_event_type:string;blockers:number[]}>("SELECT pid,wait_event_type,pg_blocking_pids(pid) blockers FROM pg_stat_activity WHERE datname=current_database() AND usename='hb_e_runtime'")).rows;
          observed=rows;
          fs.writeFileSync(directory+'/observed.json',JSON.stringify({blocker:ownPid,rows}));
          const graph=new Map(rows.map(row=>[row.pid,row]));
          const reachesOwner=(pid:number,seen=new Set<number>()):boolean=>{
            if(pid===ownPid)return true;if(seen.has(pid))return false;seen.add(pid);
            return graph.get(pid)?.blockers.some(blocker=>reachesOwner(blocker,new Set(seen)))??false;
          };
          // A second waiter can queue behind the first runtime backend. Prove
          // the complete blocking chain to our owner lock, not just direct edges.
          pids=rows.filter(row=>row.wait_event_type==='Lock'&&reachesOwner(row.pid)).map(row=>row.pid);
          if (new Set(pids).size >= 2) break; await pause();
        }
      } finally {await observer.end();}
      if (new Set(pids).size !== 2) throw Error('E_TWO_BACKENDS_NOT_OVERLAPPED');
      fs.writeFileSync(directory + '/overlap.json',JSON.stringify({overlapped:true,pids,blocker:ownPid,rows:observed}));
      fs.writeFileSync(directory + '/overlapped','overlapped');
      await wait('release',1000); await client.query('COMMIT');
      console.log('E_REAL_TWO_BACKEND_OVERLAP');
  } finally { await client.query('ROLLBACK').catch(()=>{}); await client.end(); }
}
control().catch(error => { console.error(error instanceof Error && /^E_[A-Z_]+$/.test(error.message) ? error.message : 'E_CONTROL_FAILED'); process.exitCode=1; });
