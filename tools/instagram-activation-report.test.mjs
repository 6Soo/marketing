import assert from 'node:assert/strict';
import test from 'node:test';
import { buildActivationReport, reportMarkdown } from './instagram-activation-report.mjs';

const experiment = {
  id: 'sado-003',
  checkpoints: ['0h', '24h', '72h', '7d'],
  measurementSourceGroups: [
    ['graph-api', 'instagram-ui'],
    ['foresttour-admin'],
  ],
};
const published = {
  checkpoint: '0h',
  observedAt: '2026-07-26T18:00:00.000Z',
  publishedPermalink: 'https://www.instagram.com/p/example/',
  metrics: { postsTotal: 4 },
};

test('게시 시각을 기준으로 다음 수집 시점과 마감을 계산한다', () => {
  const report = buildActivationReport(
    experiment,
    [published],
    new Date('2026-07-27T19:00:00.000Z'),
  );
  assert.deepEqual(
    report.checkpoints.map(({ checkpoint, state }) => ({ checkpoint, state })),
    [
      { checkpoint: '0h', state: 'recorded' },
      { checkpoint: '24h', state: 'due' },
      { checkpoint: '72h', state: 'upcoming' },
      { checkpoint: '7d', state: 'upcoming' },
    ],
  );
  assert.equal(report.nextAction.action, 'collect-now');
  assert.equal(report.nextAction.checkpoint, '24h');
});

test('체크포인트 파일만 있고 지표가 없으면 수집 완료로 보지 않는다', () => {
  const report = buildActivationReport(
    experiment,
    [{ ...published, metrics: {} }],
    new Date('2026-07-26T18:01:00.000Z'),
  );
  assert.equal(report.checkpoints[0].state, 'due');
});

test('24h는 Instagram과 foresttour 출처 그룹이 모두 있어야 기록 완료다', () => {
  const instagramOnly = buildActivationReport(
    experiment,
    [
      published,
      {
        checkpoint: '24h',
        source: 'instagram-ui',
        observedAt: '2026-07-27T18:01:00.000Z',
        metrics: { reach: 3 },
      },
    ],
    new Date('2026-07-27T19:00:00.000Z'),
  );
  assert.equal(instagramOnly.checkpoints[1].state, 'due');
  assert.deepEqual(instagramOnly.checkpoints[1].missingSourceGroups, [['foresttour-admin']]);

  const complete = buildActivationReport(
    experiment,
    [
      published,
      {
        checkpoint: '24h',
        source: 'instagram-ui',
        observedAt: '2026-07-27T18:01:00.000Z',
        metrics: { reach: 3 },
      },
      {
        checkpoint: '24h',
        source: 'foresttour-admin',
        observedAt: '2026-07-27T18:02:00.000Z',
        metrics: { story_sado_visit: 0 },
      },
    ],
    new Date('2026-07-27T19:00:00.000Z'),
  );
  assert.equal(complete.checkpoints[1].state, 'recorded');
});

test('마크다운 보고서에 상태와 다음 행동을 포함한다', () => {
  const report = buildActivationReport(
    experiment,
    [published],
    new Date('2026-07-26T19:00:00.000Z'),
  );
  const markdown = reportMarkdown(report);
  assert.match(markdown, /Activation: collecting/);
  assert.match(markdown, /24h · wait-until-due/);
});

// --- 지각 수집 차단 (2026-07-29 추가) ---------------------------------------
// 배경: Meta 차단으로 사도·북알프스 24h가 통째로 누락됐는데, 상태가 무기한 'due'로 남아
// 차단 해제 시점의 누적값이 '24h 관측치'로 기록될 뻔했다. Instagram 인사이트는 누적값이라
// 뒤늦게 읽으면 그 시점 수치가 아니다.

test('유예 시간 안이면 지각이어도 아직 수집 대상이다', () => {
  const report = buildActivationReport(
    experiment,
    [published],
    // 24h 마감 2026-07-27T18:00Z + 5시간 → 유예(6h) 이내
    new Date('2026-07-27T23:00:00.000Z'),
  );
  assert.equal(report.checkpoints[1].state, 'due');
  assert.equal(report.nextAction.action, 'collect-now');
  assert.deepEqual(report.missedCheckpoints, []);
});

test('유예를 넘긴 체크포인트는 missed로 확정하고 다시 수집 대상으로 올리지 않는다', () => {
  const report = buildActivationReport(
    experiment,
    [published],
    // 24h 마감 + 7시간 → 유예(6h) 초과
    new Date('2026-07-28T01:00:00.000Z'),
  );
  assert.equal(report.checkpoints[1].state, 'missed');
  // 핵심: 다음 행동이 24h 수집으로 되돌아가지 않고 그 다음 창으로 넘어간다.
  assert.equal(report.nextAction.checkpoint, '72h');
  assert.equal(report.nextAction.action, 'wait-until-due');
  assert.deepEqual(report.missedCheckpoints, [
    { checkpoint: '24h', dueAt: '2026-07-27T18:00:00.000Z' },
  ]);
});

test('누락은 마크다운 보고서에 드러나 조용히 묻히지 않는다', () => {
  const report = buildActivationReport(
    experiment,
    [published],
    new Date('2026-07-28T01:00:00.000Z'),
  );
  const markdown = reportMarkdown(report);
  assert.match(markdown, /Missed \(복구 불가\)/);
  assert.match(markdown, /24h \(due 2026-07-27T18:00:00\.000Z\)/);
});

test('이미 수집된 체크포인트는 유예를 한참 넘겨도 missed가 되지 않는다', () => {
  const report = buildActivationReport(
    experiment,
    [
      published,
      {
        checkpoint: '24h',
        source: 'graph-api',
        observedAt: '2026-07-27T18:01:00.000Z',
        metrics: { reach: 12 },
      },
      {
        checkpoint: '24h',
        source: 'foresttour-admin',
        observedAt: '2026-07-27T18:02:00.000Z',
        metrics: { story_sado_visit: 1 },
      },
    ],
    new Date('2026-08-10T00:00:00.000Z'),
  );
  assert.equal(report.checkpoints[1].state, 'recorded');
  assert.deepEqual(report.missedCheckpoints, [
    // 72h·7d는 수집되지 않은 채 유예를 넘겼으므로 누락이 맞다.
    { checkpoint: '72h', dueAt: '2026-07-29T18:00:00.000Z' },
    { checkpoint: '7d', dueAt: '2026-08-02T18:00:00.000Z' },
  ]);
});

test('유예 시간은 주입해 조정할 수 있다', () => {
  const at = new Date('2026-07-28T01:00:00.000Z');
  assert.equal(
    buildActivationReport(experiment, [published], at, { graceHours: 24 }).checkpoints[1].state,
    'due',
  );
  assert.equal(
    buildActivationReport(experiment, [published], at, { graceHours: 1 }).checkpoints[1].state,
    'missed',
  );
});
