/** URL error values are untrusted hints, never evidence of Google or policy rejection. */
export function authMessageKey(configured:boolean,hasError:boolean,independentStorageAvailable:boolean|null):'serviceError'|'error'|null {
  if(!configured||independentStorageAvailable===false)return 'serviceError';
  return hasError?'error':null;
}
