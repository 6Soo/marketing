import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  renderSupportBody,
  resolveSupportLinks,
  supportBodyOverlapPercent,
  validateSupportWorkspace,
} from './naver-blog-support.mjs';

const draftsPayload = JSON.parse(
  await readFile(new URL('../naver-blog/support-drafts.json', import.meta.url), 'utf8'),
);
const planPayload = JSON.parse(
  await readFile(new URL('../naver-blog/growth-plan.json', import.meta.url), 'utf8'),
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
const rootDir = fileURLToPath(new URL('..', import.meta.url));

function state() {
  return {
    drafts: structuredClone(draftsPayload),
    plan: structuredClone(planPayload),
    stories: structuredClone(storiesPayload),
    guides: structuredClone(guidesPayload),
    registry: structuredClone(registryPayload),
    rootDir,
  };
}

function publicRegistry() {
  return {
    schemaVersion: 1,
    channel: 'naver-blog',
    posts: [{
      slug: 'sado',
      idempotencyKey: 'sado:source:guide:content',
      contentDigest: 'content-digest',
      url: 'https://blog.naver.com/foresttour/123456789',
      blogId: 'foresttour',
      logNo: '123456789',
      verifiedAt: '2026-08-01T00:00:00.000Z',
    }],
  };
}

test('사도 가는 법 지원 글은 신규 공식 출처·별도 사진·낮은 중복률을 실측 통과한다', async () => {
  const current = state();
  const result = await validateSupportWorkspace(current);
  assert.deepEqual(result.errors, []);
  const metric = result.metrics.get('sado-access');
  assert.equal(metric.bodyLength, 4935);
  assert.equal(metric.overlapPercent, 1.3);
  assert.equal(metric.newOfficialSourceCount, 6);
  assert.equal(metric.verifiedImageCount, 2);
  assert.equal(metric.publishReady, false);
});

test('지원 글 본문은 검색 첫 문단·공식 링크·사진 출처·저압력 연결을 포함한다', () => {
  const current = state();
  const draft = current.drafts.drafts[0];
  const body = renderSupportBody(draft, current.registry);
  assert.ok(body.startsWith(draft.searchDescription));
  assert.ok(draft.sourceCatalog.every((source) => body.includes(source.url)));
  assert.ok(draft.images.every((image) => body.includes(image.sourcePageUrl)));
  assert.match(body, /기둥 글 공개 URL 검증 뒤 연결/);
  assert.ok(body.includes('현재 공개 예약 화면에서'));
});

test('기둥 글 공개 URL이 검증되어야 내부 링크와 발행 준비가 열린다', async () => {
  const current = state();
  current.registry = publicRegistry();
  const links = resolveSupportLinks(current.drafts.drafts[0], current.registry);
  assert.equal(links.find((link) => link.kind === 'parent-naver-post').url, current.registry.posts[0].url);
  const result = await validateSupportWorkspace(current);
  assert.deepEqual(result.errors, []);
  assert.equal(result.metrics.get('sado-access').publishReady, true);
});

test('사진 바이트와 계획에 적힌 SHA-256이 다르면 발행 준비를 차단한다', async () => {
  const current = state();
  current.drafts.drafts[0].images[0].sha256 = '0'.repeat(64);
  const result = await validateSupportWorkspace(current);
  assert.ok(result.errors.some((error) => error.includes('sha256이 실제 파일')));
});

test('CC BY-SA 사진과 기둥 글 사진 재사용을 차단한다', async () => {
  const current = state();
  const image = current.drafts.drafts[0].images[0];
  image.license = 'CC BY-SA 4.0';
  image.sourcePageUrl = current.stories.stories.find((story) => story.slug === 'sado').hero.pageUrl;
  const result = await validateSupportWorkspace(current);
  assert.ok(result.errors.some((error) => error.includes('CC BY·CC0·Public Domain')));
  assert.ok(result.errors.some((error) => error.includes('기둥 글 사진을 재사용')));
});

test('growth-plan의 검색 의도·출처·실측 중복률과 초안이 어긋나면 실패한다', async () => {
  const current = state();
  const article = current.plan.clusters[0].articles.find((candidate) => candidate.slug === 'sado-access');
  article.primaryQuery = '다른 검색어';
  article.researchEvidence.bodyOverlapPercent = 9.9;
  article.researchEvidence.officialSources.pop();
  const result = await validateSupportWorkspace(current);
  assert.ok(result.errors.some((error) => error.includes('searchIntent가 growth-plan과 다릅니다')));
  assert.ok(result.errors.some((error) => error.includes('신규 공식 출처가 지원 글 실제 출처와 다릅니다')));
  assert.ok(result.errors.some((error) => error.includes('실측 1.3')));
});

test('5어절 중복률은 지원 글 기준으로 결정적으로 계산한다', () => {
  assert.equal(
    supportBodyOverlapPercent('하나 둘 셋 넷 다섯 여섯', '영 다른 하나 둘 셋 넷 다섯'),
    50,
  );
  assert.equal(supportBodyOverlapPercent('짧은 글', '짧은 글'), 0);
});
