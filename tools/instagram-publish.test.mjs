import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const TOOLS = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(TOOLS, 'instagram-publish.mjs');
const INSIGHTS_SCRIPT = join(TOOLS, 'ig-insights.mjs');
const FAKE_TOKEN = 'secret-token-must-never-appear';

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'foresttour-instagram-test-'));
  const envFile = join(dir, '.env');
  writeFileSync(envFile, `IG_USER_ID=123456789\nIG_ACCESS_TOKEN=${FAKE_TOKEN}\n`, 'utf8');
  return { dir, envFile };
}

test('source never interpolates the token into a Graph URL or console output', () => {
  for (const file of [SCRIPT, INSIGHTS_SCRIPT]) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /[?&]access_token=/);
    assert.doesNotMatch(source, /console\.(?:log|error)\([^)]*access_token/);
  }
});

test('dry-run output contains no access token', () => {
  const { dir, envFile } = fixture();
  try {
    const result = spawnSync(process.execPath, [
      SCRIPT,
      'carousel',
      '--images=https://example.com/1.jpg,https://example.com/2.jpg',
      '--caption=안전 테스트',
    ], {
      encoding: 'utf8',
      env: { ...process.env, IG_ENV_FILE: envFile, IG_USER_ID: '', IG_ACCESS_TOKEN: '' },
    });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 0, output);
    assert.doesNotMatch(output, new RegExp(FAKE_TOKEN));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('refresh refuses to emit a token without the safe write flag', () => {
  const { dir, envFile } = fixture();
  try {
    const result = spawnSync(process.execPath, [SCRIPT, 'refresh-token'], {
      encoding: 'utf8',
      env: { ...process.env, IG_ENV_FILE: envFile, IG_USER_ID: '', IG_ACCESS_TOKEN: '' },
    });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 1);
    assert.match(output, /--write-env/);
    assert.doesNotMatch(output, new RegExp(FAKE_TOKEN));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('carousel rejects an invalid content fingerprint before any publish call', () => {
  const { dir, envFile } = fixture();
  try {
    const result = spawnSync(process.execPath, [
      SCRIPT,
      'carousel',
      '--images=https://example.com/1.jpg,https://example.com/2.jpg',
      '--fingerprint=not-a-sha256',
    ], {
      encoding: 'utf8',
      env: { ...process.env, IG_ENV_FILE: envFile, IG_USER_ID: '', IG_ACCESS_TOKEN: '' },
    });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 1);
    assert.match(output, /SHA-256/);
    assert.doesNotMatch(output, /POST https:/);
    assert.doesNotMatch(output, new RegExp(FAKE_TOKEN));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
