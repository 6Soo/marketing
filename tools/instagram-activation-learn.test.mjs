import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  compareExperiments,
  learnExperiment,
  learningMarkdown,
} from './instagram-activation-learn.mjs';

const TOOLS = dirname(fileURLToPath(import.meta.url));
const CHECKPOINT_WORKFLOW = join(
  TOOLS,
  '..',
  '.github',
  'workflows',
  'instagram-activation-checkpoints.yml',
);
const STORY_WORKFLOW = join(
  TOOLS,
  '..',
  '.github',
  'workflows',
  'instagram-story-followup.yml',
);

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
      metrics: {
        reach: 100,
        likes: 4,
        saves: 2,
        organicInteractions: 6,
        story_sado_visit: 3,
      },
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

test('체크포인트와 학습 job은 workflow 시작 SHA가 아닌 최신 브랜치를 읽는다', () => {
  const workflow = readFileSync(CHECKPOINT_WORKFLOW, 'utf8');
  const checkpointJob = workflow.slice(
    workflow.indexOf('  checkpoint-status:'),
    workflow.indexOf('  learn:'),
  );
  const learnJob = workflow.slice(workflow.indexOf('  learn:'));
  assert.match(checkpointJob, /ref: \$\{\{ github\.ref_name \}\}/);
  assert.match(learnJob, /ref: \$\{\{ github\.ref_name \}\}/);
});

test('도래한 체크포인트를 자동 수집 비활성 상태에서 조용히 성공 처리하지 않는다', () => {
  const workflow = readFileSync(CHECKPOINT_WORKFLOW, 'utf8');
  const guard = workflow.slice(
    workflow.indexOf('name: Refuse silent checkpoint miss'),
    workflow.indexOf('name: Collect Instagram Insights'),
  );
  const report = workflow.slice(workflow.indexOf('name: Report due checkpoints'));
  assert.match(guard, /steps\.due\.outputs\.checkpoint != ''/);
  assert.match(guard, /ACTIVATION_COLLECT_ENABLED != 'true'/);
  assert.match(guard, /exit 1/);
  assert.match(report, /if: \$\{\{ always\(\) \}\}/);
});

test('Instagram과 foresttour 수집은 독립 실행되고 부분 성공 데이터도 보존한다', () => {
  const workflow = readFileSync(CHECKPOINT_WORKFLOW, 'utf8');
  const instagram = workflow.indexOf('name: Record Instagram activation metrics');
  const foresttour = workflow.indexOf('name: Record foresttour activation metrics');
  const atLeastOne = workflow.indexOf('name: Require at least one collected source');
  const persist = workflow.indexOf('name: Persist collected checkpoint');
  assert.ok(instagram >= 0 && instagram < foresttour && foresttour < atLeastOne && atLeastOne < persist);
  assert.match(workflow.slice(instagram, foresttour), /continue-on-error: true/);
  assert.match(workflow.slice(foresttour, atLeastOne), /continue-on-error: true/);
  assert.match(workflow.slice(atLeastOne, persist), /git diff --quiet/);
  assert.match(workflow.slice(persist), /instagram_record\.outcome == 'success'/);
  assert.match(workflow.slice(persist), /foresttour_record\.outcome == 'success'/);
});

test('Story 전달 workflow는 측정 게이트를 통과한 뒤에만 모바일 패키지를 만든다', () => {
  const workflow = readFileSync(STORY_WORKFLOW, 'utf8');
  const gate = workflow.indexOf('name: Enforce measured Story publish gate');
  const instructions = workflow.indexOf('name: Write mobile publishing instructions');
  const artifact = workflow.indexOf('name: Upload verified mobile package');
  assert.ok(gate >= 0 && gate < instructions && instructions < artifact);
  assert.match(workflow.slice(gate, instructions), /--live-link/);
  assert.match(workflow, /retention-days: 7/);
  assert.doesNotMatch(workflow, /IG_ACCESS_TOKEN/);
});
