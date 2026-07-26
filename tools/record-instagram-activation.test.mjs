import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activationStatus,
  buildCheckpoint,
  isActivationMetric,
} from './record-instagram-activation.mjs';

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

test('게시 전후 비교용 공개 계정 총계를 기록한다', () => {
  const record = buildCheckpoint({
    experiment: 'sado-003',
    checkpoint: '0h',
    source: 'instagram-ui',
    values: {
      postsTotal: '4',
      followersTotal: '0',
      followingTotal: '0',
    },
  });
  assert.deepEqual(record.metrics, {
    postsTotal: 4,
    followersTotal: 0,
    followingTotal: 0,
  });
});

test('늦게 입력한 pre 기준선이 0h 최신값을 덮어쓰지 않는다', () => {
  const status = activationStatus([
    {
      checkpoint: '0h',
      observedAt: '2026-07-26T18:47:47.925Z',
      metrics: { postsTotal: 4 },
    },
    {
      checkpoint: 'pre',
      observedAt: '2026-07-26T18:48:47.663Z',
      metrics: { postsTotal: 3 },
    },
  ]);
  assert.equal(status.latestMetrics.postsTotal, 4);
});

test('게시·유기적 반응·Instagram 귀속 방문이 모두 있어야 초기 활성화 증거다', () => {
  const records = [
    {
      publishedPermalink: 'https://www.instagram.com/p/example/',
      metrics: { likes: 1, organicInteractions: 1 },
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

test('좋아요 합계만으로 소유자 외 유기적 반응을 추정하지 않는다', () => {
  const status = activationStatus([
    {
      checkpoint: '0h',
      publishedPermalink: 'https://www.instagram.com/p/example/',
      metrics: { likes: 10, comments: 2, saves: 1, shares: 1 },
    },
    {
      checkpoint: '24h',
      metrics: { story_sado_visit: 3 },
    },
  ]);
  assert.equal(status.evidence.organicInteraction, false);
  assert.equal(status.status, 'collecting');
});

test('하이픈을 포함한 새 여행지 퍼널 지표도 동일하게 기록·판정한다', () => {
  assert.equal(isActivationMetric('story_northern-alps_visit'), true);
  const record = buildCheckpoint({
    experiment: 'northern-alps-001',
    checkpoint: '24h',
    source: 'foresttour-admin',
    values: {
      'story_northern-alps_visit': '2',
      'story_northern-alps_context': '1',
    },
  });
  assert.deepEqual(record.metrics, {
    'story_northern-alps_visit': 2,
    'story_northern-alps_context': 1,
  });
  const status = activationStatus([
    {
      checkpoint: '0h',
      publishedPermalink: 'https://www.instagram.com/p/example/',
      metrics: { likes: 1, organicInteractions: 1 },
    },
    record,
  ]);
  assert.equal(status.status, 'initial-activation-evidenced');
});

test('정의되지 않은 지표를 조용히 버리지 않고 거부한다', () => {
  assert.throws(() => buildCheckpoint({
    experiment: 'sado-003',
    checkpoint: '24h',
    source: 'foresttour-admin',
    values: { story_typo_bounce: '1' },
  }), /지원하지 않는 활성화 지표/);
});
