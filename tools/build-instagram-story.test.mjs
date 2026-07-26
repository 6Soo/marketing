import assert from 'node:assert/strict';
import test from 'node:test';
import { storyManifest } from './build-instagram-story.mjs';

const verified = {
  meta: {
    episode: '사도 편',
    photoStatus: 'verified',
    story: { stickerLabel: '사도 이야기 이어보기' },
    landing: {
      storyPath: '/stories/sado',
      sources: { story: 'insta-story-sado' },
    },
  },
};

test('검증된 Story 패키지는 전용 링크와 측정 계약을 함께 만든다', () => {
  const manifest = storyManifest(
    verified,
    'cardnews/series/sado',
    'C:/stage/sado/01-discovery-link.jpg',
  );
  assert.equal(manifest.asset, '01-discovery-link.jpg');
  assert.equal(
    manifest.linkSticker.url,
    'https://foresttour.kr/stories/sado?from=insta-story-sado',
  );
  assert.equal(manifest.measurement.expectedEvent, 'story_sado_visit');
  assert.equal(manifest.measurement.environment, 'instagram-app');
  assert.equal(manifest.publishGate, '24h-checkpoint-recorded');
});

test('placeholder 사진은 Story 패키지 단계에서 차단한다', () => {
  assert.throws(
    () => storyManifest(
      { ...verified, meta: { ...verified.meta, photoStatus: 'placeholder' } },
      'cardnews/series/sanriku',
      '01.jpg',
    ),
    /verified/,
  );
});
