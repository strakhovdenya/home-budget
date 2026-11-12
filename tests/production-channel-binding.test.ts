import {afterAll,beforeAll,it,expect} from 'vitest';
import {createServer, type Socket} from 'node:net';
import {TLSSocket,createSecureContext} from 'node:tls';
import {mkdtempSync,readFileSync,existsSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash,createHmac,pbkdf2Sync,X509Certificate} from 'node:crypto';
import {EventEmitter} from 'node:events';
import pg from 'pg';
import {connectVerifiedOperator,guardRequiredChannelBinding,type DriverState} from '../scripts/production-init/transport';

// Ephemeral synthetic certificate/key only. No production credentials, network
// target or persisted fixture. Exercise pg's real wire/TLS/SCRAM implementation.
let directory:string,cert:Buffer,key:Buffer;
beforeAll(()=>{
  directory=mkdtempSync(join(tmpdir(),'hb-channel-tls-'));
  const openssl=process.platform==='win32' && existsSync('C:/Program Files/Git/usr/bin/openssl.exe')?
    'C:/Program Files/Git/usr/bin/openssl.exe':'openssl';
  execFileSync(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-sha256','-days','1','-subj','/CN=localhost',
    '-addext','subjectAltName=IP:127.0.0.1,DNS:localhost','-keyout',join(directory,'key.pem'),'-out',join(directory,'cert.pem')],{stdio:'ignore'});
  cert=readFileSync(join(directory,'cert.pem'));key=readFileSync(join(directory,'key.pem'));
},15000);
afterAll(()=>{if(directory){for(const name of ['key.pem','cert.pem'])if(existsSync(join(directory,name)))unlinkSync(join(directory,name));rmdirSync(directory);}});
function i32(value:number){const b=Buffer.alloc(4);b.writeInt32BE(value);return b;}
function packet(type:string,body:Buffer){return Buffer.concat([Buffer.from(type),i32(body.length+4),body]);}
function auth(code:number,body=Buffer.alloc(0)){return packet('R',Buffer.concat([i32(code),body]));}
const ready=()=>packet('Z',Buffer.from('I'));
const password='synthetic-channel-only';
type Mode='plus'|'plain-only'|'cleartext'|'md5'|'trust'|'ready-only'|'bad-signature';
async function peer(mode:Mode){
  const sockets=new Set<Socket|TLSSocket>();
  const state={authPackets:0,queries:0,mechanism:'',bindingVerified:false};
  const server=createServer(socket=>{
    sockets.add(socket);socket.on('error',()=>{});
    socket.once('data',ssl=>{
      if(ssl.length!==8 || ssl.readInt32BE(4)!==80877103){socket.destroy();return;}
      socket.write('S');
      const tls=new TLSSocket(socket,{isServer:true,secureContext:createSecureContext({cert,key})});
      sockets.add(tls);tls.on('error',()=>{});
      let input=Buffer.alloc(0),startup=true,clientFirst='',serverFirst='',phase=0;
      tls.on('data',chunk=>{
        input=Buffer.concat([input,chunk]);
        while(input.length>=4){
          const size=startup?input.readInt32BE(0):input.length>=5?input.readInt32BE(1)+1:Infinity;
          if(input.length<size)return;
          const message=input.subarray(0,size);input=input.subarray(size);
          if(startup){
            startup=false;
            if(mode==='trust'){tls.write(Buffer.concat([auth(0),ready()]));continue;}
            if(mode==='ready-only'){tls.write(ready());continue;}
            if(mode==='cleartext'){tls.write(auth(3));continue;}
            if(mode==='md5'){tls.write(auth(5,Buffer.from([1,2,3,4])));continue;}
            const names=mode==='plain-only'?'SCRAM-SHA-256\0\0':'SCRAM-SHA-256-PLUS\0SCRAM-SHA-256\0\0';
            tls.write(auth(10,Buffer.from(names)));continue;
          }
          const type=String.fromCharCode(message[0]),body=message.subarray(5);
          if(type==='p'){
            state.authPackets++;
            if(phase++===0){
              const end=body.indexOf(0);state.mechanism=body.subarray(0,end).toString();
              const response=body.subarray(end+5).toString();clientFirst=response.slice(response.indexOf(',,')+2);
              const nonce=clientFirst.match(/(?:^|,)r=([^,]+)/)?.[1];
              serverFirst='r='+nonce+'synthetic-server,s=c3ludGhldGljLXNhbHQ=,i=4096';
              tls.write(auth(11,Buffer.from(serverFirst)));
            } else {
              const final=body.toString(),withoutProof=final.slice(0,final.lastIndexOf(',p='));
              const binding=Buffer.from(final.match(/^c=([^,]+)/)?.[1]??'','base64');
              const expected=Buffer.concat([Buffer.from('p=tls-server-end-point,,'),createHash('sha256').update(new X509Certificate(cert).raw).digest()]);
              state.bindingVerified=binding.equals(expected);
              const salted=pbkdf2Sync(password,Buffer.from('synthetic-salt'),4096,32,'sha256');
              const serverKey=createHmac('sha256',salted).update('Server Key').digest();
              const signature=createHmac('sha256',serverKey).update(clientFirst+','+serverFirst+','+withoutProof).digest('base64');
              tls.write(Buffer.concat([auth(12,Buffer.from('v='+(mode==='bad-signature'?'invalid':signature))),auth(0),ready()]));
            }
          } else if(type==='Q'){
            state.queries++;tls.write(Buffer.concat([packet('C',Buffer.from('SELECT 0\0')),ready()]));
          } else if(type==='X'){tls.end();}
        }
      });
    });
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=(server.address() as {port:number}).port;
  return {state,port,close:async()=>{for(const s of sockets)s.destroy();await new Promise<void>(r=>server.close(()=>r()));}};
}
async function exercise(mode:Mode,trustCertificate=true){
  const server=await peer(mode);
  const client=new pg.Client({host:'127.0.0.1',port:server.port,user:'synthetic',database:'synthetic',password,
    ssl:{rejectUnauthorized:true,...(trustCertificate?{ca:cert}:{})},enableChannelBinding:true,connectionTimeoutMillis:2000});
  client.on('error',()=>{});
  try{
    await connectVerifiedOperator(client,true);
    await client.query('SELECT 1');
    return server.state;
  } finally {await client.end().catch(()=>{});await server.close();}
}
it('real TLS plus mutual SCRAM server signature is required before the first SQL query',async()=>{
  const state=await exercise('plus');expect(state).toEqual({authPackets:2,queries:1,mechanism:'SCRAM-SHA-256-PLUS',bindingVerified:true});
});
it.each(['plain-only','cleartext','md5','trust','ready-only'] as const)('rejects wire-level %s downgrade without sending fallback password/proof or SQL',async mode=>{
  const server=await peer(mode);
  const client=new pg.Client({host:'127.0.0.1',port:server.port,user:'synthetic',database:'synthetic',password,
    ssl:{rejectUnauthorized:true,ca:cert},enableChannelBinding:true,connectionTimeoutMillis:2000});client.on('error',()=>{});
  try{await expect(connectVerifiedOperator(client,true)).rejects.toThrow('CHANNEL_BINDING_REQUIRED');
    await new Promise(r=>setTimeout(r,20));expect(server.state.authPackets).toBe(0);expect(server.state.queries).toBe(0);
  } finally {await client.end().catch(()=>{});await server.close();}
});
it('rejects an invalid SCRAM server signature before SQL',async()=>{await expect(exercise('bad-signature')).rejects.toThrow();});
it('rejects an untrusted TLS certificate before authentication',async()=>{await expect(exercise('plus',false)).rejects.toThrow();});
it('fails closed if pg option/session contract does not provide required binding',()=>{
  const connection=Object.assign(new EventEmitter(),{stream:{destroy(){}}});
  expect(()=>guardRequiredChannelBinding({connection,enableChannelBinding:false})).toThrow('CHANNEL_BINDING_DRIVER_UNSUPPORTED');
  const driver:DriverState={connection,enableChannelBinding:true,saslSession:null};
  const guard=guardRequiredChannelBinding(driver);expect(()=>guard.assertAuthenticated()).toThrow('CHANNEL_BINDING_REQUIRED');
});
