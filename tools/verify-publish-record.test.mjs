import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { recomputeFingerprint, verifyPublishRecord } from './verify-publish-record.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RECORD_DIR = join(REPO, 'data', 'publish-records');

function loadRecords() {
  return readdirSync(RECORD_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => ({ file: f, record: JSON.parse(readFileSync(join(RECORD_DIR, f), 'utf8')) }));
}

test('실제 게시 실행 기록이 전부 계약을 통과한다', () => {
  const records = loadRecords();
  assert.ok(records.length >= 2, `실행 기록을 찾지 못했습니다: ${records.length}건`);
  for (const { file, record } of records) {
    const summary = verifyPublishRecord(record);
    assert.equal(`${summary.experiment}.json`, file);
  }
});

test('실행 기록 하나가 permalink·캡션·자산·지문을 함께 묶는다', () => {
  const alps = loadRecords().find(r => r.file === 'northern-alps-004.json').record;
  assert.equal(alps.publish.permalink, 'https://www.instagram.com/p/DbRGuL5kwEU/');
  assert.equal(alps.caption.sourcePath, 'cardnews/series/northern-alps/캡션.md');
  assert.ok(alps.assets.groups.length >= 2);
  // 지문 3종이 한 기록 안에 라벨과 함께 보존돼야 한다.
  const ids = alps.fingerprints.map(f => f.id).sort();
  assert.deepEqual(ids, ['ci-public-assets', 'local-staging-prereview', 'ui-upload-staging']);
  const values = new Set(alps.fingerprints.map(f => f.value));
  assert.equal(values.size, 3, '서로 다른 스테이징의 지문이 합쳐지면 안 됩니다.');
});

test('재계산 가능으로 표기한 지문은 실제 파일에서 같은 값이 다시 나온다', () => {
  let checked = 0;
  for (const { record } of loadRecords()) {
    for (const fp of record.fingerprints) {
      if (fp.status !== 'verified-recomputable') continue;
      assert.equal(recomputeFingerprint(fp.recompute, REPO), fp.value, `지문 '${fp.id}' 재계산 불일치`);
      checked += 1;
    }
  }
  assert.ok(checked >= 1, '재계산 가능한 지문이 하나도 검증되지 않았습니다.');
});

test('사도는 미보존 값을 지어내지 않고 사유와 함께 비워 둔다', () => {
  const sado = loadRecords().find(r => r.file === 'sado-003.json').record;
  assert.equal(sado.fingerprints.length, 0);
  assert.equal(sado.caption.publishedSha256, null);
  assert.equal(sado.assets.publishedAssets, null);
  assert.equal(sado.publish.publishedAt, null);
  const fields = sado.gaps.map(g => g.field);
  for (const field of ['fingerprints', 'assets.publishedAssets', 'caption.publishedSha256', 'publish.publishedAt']) {
    assert.ok(fields.includes(field), `${field} 사유가 없습니다.`);
  }
});

// ── 일부러 깨뜨린 픽스처 ───────────────────────────────────────
function fixture() {
  return JSON.parse(JSON.stringify(loadRecords().find(r => r.file === 'sado-003.json').record));
}

test('깨뜨린 픽스처 — 사유 없이 값을 비우면 거부한다', () => {
  const broken = fixture();
  broken.gaps = broken.gaps.filter(g => g.field !== 'publish.publishedAt');
  assert.throws(() => verifyPublishRecord(broken), /publish.publishedAt가 null인데/);
});

test('깨뜨린 픽스처 — 사유 없는 빈 지문 목록은 거부한다', () => {
  const broken = fixture();
  broken.gaps = broken.gaps.filter(g => g.field !== 'fingerprints');
  assert.throws(() => verifyPublishRecord(broken), /지문이 하나도 없는데/);
});

test('깨뜨린 픽스처 — permalink 형식과 관측 시각 형식을 강제한다', () => {
  const badLink = fixture();
  badLink.publish.permalink = 'https://instagram.com/foresttour.kr';
  assert.throws(() => verifyPublishRecord(badLink), /permalink/);
  const badTime = fixture();
  badTime.publish.observedAt = '2026-07-26 18:47';
  assert.throws(() => verifyPublishRecord(badTime), /observedAt/);
});

test('깨뜨린 픽스처 — 라벨·출처 없는 지문은 거부한다', () => {
  const noCovers = fixture();
  noCovers.fingerprints = [{ id: 'x', algorithm: 'sha256', value: 'a'.repeat(64), producedBy: 'x', status: 'attested-not-recomputable' }];
  assert.throws(() => verifyPublishRecord(noCovers), /covers 라벨이 없습니다/);
  const badStatus = fixture();
  badStatus.fingerprints = [{ id: 'x', algorithm: 'sha256', value: 'a'.repeat(64), covers: '무엇의 해시인지 설명', producedBy: 'x', status: 'probably-fine' }];
  assert.throws(() => verifyPublishRecord(badStatus), /허용 목록에 없습니다/);
  const badValue = fixture();
  badValue.fingerprints = [{ id: 'x', algorithm: 'sha256', value: 'deadbeef', covers: '무엇의 해시인지 설명', producedBy: 'x', status: 'attested-not-recomputable' }];
  assert.throws(() => verifyPublishRecord(badValue), /SHA-256 64자리/);
});

test('깨뜨린 픽스처 — 재계산 표기 지문에 명세가 없으면 거부한다', () => {
  const broken = fixture();
  broken.fingerprints = [{ id: 'x', algorithm: 'sha256', value: 'a'.repeat(64), covers: '무엇의 해시인지 설명', producedBy: 'x', status: 'verified-recomputable' }];
  assert.throws(() => verifyPublishRecord(broken), /recompute 명세가 없습니다/);
});
