import { generateKeyPairSync,createSign } from 'node:crypto';
import { beforeEach,expect,it,vi } from 'vitest';
import { NextRequest } from 'next/server';
import { syntheticAuthEnvironment,ownerId } from './fixtures/auth';
import { authMessageKey } from '../src/features/auth/error-message';

const fakes=vi.hoisted(()=>({fetch:vi.fn(),bind:vi.fn(),matches:vi.fn(),ownsAccount:vi.fn(),findAccountIdsForOwner:vi.fn()}));
vi.mock('../src/infrastructure/auth/repository',()=>({ownerRepository:fakes}));
vi.mock('next-auth/providers/google',async original=>{
  const real=await original<typeof import('next-auth/providers/google')>(),{customFetch}=await import('next-auth');
  return {...real,default:(options:Parameters<typeof real.default>[0])=>real.default({...options,[customFetch]:fakes.fetch})};
});
import { GET,POST } from '../src/app/api/auth/[...nextauth]/route';
const issuer='https://accounts.google.com',origin='http://localhost:3000';
const pair=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...pair.publicKey.export({format:'jwk'}),kid:'hb017-synthetic',alg:'RS256',use:'sig'};
let nonce='',email=syntheticAuthEnvironment.ALLOWED_GOOGLE_EMAIL,mode='normal';
function jwt(){const now=Math.floor(Date.now()/1000),header=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid})).toString('base64url');
  const body=Buffer.from(JSON.stringify({iss:issuer,aud:syntheticAuthEnvironment.AUTH_GOOGLE_ID,sub:'synthetic-subject',email,email_verified:true,iat:now,exp:now+120,nonce:mode==='invalid-nonce'?'wrong-nonce':nonce})).toString('base64url');
  return `${header}.${body}.${createSign('RSA-SHA256').update(header+'.'+body).sign(pair.privateKey,'base64url')}`;}
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
beforeEach(()=>{
  vi.resetAllMocks();vi.unstubAllEnvs();nonce='';email=syntheticAuthEnvironment.ALLOWED_GOOGLE_EMAIL;mode='normal';
  Object.entries(syntheticAuthEnvironment).forEach(([k,v])=>vi.stubEnv(k,v));vi.stubEnv('AUTH_TRUST_HOST','true');
  vi.spyOn(console,'error').mockImplementation(()=>{});fakes.bind.mockResolvedValue(ownerId);fakes.matches.mockResolvedValue(true);
  fakes.fetch.mockImplementation(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
    if(url.endsWith('/.well-known/openid-configuration'))return json({issuer,authorization_endpoint:issuer+'/o/oauth2/v2/auth',
      token_endpoint:'https://oauth2.googleapis.com/token',userinfo_endpoint:'https://openidconnect.googleapis.com/v1/userinfo',jwks_uri:'https://www.googleapis.com/oauth2/v3/certs',
      response_types_supported:['code'],subject_types_supported:['public'],id_token_signing_alg_values_supported:['RS256']});
    if(url==='https://oauth2.googleapis.com/token'){
      expect(String(init?.body)).toContain('code_verifier=');if(mode==='token-failure')return json({error:'temporarily_unavailable'},503);
      return json({access_token:'synthetic-access',token_type:'Bearer',expires_in:120,id_token:jwt()});}
    if(url==='https://www.googleapis.com/oauth2/v3/certs')return json({keys:[jwk]});
    if(url==='https://openidconnect.googleapis.com/v1/userinfo')return json({sub:'synthetic-subject',email,email_verified:true});
    throw Error('UNEXPECTED_SYNTHETIC_OAUTH_REQUEST'); // No live network fallback.
  });
});
function request(path:string,cookie='',body?:URLSearchParams){return new NextRequest(origin+'/api/auth/'+path,{method:body?'POST':'GET',
  headers:{host:'localhost:3000',cookie,...(body?{'content-type':'application/x-www-form-urlencoded'}:{})},body});}
