import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  acquireLock,
  containsFormalEnding,
  containsForbiddenMeta,
  contentDigest,
  expectedPublicUrl,
  loadContent,
  markManualReview,
  parseIso,
  publicVerifyScript,
  selectDueEntry,
  validatePublishSettingsSnapshot,
  validateQueue,
} from './naver-blog-daily-publish.mjs';

const gateNames = ['sourceAndPhotoRights', 'factsAndDuplicate', 'solHumanWriting', 'terraContent', 'lunaContent', 'productRoute', 'imageTextDomOrder'];

function approvedEntry(overrides = {}) {
  return {
    slug: 'example',
    idempotencyKey: 'example:approved:1',
    status: 'approved',
    publishAfter: '2026-08-08T09:30:00+09:00',
    blogId: 'kkokko_hero',
    contentFile: 'naver-blog/test-content.json',
    reviewers: { solHigh: 'PASS', terraHigh: 'PASS', lunaHigh: 'PASS' },
    gates: Object.fromEntries(gateNames.map((name) => [name, 'PASS'])),
    ...overrides,
  };
}

function queue(entries = []) {
  return {
    schemaVersion: 1,
    channel: 'naver-blog',
    timezone: 'Asia/Seoul',
    schedule: { localTime: '09:30', maxPostsPer24h: 1, failClosed: true },
    entries,
  };
}

test('empty queue passes the fail-closed contract', () => {
  assert.deepEqual(validateQueue(queue()), []);
});

test('승인 큐는 세 모델 PASS와 모든 게이트를 요구한다', () => {
  const invalid = approvedEntry({ reviewers: { solHigh: 'FAIL', terraHigh: 'PASS', lunaHigh: 'PASS' } });
  assert.ok(validateQueue(queue([invalid])).some((error) => error.includes('reviewers.solHigh')));
  assert.ok(validateQueue(queue([invalid])).some((error) => error.includes('contentDigest')));
});

test('승인 설정은 전체공개·검색허용의 선택 상태를 모두 확인한다', () => {
  assert.deepEqual(validatePublishSettingsSnapshot({ publicSelected: true, searchSelected: true }), []);
  assert.ok(validatePublishSettingsSnapshot({ publicSelected: true, searchSelected: false }).some((error) => error.includes('검색허용')));
});

test('콘텐츠 fingerprint는 title·사진 순서·문장을 포함한다', () => {
  const base = {
    title: '일본 여행',
    tags: ['일본', '여행', '숲길'],
    images: [{ path: 'C:/AX/marketing/a.jpg', alt: 'a' }],
    texts: [{ text: '장면이 남아요.' }],
    ctaUrl: '',
  };
  assert.notEqual(contentDigest(base), contentDigest({ ...base, texts: [{ text: '다른 장면이에요.' }] }));
});

test('24시간 안에 공개한 기록이 있으면 due 글을 고르지 않는다', () => {
  const selected = selectDueEntry(
    queue([approvedEntry()]),
    { posts: [{ idempotencyKey: 'other', verifiedAt: '2026-08-08T10:00:00+09:00' }] },
    Date.parse('2026-08-08T18:00:00+09:00'),
  );
  assert.equal(selected.entry, null);
  assert.match(selected.reason, /24시간/);
});

test('due 승인 글을 고르되 이미 공개된 멱등키는 건너뛴다', () => {
  const selected = selectDueEntry(
    queue([approvedEntry()]),
    { posts: [] },
    Date.parse('2026-08-08T10:00:00+09:00'),
  );
  assert.equal(selected.entry.slug, 'example');
  const duplicate = selectDueEntry(
    queue([approvedEntry()]),
    { posts: [{ idempotencyKey: 'example:approved:1', verifiedAt: '2026-08-01T10:00:00+09:00' }] },
    Date.parse('2026-08-08T10:00:00+09:00'),
  );
  assert.equal(duplicate.entry, null);
});

test('ISO 날짜 파서는 잘못된 값을 null로 돌린다', () => {
  assert.equal(parseIso('not-a-date'), null);
  assert.equal(parseIso('2026-08-08T09:30:00+09:00'), Date.parse('2026-08-08T09:30:00+09:00'));
});

test('해요체 게이트는 갑니다·입니다 같은 합쇼체도 차단한다', () => {
  assert.equal(containsFormalEnding('가미코지로 갑니다.'), true);
  assert.equal(containsFormalEnding('이번 일정은 여유롭습니다.'), true);
  assert.equal(containsFormalEnding('숲길이 참 좋아요.'), false);
});

