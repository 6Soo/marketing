import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { draftFromSeries } from './blog-draft.mjs';
import { validateBlogPayload } from './blog-content.mjs';

const published = JSON.parse(
  await readFile(new URL('../blog/published/stories.json', import.meta.url), 'utf8'),
);

test('현재 공개 블로그 원고는 fail-closed 게이트를 통과한다', () => {
  assert.deepEqual(validateBlogPayload(published), []);
});

test('자사 블로그 원고는 Instagram 문구와 검증되지 않은 예약 연결을 거부한다', () => {
  const payload = structuredClone(published);
  payload.stories[0].description = 'Instagram에서 이어지는 글';
  payload.stories[0].connectedTour = {
    fldid: '',
    requiredTitleTerms: [],
    ctaLabel: '',
  };
  const errors = validateBlogPayload(payload);
  assert.ok(errors.some((error) => error.includes('Instagram 의존 문구')));
  assert.ok(errors.some((error) => error.includes('connectedTour')));
});

test('verified 글은 현지 촬영·라이선스·원문 근거가 없으면 거부한다', () => {
  const payload = structuredClone(published);
  const story = payload.stories.find((candidate) => candidate.photoStatus === 'verified');
  story.hero.notice = '멋진 사진';
  story.hero.credit = '촬영자 미상';
  delete story.hero.pageUrl;
  const errors = validateBlogPayload(payload);
  assert.ok(errors.some((error) => error.includes("verified 사진은 '현지 촬영'")));
  assert.ok(errors.some((error) => error.includes('재사용 라이선스')));
  assert.ok(errors.some((error) => error.includes('원문 URL')));
});

test('카드 시리즈에서 만드는 초안은 자동 공개되지 않고 검수 공백을 드러낸다', () => {
  const draft = draftFromSeries(
    {
      meta: {
        series: '나만 몰랐던 일본',
        number: '999',
        episode: '테스트 편',
        photoStatus: 'verified',
      },
      cards: [
        { id: 'cover-a', kind: 'cover', title: '첫 질문<br>두 번째 줄', sub: '테스트 지역' },
        { id: '01-road', kind: 'pc', eye: '길', title: '걷는 이유', body: '검증할 본문' },
      ],
    },
    '공식 근거 https://example.go.jp/fact',
    'test-story',
  );
  assert.equal(draft.publicationStatus, 'draft');
  assert.equal(draft.discoveryHook, '첫 질문\n두 번째 줄');
  assert.equal(draft.sources[0].url, 'https://example.go.jp/fact');
  assert.ok(validateBlogPayload({
    schemaVersion: 1,
    site: 'https://foresttour.kr',
    stories: [draft],
  }).length > 0);
});
