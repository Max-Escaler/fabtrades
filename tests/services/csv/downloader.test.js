import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import http from 'http';

import { getFileHash, cleanCSV, downloadCSV } from '../../../src/services/csv/downloader.js';

let workDir;

beforeAll(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fab-downloader-'));
});

afterAll(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});

const tmpFile = (name) => path.join(workDir, name);
const md5 = (data) => crypto.createHash('md5').update(data).digest('hex');

// Starts an ephemeral HTTP server bound to loopback and resolves with the
// server plus its base URL so tests stay deterministic and offline.
const startServer = (handler) =>
  new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });

const closeServer = (server) =>
  new Promise((resolve) => server.close(resolve));

describe('getFileHash', () => {
  test('returns the md5 hash of the file contents', () => {
    const file = tmpFile('hash-me.txt');
    const content = 'hello fabtrades';
    fs.writeFileSync(file, content);

    expect(getFileHash(file)).toBe(md5(content));
  });

  test('is stable for identical content and differs for different content', () => {
    const a = tmpFile('a.txt');
    const b = tmpFile('b.txt');
    fs.writeFileSync(a, 'same');
    fs.writeFileSync(b, 'same');
    expect(getFileHash(a)).toBe(getFileHash(b));

    fs.writeFileSync(b, 'different');
    expect(getFileHash(a)).not.toBe(getFileHash(b));
  });

  test('returns null when the file does not exist', () => {
    expect(getFileHash(tmpFile('does-not-exist.txt'))).toBeNull();
  });
});

describe('cleanCSV', () => {
  test('drops the extDescription column and preserves the other columns', async () => {
    const input = tmpFile('in-basic.csv');
    const output = tmpFile('out-basic.csv');
    fs.writeFileSync(input, ['id,name,extDescription', '1,Foo,remove me', '2,Bar,also gone'].join('\n'));

    await cleanCSV(input, output);
    const result = fs.readFileSync(output, 'utf8');

    expect(result).not.toContain('extDescription');
    expect(result).not.toContain('remove me');
    expect(result).not.toContain('also gone');
    expect(result.split('\n')[0]).toBe('id,name');
    expect(result).toContain('1,Foo');
    expect(result).toContain('2,Bar');
  });

  test('escapes fields containing commas, quotes, and newlines', async () => {
    const input = tmpFile('in-escape.csv');
    const output = tmpFile('out-escape.csv');
    fs.writeFileSync(
      input,
      [
        'id,name,extDescription',
        '1,"Hello, World",x',
        '2,"quote ""x""",y',
        '3,"line1\nline2",z',
        '4,plain,w',
      ].join('\n')
    );

    await cleanCSV(input, output);
    const result = fs.readFileSync(output, 'utf8');

    expect(result).toContain('"Hello, World"');
    expect(result).toContain('"quote ""x"""');
    expect(result).toContain('"line1\nline2"');
    expect(result).toContain('4,plain');
  });
});

describe('downloadCSV', () => {
  test('writes the response body to the output path on a 200 response', async () => {
    const body = 'a,b\n1,2\n';
    const { server, url } = await startServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/csv' });
      res.end(body);
    });
    const output = tmpFile('downloaded.csv');

    try {
      await downloadCSV(url, output);
      expect(fs.readFileSync(output, 'utf8')).toBe(body);
    } finally {
      await closeServer(server);
    }
  });

  test('sends a User-Agent header (tcgcsv rejects requests without one)', async () => {
    let seenUserAgent;
    const { server, url } = await startServer((req, res) => {
      seenUserAgent = req.headers['user-agent'];
      res.writeHead(200);
      res.end('ok');
    });

    try {
      await downloadCSV(url, tmpFile('ua.csv'));
      expect(seenUserAgent).toMatch(/fabtrades-csv-downloader/);
    } finally {
      await closeServer(server);
    }
  });

  test('rejects with the status code when the response is not 200', async () => {
    const { server, url } = await startServer((req, res) => {
      res.writeHead(404);
      res.end('nope');
    });

    try {
      await expect(downloadCSV(url, tmpFile('fail.csv'))).rejects.toThrow(/404/);
    } finally {
      await closeServer(server);
    }
  });

  test('rejects when the host is unreachable', async () => {
    // Reserve then immediately release a port so the connection is refused.
    const { server, url } = await startServer(() => {});
    await closeServer(server);

    await expect(downloadCSV(url, tmpFile('unreachable.csv'))).rejects.toBeTruthy();
  });
});
