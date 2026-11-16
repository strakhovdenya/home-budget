import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { X509Certificate } from 'node:crypto';
import { createServer } from 'node:https';
import { request } from 'node:http';
import { mkdtemp, readFile, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { assertFreePort } from '../../../scripts/e2e/server';
import { cleanEnvironment } from '../../../scripts/e2e/safety';

async function removeTLSFile(file: string) {
  try { await unlink(file); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

// WebKit must receive production Secure cookies over TLS. This loopback-only
// transport preserves Set-Cookie unchanged and never changes application policy.
export async function startLayoutTLS(runId: string) {
  if (!/^[a-f0-9]{32}$/.test(runId)) throw Error('H_TLS_RUN_REQUIRED');
  await assertFreePort(3443);
  const directory = await mkdtemp(join(tmpdir(), 'hb021-tls-' + runId + '-'));
  const keyPath = join(directory, 'key.pem');
  const certPath = join(directory, 'cert.pem');
  let key: Buffer;
  let cert: Buffer;
  try {
    await promisify(execFile)('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
      '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1',
      '-keyout', keyPath, '-out', certPath,
    ], { env: cleanEnvironment(process.env), timeout: 15000, maxBuffer: 16384 });
    key = await readFile(keyPath);
    cert = await readFile(certPath);
  } finally {
    // Exact files in our exclusively created directory, never recursive cleanup.
    for (const file of [keyPath, certPath]) {
      await removeTLSFile(file);
    }
    await rmdir(directory);
  }
  if (!new X509Certificate(cert).checkIP('127.0.0.1')) throw Error('H_TLS_CERTIFICATE_REQUIRED');
  const server = createServer({ key, cert }, (incoming, outgoing) => {
    if (incoming.headers.host !== '127.0.0.1:3443') { outgoing.writeHead(421).end(); return; }
    const upstream = request({ hostname: '127.0.0.1', port: 3000, path: incoming.url,
      method: incoming.method, headers: { ...incoming.headers,
        'x-forwarded-host': '127.0.0.1:3443', 'x-forwarded-proto': 'https' } }, response => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(outgoing);
    });
    upstream.on('error', () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end(); });
    incoming.on('aborted', () => upstream.destroy());
    incoming.pipe(upstream);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(3443, '127.0.0.1', resolve);
  });
  return () => { server.closeAllConnections(); server.close(); };
}
