import {expect,it} from 'vitest';import {closingResult} from './e2e/support/closing-flight';
it('G decodes a real length-framed base64 text reference after the model',()=>{const s='YQ==';expect(closingResult('1:{"ok":true,"value":{"base64":"$2","offset":0}}\n2:T4,'+s)).toEqual({ok:true,value:{base64:s,offset:0}});});
it('G byte-counted UTF8 frames never interpret embedded result-looking text',()=>{const fake='é\n1:{"ok":true,"value":{}}\n',b=Buffer.byteLength(fake).toString(16);expect(closingResult('3:T'+b+','+fake+'2:T4,YQ==1:{"ok":true,"value":{"base64":"$2"}}\n')).toEqual({ok:true,value:{base64:'YQ=='}});});
it('G preserves literal inline chunks and typed failures',()=>{for(const r of [{ok:true,value:{base64:'YQ=='}},{ok:false,code:'FORBIDDEN'}])expect(closingResult('1:'+JSON.stringify(r)+'\n')).toEqual(r);});
it('G rejects dangling references instead of accepting incomplete bytes',()=>{expect(()=>closingResult('1:{"ok":true,"value":{"base64":"$2"}}\n')).toThrow('G_FLIGHT_MISSING_TEXT');});
it('G rejects malformed truncated framing before any result can be accepted',()=>{expect(closingResult('2:T800,YQ==1:{"ok":true,"value":{"base64":"$2"}}\n')).toBeNull();});
