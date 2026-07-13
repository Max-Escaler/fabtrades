// config.js uses `import.meta.url`, which babel-jest cannot transform, so we
// mock it with a real temp file path. The factory can only reference names
// prefixed with `mock`, so we build the path with require() inside it.
jest.mock('../../../src/services/csv/config.js', () => {
  // eslint-disable-next-line no-undef
  const nodeOs = require('os');
  // eslint-disable-next-line no-undef
  const nodePath = require('path');
  // eslint-disable-next-line no-undef
  const nodeFs = require('fs');
  const dir = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), 'fab-cache-'));
  return { DIFF_CACHE_FILE: nodePath.join(dir, 'diff-cache.json') };
});

import fs from 'fs';

import { DIFF_CACHE_FILE } from '../../../src/services/csv/config.js';
import { loadDiffCache, saveDiffCache, clearDiffCache } from '../../../src/services/csv/cache.js';

beforeEach(() => {
  if (fs.existsSync(DIFF_CACHE_FILE)) fs.unlinkSync(DIFF_CACHE_FILE);
});

describe('loadDiffCache', () => {
  test('returns an empty object when the cache file does not exist', () => {
    expect(loadDiffCache()).toEqual({});
  });

  test('returns the parsed cache when the file contains valid JSON', () => {
    const cache = { 'http://x/1.csv': { hash: 'abc', lastDownloaded: '2025-01-01' } };
    fs.writeFileSync(DIFF_CACHE_FILE, JSON.stringify(cache));

    expect(loadDiffCache()).toEqual(cache);
  });

  test('falls back to an empty object and warns when the file is corrupt', () => {
    fs.writeFileSync(DIFF_CACHE_FILE, '{not valid json');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(loadDiffCache()).toEqual({});
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });
});

describe('saveDiffCache', () => {
  test('writes the cache as pretty-printed JSON that round-trips through load', () => {
    const cache = { 'http://x/2.csv': { hash: 'def' } };
    saveDiffCache(cache);

    const raw = fs.readFileSync(DIFF_CACHE_FILE, 'utf8');
    expect(raw).toContain('\n  '); // 2-space indentation
    expect(JSON.parse(raw)).toEqual(cache);
    expect(loadDiffCache()).toEqual(cache);
  });
});

describe('clearDiffCache', () => {
  test('deletes the cache file when it exists', () => {
    fs.writeFileSync(DIFF_CACHE_FILE, '{}');
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    clearDiffCache();

    expect(fs.existsSync(DIFF_CACHE_FILE)).toBe(false);
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/deleted successfully/));
    log.mockRestore();
  });

  test('is a no-op that logs when the cache file is already absent', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    expect(() => clearDiffCache()).not.toThrow();
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/empty cache/));
    log.mockRestore();
  });
});
