import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSupportPackage,
  prepareSupportPackage,
  renderSupportBody,
  resolveSupportLinks,
  supportBodyOverlapPercent,
  validateSupportPackage,
  validateSupportWorkspace,
} from './naver-blog-support.mjs';
import { readPackage, validateUploadManifest } from './naver-blog-content.mjs';

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
  const plan = structuredClone(planPayload);
  const pillar = plan.clusters[0].articles.find((article) => article.slug === 'sado');
  pillar.status = 'staged';
  delete pillar.publicUrl;
  delete pillar.publishedAt;
  return {
    drafts: structuredClone(draftsPayload),
    plan,
    stories: structuredClone(storiesPayload),
    guides: structuredClone(guidesPayload),
    registry: {
      schemaVersion: registryPayload.schemaVersion,
      channel: registryPayload.channel,
      posts: [],
    },
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
  assert.equal(metric.bodyLength, 5927);
  assert.equal(metric.overlapPercent, 0.6);
  assert.equal(metric.newOfficialSourceCount, 7);
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

test('검증된 기둥 URL이 있으면 결정적 지원 패키지를 만들고 공통 stage 입력으로 읽는다', async (t) => {
  const current = state();
  current.registry = publicRegistry();
  const first = await buildSupportPackage('sado-access', current);
  const second = await buildSupportPackage('sado-access', current);
  assert.deepEqual(first, second);
  assert.equal(first.editorialMode, 'search-support-guide');
  assert.ok(first.body.includes(current.registry.posts[0].url));
  assert.equal(first.images.length, 2);
  assert.deepEqual(await validateSupportPackage(first, current), []);

  const tempDir = await mkdtemp(join(tmpdir(), 'naver-support-package-'));
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  const paths = {
    package: join(tempDir, 'package.json'),
    drafts: join(tempDir, 'drafts.json'),
    plan: join(tempDir, 'plan.json'),
    stories: join(tempDir, 'stories.json'),
    guides: join(tempDir, 'guides.json'),
    registry: join(tempDir, 'registry.json'),
  };
  await Promise.all([
    writeFile(paths.package, JSON.stringify(first)),
    writeFile(paths.drafts, JSON.stringify(current.drafts)),
    writeFile(paths.plan, JSON.stringify(current.plan)),
    writeFile(paths.stories, JSON.stringify(current.stories)),
    writeFile(paths.guides, JSON.stringify(current.guides)),
    writeFile(paths.registry, JSON.stringify(current.registry)),
  ]);
  const loaded = await readPackage(paths.package, new Map([
    ['--support-drafts', paths.drafts],
    ['--plan', paths.plan],
    ['--source', paths.stories],
    ['--guides', paths.guides],
    ['--registry', paths.registry],
  ]));
  assert.deepEqual(loaded, first);
});

test('기둥 글 공개 전 패키지 생성과 생성 뒤 본문 변조를 모두 차단한다', async () => {
  const current = state();
  await assert.rejects(
    () => buildSupportPackage('sado-access', current),
    /검증된 공개 URL이 없어/,
  );
  current.registry = publicRegistry();
  const pkg = await buildSupportPackage('sado-access', current);
  pkg.body += '\n임의 변조';
  const errors = await validateSupportPackage(pkg, current);
  assert.ok(errors.some((error) => error.includes('재생성한 값과 다릅니다')));
});

test('공통 stage용 manifest는 이미지 순서·경로·SHA-256 변조를 차단한다', async (t) => {
  const current = state();
  current.registry = publicRegistry();
  const pkg = await buildSupportPackage('sado-access', current);
  const tempDir = await mkdtemp(join(tmpdir(), 'naver-support-manifest-'));
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  const imageDir = join(tempDir, 'images');
  await mkdir(imageDir, { recursive: true });
  const images = [];
  for (const expected of pkg.images) {
    const source = join(rootDir, expected.localPath);
    const localPath = `images/${expected.localPath.split('/').at(-1)}`;
    const bytes = await readFile(source);
    await writeFile(join(tempDir, localPath), bytes);
    images.push({
      order: expected.order,
      localPath,
      sourcePageUrl: expected.sourcePageUrl,
      sha256: expected.sha256,
      byteLength: bytes.length,
      contentType: 'image/jpeg',
      alt: expected.alt,
      caption: expected.caption,
    });
  }
  const manifestPath = join(tempDir, 'upload-manifest.json');
  const manifest = {
    schemaVersion: 1,
    channel: 'naver-blog',
    idempotencyKey: pkg.idempotencyKey,
    uploadOrder: images.map((image) => image.localPath),
    images,
  };
  assert.deepEqual(await validateUploadManifest(pkg, manifest, manifestPath), []);

  manifest.uploadOrder[0] = '../outside.jpg';
  manifest.images[1].sha256 = '0'.repeat(64);
  const errors = await validateUploadManifest(pkg, manifest, manifestPath);
  assert.ok(errors.some((error) => error.includes('안전한 상대 경로')));
  assert.ok(errors.some((error) => error.includes('sha256이 패키지와 다릅니다')));
});

test('prepare는 브라우저 없이 공통 package·원고·manifest·원본 이미지를 결정적으로 쓴다', async (t) => {
  const current = state();
  current.registry = publicRegistry();
  const tempDir = await mkdtemp(join(tmpdir(), 'naver-support-prepare-'));
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  const first = await prepareSupportPackage('sado-access', current, tempDir);
  assert.equal(first.packageState, 'written');
  assert.equal(first.textState, 'written');
  assert.deepEqual(first.manifest.uploadOrder, [
    'images/01-ryotsu-terminal.jpg',
    'images/02-ticket-counter.jpg',
  ]);
  const writtenPackage = JSON.parse(await readFile(join(tempDir, 'package.json'), 'utf8'));
  const writtenText = await readFile(join(tempDir, 'post.txt'), 'utf8');
  assert.deepEqual(writtenPackage, first.pkg);
  assert.ok(writtenText.startsWith(`${first.pkg.title}\n\n`));
  assert.deepEqual(
    await validateUploadManifest(first.pkg, first.manifest, join(tempDir, 'upload-manifest.json')),
    [],
  );

  const second = await prepareSupportPackage('sado-access', current, tempDir);
  assert.equal(second.packageState, 'unchanged');
  assert.equal(second.textState, 'unchanged');
});

test('지원 글 공개 뒤에는 성장 계획 published 상태와 초안 정본을 함께 검증할 수 있다', async () => {
  const current = state();
  current.registry = publicRegistry();
  const pkg = await buildSupportPackage('sado-access', current);
  current.registry.posts.push({
    slug: 'sado-access',
    idempotencyKey: pkg.idempotencyKey,
    contentDigest: pkg.contentDigest,
    url: 'https://blog.naver.com/foresttour/123456790',
    blogId: 'foresttour',
    logNo: '123456790',
    verifiedAt: '2026-08-04T00:00:00.000Z',
  });
  const article = current.plan.clusters[0].articles.find((candidate) => candidate.slug === 'sado-access');
  article.status = 'published';
  assert.deepEqual((await validateSupportWorkspace(current)).errors, []);

  article.status = 'draft-ready';
  const errors = (await validateSupportWorkspace(current)).errors;
  assert.ok(errors.some((error) => error.includes("'published'여야 합니다")));

  article.status = 'published';
  current.registry.posts.at(-1).contentDigest = 'stale-content-digest';
  const staleErrors = (await validateSupportWorkspace(current)).errors;
  assert.ok(staleErrors.some((error) => error.includes('현재 초안과 다릅니다')));
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
  assert.ok(result.errors.some((error) => error.includes('실측 0.6')));
});

test('5어절 중복률은 지원 글 기준으로 결정적으로 계산한다', () => {
  assert.equal(
    supportBodyOverlapPercent('하나 둘 셋 넷 다섯 여섯', '영 다른 하나 둘 셋 넷 다섯'),
    50,
  );
  assert.equal(supportBodyOverlapPercent('짧은 글', '짧은 글'), 0);
});