test('CTA 설명용 모집 라벨은 공개 원고에서 차단한다', () => {
  assert.equal(containsForbiddenMeta('함께 떠나보시겠어요? 카페 모객글: https://cafe.daum.net/example'), true);
  assert.equal(containsForbiddenMeta('함께 떠나보시겠어요? https://cafe.daum.net/example'), false);
});

test('발행 후 공개 검증·저장 오류가 나면 승인 큐를 수동검토로 고정한다', () => {
  const entry = approvedEntry();
  const next = markManualReview(
    queue([entry]),
    entry,
    Object.assign(new Error('registry write failed'), { publicUrl: 'https://blog.naver.com/kkokko_hero/224400000000' }),
    '2026-08-08T12:00:00.000Z',
  );
  assert.equal(next.entries[0].status, 'manual-review-required');
  assert.equal(next.entries[0].publicUrl, 'https://blog.naver.com/kkokko_hero/224400000000');
  assert.match(next.entries[0].lastError, /registry write failed/);
});

test('발행 후 URL은 기존 entry.publicUrl이 아니라 실제 브라우저 URL을 사용한다', () => {
  const entry = { blogId: 'kkokko_hero', publicUrl: 'https://blog.naver.com/kkokko_hero/224399999999' };
  assert.equal(expectedPublicUrl(entry, 'https://blog.naver.com/kkokko_hero/224400000000'), 'https://blog.naver.com/kkokko_hero/224400000000');
  assert.equal(expectedPublicUrl(entry, 'https://blog.naver.com/other/224400000000'), '');
});

test('공개 검증 스크립트는 Naver mainFrame iframe과 비로그인 상태를 검사한다', () => {
  const script = publicVerifyScript({
    title: '일본 여행',
    images: [{ path: 'C:/AX/marketing/a.jpg' }],
    texts: [{ text: '숲길이 좋아요.' }],
    endBlocks: [],
  });
  assert.match(script, /mainFrame/);
  assert.match(script, /contentDocument/);
  assert.match(script, /anonymous/);
});

test('승인 후 콘텐츠가 바뀌거나 사진 바이트가 바뀌면 각각 digest·SHA 게이트가 실패한다', async (t) => {
  const repoRoot = 'C:/AX/marketing';
  await mkdir(join(repoRoot, '_stage'), { recursive: true });
  const dir = await mkdtemp(join(repoRoot, '_stage/naver-blog-daily-test-'));
  t.after(async () => rm(dir, { recursive: true, force: true }));
  const imagePath = join(dir, 'photo.jpg');
  const contentPath = join(dir, 'content.json');
  await writeFile(imagePath, 'original-image');
  const content = {
    title: '숲길 사진 기록',
    tags: ['일본', '여행', '숲길'],
    images: [{ path: imagePath, alt: '숲길' }],
    texts: [{ text: '나무 사이로 빛이 내려와요.' }],
    endBlocks: [],
  };
  const normalized = { ...content, images: [{ path: imagePath, alt: '숲길' }], texts: [{ text: '나무 사이로 빛이 내려와요.' }], endBlocks: [] };
  const imageSha = createHash('sha256').update('original-image').digest('hex');
  const entry = {
    ...approvedEntry(),
    contentFile: contentPath,
    contentDigest: contentDigest(normalized),
    reviewedContentDigest: contentDigest(normalized),
    imageSha256: [imageSha],
  };
  await writeFile(contentPath, `${JSON.stringify(content)}\n`);
  await loadContent(entry);

  await writeFile(contentPath, `${JSON.stringify({ ...content, texts: [{ text: '내용을 바꿨어요.' }] })}\n`);
  await assert.rejects(loadContent(entry), /CONTENT_DIGEST_MISMATCH/);
  await writeFile(contentPath, `${JSON.stringify(content)}\n`);
  await writeFile(imagePath, 'changed-image');
  await assert.rejects(loadContent(entry), /IMAGE_SHA256_MISMATCH/);
});

test('발행 잠금은 동시 실행을 차단하고 정상 종료 뒤 해제된다', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'naver-blog-lock-test-'));
  t.after(async () => rm(dir, { recursive: true, force: true }));
  const lockPath = join(dir, 'daily-publish.lock');
  const release = await acquireLock(lockPath);
  try {
    await assert.rejects(acquireLock(lockPath), /PUBLISH_LOCKED/);
  } finally {
    await release();
  }
  const releaseAgain = await acquireLock(lockPath);
  await releaseAgain();
});
