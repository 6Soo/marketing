import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compareExperiments,
  learnExperiment,
  learningMarkdown,
} from './instagram-activation-learn.mjs';

const experiment = {
  id: 'sado-003',
  destination: '사도',
  foresttourMetrics: ['story_sado_visit'],
};
const published = {
  checkpoint: '0h',
  observedAt: '2026-07-26T18:00:00.000Z',
  publishedPermalink: 'https://www.instagram.com/p/example/',
  metrics: {},
};

test('측정 전에는 성과 개선을 추정하지 않고 대기한다', () => {
  const result = learnExperiment(experiment, [published]);
  assert.equal(result.dataState, 'awaiting-checkpoint');
  assert.match(result.recommendation, /기다린다/);
});

test('반응과 귀속 방문이 있는 측정 실험의 비율과 반복 권고를 계산한다', () => {
  const result = learnExperiment(experiment, [
    published,
    {
      checkpoint: '24h',
      observedAt: '2026-07-27T18:00:00.000Z',
      metrics: { reach: 100, likes: 4, saves: 2, story_sado_visit: 3 },
    },
  ]);
  assert.equal(result.dataState, 'measured');
  assert.equal(result.interactions, 6);
  assert.equal(result.interactionRate, 0.06);
  assert.equal(result.attributedVisitRate, 0.03);
  assert.equal(result.status, 'initial-activation-evidenced');
  assert.match(result.recommendation, /반복/);
});

test('반응은 있지만 방문이 없으면 CTA 개선을 권고한다', () => {
  const result = learnExperiment(experiment, [
    published,
    {
      checkpoint: '24h',
      observedAt: '2026-07-27T18:00:00.000Z',
      metrics: { reach: 50, likes: 1, story_sado_visit: 0 },
    },
  ]);
  assert.match(result.recommendation, /이동 안내/);
});

test('측정 완료와 활성화 증거가 있는 실험을 우선 정렬하고 보고한다', () => {
  const awaiting = learnExperiment(experiment, [published]);
  const measured = { ...awaiting, experiment: 'other', dataState: 'measured', interactions: 1 };
  assert.equal(compareExperiments([awaiting, measured])[0].experiment, 'other');
  assert.match(learningMarkdown([awaiting, measured]), /Next actions/);
});
