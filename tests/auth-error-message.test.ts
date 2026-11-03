import {expect,it} from 'vitest';
import {authMessageKey} from '../src/features/auth/error-message';
import {catalogs} from '../src/shared/i18n/catalogs';
it.each(['ru','de','en'] as const)('HB17-A01 HB17-A04 HB17-A06 localized public classification in %s never echoes untrusted query or identity',locale=>{
  const t=catalogs[locale].auth;
  for(const identity of ['allowed','other'])for(const query of ['AccessDenied','Configuration','<script>','https://example.test/']){
    expect(identity).toBeTruthy();const neutral=authMessageKey(true,Boolean(query),true),service=authMessageKey(true,Boolean(query),false);
    expect(neutral).toBe('error');expect(service).toBe('serviceError');
    for(const key of [neutral,service] as const){const message=t[key!];expect(message.length).toBeGreaterThan(20);expect(message).not.toMatch(/AccessDenied|<script>|SQL|DATABASE_URL|example\.test|allowlist|token/i);}
  }
  expect(authMessageKey(false,false,null)).toBe('serviceError');
});
