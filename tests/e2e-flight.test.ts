import { expect, it } from 'vitest';
import { resultOf } from './e2e/support/proof';

it('HB21-B-R01 reads an actual Flight model after a length-framed large chunk without a newline', () => {
  const payload = 'A'.repeat(2048);
  expect(resultOf('0:{"a":"$@1"}\n2:T800,' + payload + '1:{"ok":true,"value":{"base64":"$2"}}\n'))
    .toEqual({ ok: true, value: { base64: '$2' } });
});
it('HB21-B-R01 respects UTF-8 byte lengths and ignores forged result-looking text inside a Flight text frame', () => {
  const payload = 'é\n1:{"ok":true}\n'.repeat(100);
  expect(resultOf('2:T' + Buffer.byteLength(payload).toString(16) + ',' + payload + '1:{"ok":false,"code":"FORBIDDEN"}\n'))
    .toEqual({ ok: false, code: 'FORBIDDEN' });
});
it('HB21-B-R01 incomplete or malformed Flight text frames cannot become a passing result', () => {
  expect(resultOf('2:T800,1:{"ok":true}\n')).toBeNull();
  expect(resultOf('2:Tz,1:{"ok":true}\n')).toBeNull();
  expect(resultOf('1:{"ok":false,"code":"FORBIDDEN"}\n')).toEqual({ ok: false, code: 'FORBIDDEN' });
});