function cookies(r:Response){return r.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');}
async function begin(){const csrf=await GET(request('csrf'));const token=(await csrf.json()).csrfToken;
  const signed=await POST(request('signin/google',cookies(csrf),new URLSearchParams({csrfToken:token,callbackUrl:'/'})));
  const location=new URL(signed.headers.get('location')!);nonce=location.searchParams.get('nonce')!;
  expect(nonce).toBeTruthy();expect(location.searchParams.get('code_challenge')).toBeTruthy();expect(location.searchParams.get('state')).toBeTruthy();
  return {state:location.searchParams.get('state')!,cookie:cookies(signed)};
}
async function callback(options:{wrongState?:boolean;cancel?:boolean;missingPkce?:boolean}={}){const start=await begin();return GET(request('callback/google?'+new URLSearchParams({state:options.wrongState?'wrong-state':start.state,
  ...(options.cancel?{error:'access_denied'}:{code:'synthetic-code'})}),options.missingPkce?start.cookie.split('; ').filter(c=>!c.startsWith('authjs.pkce.code_verifier=')).join('; '):start.cookie));}
function refusalShape(r:Response){return {status:r.status,redirect:r.headers.get('location'),cookies:r.headers.getSetCookie().map(c=>c.split(';')[0].split('=')[0]).sort()};}
it('HB17-A02 HB17-A05 HB17-A07 real Auth.js callback errors do not reveal allowlist or binding membership',async()=>{
  email='other@example.test';const policy=await callback();expect(fakes.bind).not.toHaveBeenCalled();
  email=syntheticAuthEnvironment.ALLOWED_GOOGLE_EMAIL;fakes.bind.mockRejectedValue(Error('SYNTHETIC_PRIVATE_SQL_URL_TOKEN'));
  const storage=await callback();fakes.bind.mockResolvedValue(null);const conflict=await callback();
  expect(refusalShape(storage)).toEqual(refusalShape(policy));expect(refusalShape(conflict)).toEqual(refusalShape(policy));
  expect(policy.headers.get('location')).toContain('/login?error=AccessDenied');
  expect(authMessageKey(true,true,true)).toBe('error');
  const logs=vi.mocked(console.error).mock.calls.flat().join(' ');expect(logs).toContain('AUTH_POLICY_DENIED');expect(logs).toContain('AUTH_STORAGE_UNAVAILABLE');expect(logs).toContain('AUTH_IDENTITY_BINDING_CONFLICT');
  expect(logs).not.toMatch(/SYNTHETIC_PRIVATE|example\.test|synthetic-subject|synthetic-access/);
});
it.each(['wrong-state','cancel','token-failure','invalid-nonce','missing-pkce'])('HB17-A03 real callback preserves OAuth checks: %s',async variant=>{
  mode=variant;const r=await callback({wrongState:variant==='wrong-state',cancel:variant==='cancel',missingPkce:variant==='missing-pkce'});
  expect(r.headers.get('location')).toContain('/login?error=');expect(fakes.bind).not.toHaveBeenCalled();
  expect(r.headers.getSetCookie().some(c=>c.startsWith('authjs.session-token=')&&!c.startsWith('authjs.session-token=;'))).toBe(false);
});
it('HB17-A07 positive control establishes a real session cookie and session revalidation fails closed',async()=>{
  const cb=await callback();expect(cb.headers.get('location')).toBe(origin+'/');expect(fakes.bind).toHaveBeenCalledWith('synthetic-subject');
  const cookie=cookies(cb);const session=await GET(request('session',cookie));expect((await session.json()).user.id).toBe(ownerId);
  fakes.matches.mockRejectedValue(Error('SYNTHETIC_PRIVATE_STORAGE'));const denied=await GET(request('session',cookie));expect(await denied.json()).toBeNull();
  expect(vi.mocked(console.error).mock.calls.flat().join(' ')).toContain('AUTH_STORAGE_UNAVAILABLE');
});
it('HB17-A01 HB17-A04 HB17-A06 public technical classification requires identity-independent evidence',()=>{
  for(const configured of [true,false])for(const hasError of [true,false]){
    expect(authMessageKey(configured,hasError,false)).toBe('serviceError');
    if(!configured)expect(authMessageKey(configured,hasError,null)).toBe('serviceError');}
  for(const arbitrary of ['AccessDenied','Configuration','<script>','OAuthCallbackError'])expect(authMessageKey(true,Boolean(arbitrary),true)).toBe('error');
});
