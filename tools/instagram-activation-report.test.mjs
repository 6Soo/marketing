import assert from 'node:assert/strict';
import test from 'node:test';
import { buildActivationReport, reportMarkdown } from './instagram-activation-report.mjs';

const experiment = {
  id: 'sado-003',
  checkpoints: ['0h', '24h', '72h', '7d'],
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
