import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import http from 'http';

import { checkRemoteFileChanged } from '../../../src/services/csv/diffChecker.js';

let workDir;

beforeAll(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fab-diff-'));
});

afterAll(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});

const md5 = (data) => crypto.createHash('md5').update(data).digest('hex');

// Writes a local file with ASCII content (byte length == string length) and
// returns its path, size, and md5 so tests can build precise cache entries.
const writeLocal = (name, content) => {
  const filePath = path.join(workDir, name);
  fs.writeFileSync(filePath, content);
  return { filePath, size: fs.statSync(filePath).size, hash: md5(content) };
};

// Starts a loopback HEAD server that responds with the supplied headers.
const startHeadServer = (headers) =>
  new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, headers);
      res.end();
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}/file.csv` });
    });
  });

const closeServer = (server) => new Promise((resolve) => server.close(resolve));

const withServer = async (headers, fn) => {
  const { server, url } = await startHeadServer(headers);
  try {
    return await fn(url);
  } finally {
    await closeServer(server);
  }
};

describe('checkRemoteFileChanged', () => {
  test('reports changed when the local file is missing', async () => {
    const missing = path.join(workDir, 'not-there.csv');
    const result = await withServer({}, (url) => checkRemoteFileChanged(url, missing, {}));

    expect(result).toEqual({ changed: true, reason: 'File empty local' });
  });

  test('reports changed when the remote ETag differs from the cached ETag', async () => {
    const local = writeLocal('etag.csv', 'body');
    const cache = { hash: local.hash };
    const result = await withServer({ etag: 'W/"new"' }, (url) => {
      cache.etag = 'W/"old"';
      return checkRemoteFileChanged(url, local.filePath, { [url]: cache });
    });

    expect(result).toEqual({ changed: true, reason: 'ETag edited' });
  });

  test('reports changed when Last-Modified is newer than the cache', async () => {
    const local = writeLocal('lastmod.csv', 'body');
    const result = await withServer(
      { 'last-modified': new Date('2025-02-01T00:00:00Z').toUTCString() },
      (url) =>
        checkRemoteFileChanged(url, local.filePath, {
          [url]: { hash: local.hash, lastModified: '2025-01-01T00:00:00Z' },
        })
    );

    expect(result).toEqual({ changed: true, reason: 'Last-Modified edited' });
  });

  test('reports changed when Content-Length no longer matches the local size', async () => {
    const local = writeLocal('length.csv', 'body-content');
    const result = await withServer(
      { 'content-length': String(local.size + 50) },
      (url) => checkRemoteFileChanged(url, local.filePath, { [url]: { hash: local.hash } })
    );

    expect(result).toEqual({ changed: true, reason: 'Content-Length edited' });
  });

  test('reports changed when only the cached hash differs from the local file', async () => {
    const local = writeLocal('hash.csv', 'body-content');
    const result = await withServer(
      { 'content-length': String(local.size) },
      (url) => checkRemoteFileChanged(url, local.filePath, { [url]: { hash: 'stale-hash' } })
    );

    expect(result).toEqual({ changed: true, reason: 'Hash local' });
  });

  test('reports unchanged when ETag, Last-Modified, size, and hash all match', async () => {
    const local = writeLocal('same.csv', 'body-content');
    const result = await withServer(
      {
        etag: 'W/"same"',
        'last-modified': new Date('2025-01-01T00:00:00Z').toUTCString(),
        'content-length': String(local.size),
      },
      (url) =>
        checkRemoteFileChanged(url, local.filePath, {
          [url]: {
            etag: 'W/"same"',
            lastModified: '2025-06-01T00:00:00Z',
            hash: local.hash,
          },
        })
    );

    expect(result).toEqual({ changed: false, reason: 'none modified' });
  });

  test('treats a HEAD request error as changed (fail open)', async () => {
    const local = writeLocal('err.csv', 'body');
    const { server, url } = await startHeadServer({});
    await closeServer(server); // refuse the connection

    const result = await checkRemoteFileChanged(url, local.filePath, { [url]: { hash: local.hash } });

    expect(result).toEqual({ changed: true, reason: 'Error HEAD' });
  });
});
