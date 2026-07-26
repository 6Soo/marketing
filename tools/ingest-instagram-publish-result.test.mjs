import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ingestPublishResult } from './ingest-instagram-publish-result.mjs';

const result = {
  mediaId: '123',
  permalink: 'https://www.instagram.com/p/example/',
  timestamp: '2026-07-26T18:00:00.000Z',
  mediaType: 'CAROUSEL_ALBUM',
};

test('Graph 게시 결과를 0h 활성화 체크포인트로 기록한다', () => {
  const root = mkdtempSync(join(tmpdir(), 'instagram-ingest-'));
  const ingested = ingestPublishResult({ experiment: 'sado-003', result, root });
  assert.equal(ingested.outcome, 'recorded');
  assert.equal(ingested.record.checkpoint, '0h');
  assert.equal(ingested.record.source, 'graph-api');
  assert.equal(ingested.record.observedAt, result.timestamp);
  const index = JSON.parse(readFileSync(ingested.indexPath, 'utf8'));
  assert.equal(index[0].publishedPermalink, result.permalink);
});

test('같은 게시 결과 재처리는 중복 레코드를 만들지 않는다', () => {
  const root = mkdtempSync(join(tmpdir(), 'instagram-ingest-'));
  ingestPublishResult({ experiment: 'sado-003', result, root });
  const repeated = ingestPublishResult({ experiment: 'sado-003', result, root });
  assert.equal(repeated.outcome, 'already-recorded');
});

test('permalink 또는 timestamp가 없는 성공 파일을 거부한다', () => {
  const root = mkdtempSync(join(tmpdir(), 'instagram-ingest-'));
  assert.throws(
    () => ingestPublishResult({ experiment: 'sado-003', result: { timestamp: result.timestamp }, root }),
    /permalink/,
  );
  assert.throws(
    () => ingestPublishResult({ experiment: 'sado-003', result: { permalink: result.permalink }, root }),
    /timestamp/,
  );
});
