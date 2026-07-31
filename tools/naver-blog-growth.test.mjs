import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  createObservation,
  renderGrowthReport,
  validateGrowthPlan,
  validateObservations,
} from './naver-blog-growth.mjs';

const planPayload = JSON.parse(
  await readFile(new URL('../naver-blog/growth-plan.json', import.meta.url), 'utf8'),
);
const observationsPayload = JSON.parse(
  await readFile(new URL('../naver-blog/observations.json', import.meta.url), 'utf8'),
);
const storiesPayload = JSON.parse(
  await readFile(new URL('../blog/published/stories.json', import.meta.url), 'utf8'),
);
const guidesPayload = JSON.parse(
  await readFile(new URL('../naver-blog/travel-guides.json', import.meta.url), 'utf8'),
);
const registryPayload = JSON.parse(
  await readFile(new URL('../naver-blog/published.json', import.meta.url), 'utf8'),
);

function state() {
  return {
    plan: structuredClone(planPayload),
    observations: structuredClone(observationsPayload),
    stories: structuredClone(storiesPayload),
    guides: structuredClone(guidesPayload),
    registry: structuredClone(registryPayload),
  };
}

function publicRegistry(slug = 'sado') {
  return {
    schemaVersion: 1,
    channel: 'naver-blog',
    posts: [{
      slug,
      idempotencyKey: `${slug}:source:content`,
      contentDigest: 'content-digest',
      url: 'https://blog.naver.com/foresttour/123456789',
      blogId: 'foresttour',
      logNo: '123456789',
      verifiedAt: '2026-07-31T00:00:00.000Z',
    }],
  };
}

test('현재 여행지 발견 클러스터와 빈 집계 기록은 계약을 통과한다', () => {
  const current = state();
  assert.deepEqual(validateGrowthPlan(current.plan, current), []);
  assert.deepEqual(validateObservations(current.observations, current), []);
});

test('동명 섬 구분어가 빠진 기둥 제목을 차단한다', () => {
  const current = state();
  current.plan.clusters[0].articles[0].title = '사도섬 여행 | 가는 법과 2박 3일 동선';
  const errors = validateGrowthPlan(current.plan, current);
  assert.ok(errors.some((error) => error.includes('travel-guides.json과 다릅니다')));
  assert.ok(errors.some((error) => error.includes("구분어 '일본'")));
});

test('대표·보조 검색어를 포함해 한 검색어는 한 글만 소유한다', () => {
  const current = state();
  current.plan.clusters[0].articles[1].primaryQuery = current.plan.clusters[0].articles[0].secondaryQueries[0];
  const errors = validateGrowthPlan(current.plan, current);
  assert.ok(errors.some((error) => error.includes('글이 이미 소유')));
});

test('지원 글은 신규 공식 출처·사진·낮은 중복률 없이 ready가 될 수 없다', () => {
  const current = state();
  current.plan.clusters[0].articles[1].status = 'ready';
  const errors = validateGrowthPlan(current.plan, current);
  assert.ok(errors.some((error) => error.includes('researchEvidence')));
});

test('공개 URL 검증 전에는 검색 관측값을 만들 수 없다', () => {
  const current = state();
  assert.throws(
    () => createObservation({
      slug: 'sado',
      checkpoint: 'D+3',
      observedAt: '2026-08-03T09:00:00+09:00',
      targetQueryFound: false,
      rankBand: 'not-found',
    }, current),
    /공개 URL 검증 기록이 없습니다/,
  );
});

test('형식만 흉내 낸 공개 기록과 너무 이른 체크포인트를 거부한다', () => {
  const current = state();
  current.registry = { posts: [{ slug: 'sado' }] };
  assert.throws(
    () => createObservation({
      slug: 'sado',
      checkpoint: 'D+3',
      observedAt: '2026-08-03T09:00:00+09:00',
      targetQueryFound: false,
    }, current),
    /공개 기록:/,
  );

  current.registry = publicRegistry();
  assert.throws(
    () => createObservation({
      slug: 'sado',
      checkpoint: 'D+3',
      observedAt: '2026-08-02T09:00:00+09:00',
      targetQueryFound: false,
    }, current),
    /3일이 지나기 전에/,
  );
});

test('집계 관측값은 체크포인트·정수·허용 필드만 저장한다', () => {
  const current = state();
  current.registry = publicRegistry();
  const valid = createObservation({
    slug: 'sado',
    checkpoint: 'D+3',
    observedAt: '2026-08-03T09:00:00+09:00',
    targetQueryFound: true,
    rankBand: '11-20',
    postViews: 12,
    searchInflows: 3,
    foresttourClicks: 1,
  }, current);
  assert.equal(valid.publicUrlVerified, true);

  const payload = {
    schemaVersion: 1,
    channel: 'naver-blog',
    observations: [{ ...valid, checkpoint: 'D+1', postViews: -1, rawSearchTerms: ['계정 검색어'] }],
  };
  const errors = validateObservations(payload, current);
  assert.ok(errors.some((error) => error.includes('허용되지 않은 필드')));
  assert.ok(errors.some((error) => error.includes('checkpoint')));
  assert.ok(errors.some((error) => error.includes('0 이상의 정수')));
});

test('D+7 미발견 보고는 발행량 대신 제목·첫 문단 진단을 지시한다', () => {
  const current = state();
  current.registry = publicRegistry();
  current.observations.observations.push(createObservation({
    slug: 'sado',
    checkpoint: 'D+7',
    observedAt: '2026-08-07T09:00:00+09:00',
    targetQueryFound: false,
    rankBand: 'not-found',
  }, current));
  const report = renderGrowthReport(current.plan, current.observations, current.registry);
  assert.match(report, /발행량을 늘리지 않고 제목·첫 문단·블로그 주제 설정/);
});
