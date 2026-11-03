import 'server-only';
import { sql } from 'drizzle-orm';
import { databaseFromEnvironment } from '@/infrastructure/db/client';
import { authDiagnostic } from './diagnostics';

/** Identity-independent error-page check. No users/accounts query, binding, provisioning or polling. */
export async function authStorageAvailable():Promise<boolean>{
  try{await databaseFromEnvironment().db.transaction(async tx=>{
    await tx.execute(sql`SET LOCAL statement_timeout = '1500ms'`);await tx.execute(sql`SELECT 1`);
  },{accessMode:'read only'});return true;}
  catch{authDiagnostic('AUTH_STORAGE_UNAVAILABLE','signin');return false;}
}
