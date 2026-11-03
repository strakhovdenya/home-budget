import 'server-only';
import { randomUUID } from 'node:crypto';

export type AuthCategory='AUTH_CONFIG_INVALID'|'AUTH_STORAGE_UNAVAILABLE'|'AUTH_POLICY_DENIED'|'AUTH_IDENTITY_BINDING_CONFLICT'
  |'AUTH_OAUTH_FAILED'|'AUTH_SESSION_VALIDATION_FAILED'|'AUTH_UNKNOWN_FAILURE';
export type AuthStage='signin'|'callback'|'session'|'ownership';
/** Closed projection: never pass an exception, identity, URL, cookie or request body to this logger. */
export function authDiagnostic(category:AuthCategory,stage:AuthStage){
  console.error(JSON.stringify({category,stage,correlationId:randomUUID(),timestamp:new Date().toISOString()}));
}
export function authErrorCategory(type:unknown):AuthCategory {
  if(typeof type!=='string')return 'AUTH_UNKNOWN_FAILURE';
  if(['Configuration','MissingSecret','InvalidProvider','InvalidEndpoints'].includes(type))return 'AUTH_CONFIG_INVALID';
  if(['OAuthSignInError','OAuthCallbackError','OAuthProfileParseError','InvalidCheck'].includes(type))return 'AUTH_OAUTH_FAILED';
  if(type==='JWTSessionError'||type==='SessionTokenError')return 'AUTH_SESSION_VALIDATION_FAILED';
  // AccessDenied and CallbackRouteError have several possible sources. Never infer Google policy.
  return 'AUTH_UNKNOWN_FAILURE';
}
