import assert from 'node:assert/strict';
import test from 'node:test';
import { activationStatus, buildCheckpoint } from './record-instagram-activation.mjs';

test('확인하지 않은 수치를 0으로 만들지 않는다', () => {
  const record = buildCheckpoint({
    experiment: 'sado-003',
    checkpoint: '0h',
    source: 'instagram-ui',
    permalink: 'https://www.instagram.com/p/example/',
    values: {},
  });
  assert.deepEqual(record.metrics, {});
  assert.equal(record.publishedPermalink, 'https://www.instagram.com/p/example/');
});

test('PII 없이 집계 수치만 정수로 기록한다', () => {
  const record = buildCheckpoint({
    experiment: 'sado-003',
    checkpoint: '24h',
    source: 'foresttour-admin',
    values: { story_sado_visit: '3', saves: undefined },
  });
  assert.deepEqual(record.metrics, { story_sado_visit: 3 });
  assert.throws(() => buildCheckpoint({
    experiment: 'sado-003',
    checkpoint: '24h',
    source: 'instagram-ui',
    values: { likes: '-1' },
  }), /0 이상의 정수/);
});

test('게시·유기적 반응·Instagram 귀속 방문이 모두 있어야 초기 활성화 증거다', () => {
  const records = [
    {
      publishedPermalink: 'https://www.instagram.com/p/example/',
      metrics: { likes: 1 },
    },
    {
      metrics: { story_sado_visit: 1 },
    },
  ];
  assert.equal(activationStatus(records).status, 'initial-activation-evidenced');
  assert.equal(
    activationStatus([{ publishedPermalink: records[0].publishedPermalink, metrics: {} }]).status,
    'collecting',
  );
});
