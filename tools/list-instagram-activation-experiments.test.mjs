import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { discoverActivationExperiments } from './list-instagram-activation-experiments.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'activation-discovery-'));
  mkdirSync(join(root, 'data', 'experiments'), { recursive: true });
  for (const id of ['sado-003', 'northern-alps-004', 'draft-005']) {
    writeFileSync(join(root, 'data', 'experiments', `${id}.json`), '{}');
  }
  for (const id of ['sado-003', 'northern-alps-004']) {
    const dir = join(root, 'data', 'activation', id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.json'), JSON.stringify([{
      publishedPermalink: `https://www.instagram.com/p/${id}/`,
    }]));
  }
  return root;
}

test('게시 permalink가 있는 모든 실험을 안정된 순서로 발견한다', () => {
  assert.deepEqual(discoverActivationExperiments(fixture()), [
    'northern-alps-004',
    'sado-003',
  ]);
});

test('수동 요청 시 지정한 활성 실험만 반환한다', () => {
  const root = fixture();
  assert.deepEqual(discoverActivationExperiments(root, 'sado-003'), ['sado-003']);
  assert.throws(
    () => discoverActivationExperiments(root, 'draft-005'),
    /게시 체크포인트/,
  );
});
