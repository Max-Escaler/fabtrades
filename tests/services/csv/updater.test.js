// config.js relies on `import.meta.url`; mock it with real temp file paths so
// the file-system logic in updater.js can run under jest.
jest.mock('../../../src/services/csv/config.js', () => {
  // eslint-disable-next-line no-undef
  const nodeOs = require('os');
  // eslint-disable-next-line no-undef
  const nodePath = require('path');
  // eslint-disable-next-line no-undef
  const nodeFs = require('fs');
  const dir = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), 'fab-updater-'));
  return {
    LAST_UPDATE_FILE: nodePath.join(dir, 'last-update.json'),
    MANIFEST_FILE: nodePath.join(dir, 'manifest.json'),
  };
});

import fs from 'fs';

import { LAST_UPDATE_FILE, MANIFEST_FILE } from '../../../src/services/csv/config.js';
import {
  shouldRefreshData,
  updateLastUpdateTimestamp,
  saveManifest,
  checkCSVStatus,
} from '../../../src/services/csv/updater.js';

const rm = (file) => {
  if (fs.existsSync(file)) fs.unlinkSync(file);
};

beforeEach(() => {
  rm(LAST_UPDATE_FILE);
  rm(MANIFEST_FILE);
});

describe('shouldRefreshData', () => {
  test('returns true when no last-update file exists', () => {
    expect(shouldRefreshData()).toBe(true);
  });

  test('returns false when the last update was under 24 hours ago', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    fs.writeFileSync(LAST_UPDATE_FILE, JSON.stringify({ timestamp: oneHourAgo }));

    expect(shouldRefreshData()).toBe(false);
  });

  test('returns true when the last update was 24 hours ago or more', () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    fs.writeFileSync(LAST_UPDATE_FILE, JSON.stringify({ timestamp: twoDaysAgo }));

    expect(shouldRefreshData()).toBe(true);
  });
});

describe('updateLastUpdateTimestamp', () => {
  test('writes an ISO timestamp plus human-readable date and time', () => {
    updateLastUpdateTimestamp();

    const saved = JSON.parse(fs.readFileSync(LAST_UPDATE_FILE, 'utf8'));
    expect(saved).toEqual(
      expect.objectContaining({
        timestamp: expect.any(String),
        date: expect.any(String),
        time: expect.any(String),
      })
    );
    expect(new Date(saved.timestamp).toISOString()).toBe(saved.timestamp);
  });

  test('makes shouldRefreshData report fresh data afterwards', () => {
    updateLastUpdateTimestamp();
    expect(shouldRefreshData()).toBe(false);
  });
});

describe('saveManifest', () => {
  test('writes the manifest as pretty-printed JSON', () => {
    const manifest = { lastUpdated: '2025-01-01', totalFiles: 2, files: [{ name: 'set_1.csv' }] };
    saveManifest(manifest);

    const raw = fs.readFileSync(MANIFEST_FILE, 'utf8');
    expect(raw).toContain('\n  '); // 2-space indentation
    expect(JSON.parse(raw)).toEqual(manifest);
  });
});

describe('checkCSVStatus', () => {
  test('warns and returns early when no manifest exists', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    expect(checkCSVStatus()).toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/No manifest/));
    log.mockRestore();
  });

  test('logs the file count and last update when a manifest exists', () => {
    saveManifest({ totalFiles: 3, files: [] });
    fs.writeFileSync(
      LAST_UPDATE_FILE,
      JSON.stringify({ date: '1/1/2025', time: '10:00:00 AM', timestamp: new Date().toISOString() })
    );
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    checkCSVStatus();

    const output = log.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(output).toMatch(/1\/1\/2025/);
    expect(output).toMatch(/10:00:00 AM/);
    expect(output).toMatch(/3/);
    log.mockRestore();
  });
});
