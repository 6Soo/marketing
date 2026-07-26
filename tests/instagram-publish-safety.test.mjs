import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publisher = join(repo, 'tools', 'instagram-publish.mjs');
const mockFetch = pathToFileURL(join(repo, 'tests', 'fixtures', 'mock-instagram-fetch.mjs')).href;
const commonArgs = [
  '--import',
  mockFetch,
  publisher,
  'carousel',
  '--images=https://example.test/1.jpg,https://example.test/2.jpg',
  '--caption=같은\n캡션',
  '--publish',
];

function run(mode) {
  return spawnSync(process.execPath, commonArgs, {
    cwd: repo,
    encoding: 'utf8',
    env: {
      ...process.env,
      IG_USER_ID: 'test-user',
      IG_ACCESS_TOKEN: 'test-token',
      MOCK_INSTAGRAM_MODE: mode,
    },
  });
}

test('동일 캡션이 있으면 컨테이너 생성 전에 중복 게시를 차단한다', () => {
  const result = run('duplicate');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /중복 게시 차단/);
  assert.doesNotMatch(result.stdout, /캐러셀 게시 완료/);
});

test('동일 캡션이 없으면 게시 흐름을 계속한다', () => {
  const result = run('unique');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /중복 게시 검사 통과/);
  assert.match(result.stdout, /캐러셀 게시 완료/);
});

test('토큰 갱신은 출력 파일 없이는 네트워크 요청 전에 차단한다', () => {
  const result = spawnSync(process.execPath, [
    '--import',
    mockFetch,
    publisher,
    'refresh-token',
  ], {
    cwd: repo,
    encoding: 'utf8',
    env: {
      ...process.env,
      IG_ACCESS_TOKEN: 'test-token',
      MOCK_INSTAGRAM_MODE: 'unique',
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--output-file/);
  assert.doesNotMatch(result.stdout, /test-token/);
});
