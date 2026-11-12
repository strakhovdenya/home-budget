import { EventEmitter } from 'node:events';
import { TLSSocket } from 'node:tls';
import type pg from 'pg';
import { InitRefusal, requireCondition } from './core';

// Small adapter for the pinned pg8.23.1 protocol events. pg still implements all
// SCRAM/nonce/certificate-binding/server-signature cryptography. Fail closed if
// its internal event/session contract changes; never substitute an auth algorithm.
export interface DriverState {
  connection: EventEmitter & {stream: {destroy(error?: Error): unknown}};
  enableChannelBinding: boolean;
  saslSession?: {mechanism: string; message: string} | null;
}
function trustedTls(stream: unknown): stream is TLSSocket {
  return stream instanceof TLSSocket && stream.encrypted && stream.authorized;
}
export function guardRequiredChannelBinding(driver: DriverState) {
  requireCondition(driver.connection instanceof EventEmitter && driver.enableChannelBinding===true &&
    typeof driver.connection.stream.destroy==='function','CHANNEL_BINDING_DRIVER_UNSUPPORTED');
  let offered=false,continued=false,finalSeen=false,failed=false;
  const refuse=()=>{
    if(failed)return;
    failed=true;
    // Runs BEFORE pg's handlers. A destroyed socket cannot transmit fallback
    // password/proof even if EventEmitter subsequently invokes pg's listener.
    driver.connection.stream.destroy(new InitRefusal('CHANNEL_BINDING_REQUIRED'));
  };
  driver.connection.prependListener('authenticationCleartextPassword',refuse);
  driver.connection.prependListener('authenticationMD5Password',refuse);
  driver.connection.prependListener('authenticationSASL',(message:unknown)=>{
    const mechanisms=message && typeof message==='object' && 'mechanisms' in message ? message.mechanisms : null;
    if(offered || !trustedTls(driver.connection.stream) || !Array.isArray(mechanisms) ||
      !mechanisms.includes('SCRAM-SHA-256-PLUS')) {refuse();return;}
    offered=true;
  });
  driver.connection.prependListener('authenticationSASLContinue',()=>{
    if(!offered || continued || driver.saslSession?.mechanism!=='SCRAM-SHA-256-PLUS' ||
      driver.saslSession.message!=='SASLInitialResponse') {refuse();return;}
    continued=true;
  });
  driver.connection.prependListener('authenticationSASLFinal',()=>{
    if(!continued || finalSeen || driver.saslSession?.mechanism!=='SCRAM-SHA-256-PLUS' ||
      driver.saslSession.message!=='SASLResponse') {refuse();return;}
    finalSeen=true;
  });
  const authenticated=()=>!failed && offered && continued && finalSeen && driver.saslSession===null &&
    trustedTls(driver.connection.stream);
  // pg clears saslSession only after verifying the server signature. Also reject
  // trust/AuthenticationOk-only shortcuts and premature ReadyForQuery before SQL.
  driver.connection.prependListener('readyForQuery',()=>{if(!authenticated())refuse();});
  return {assertAuthenticated(){requireCondition(authenticated(),'CHANNEL_BINDING_REQUIRED');},failed:()=>failed};
}
export async function connectVerifiedOperator(client: pg.Client, required: boolean) {
  const driver=client as unknown as DriverState;
  const guard=required?guardRequiredChannelBinding(driver):undefined;
  try {await client.connect();}
  catch(error){if(guard?.failed())throw new InitRefusal('CHANNEL_BINDING_REQUIRED');throw error;}
  requireCondition(trustedTls(driver.connection.stream),'VERIFIED_TLS_SOCKET_REQUIRED');
  guard?.assertAuthenticated();
}
