import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyStoryReady } from './verify-instagram-story-ready.mjs';

const manifest = {
  schemaVersion: 1,
  series: 'sado',
  format: 'instagram-story',
  dimensions: { width: 1080, height: 1920 },
  asset: '01-discovery-link.jpg',
  linkSticker: {
    label: '사도 이야기 이어보기',
    url: 'https://foresttour.kr/stories/sado?from=insta-story-sado',
  },
  publishGate: '24h-checkpoint-recorded',
  measurement: {
    expectedEvent: 'story_sado_visit',
    environment: 'instagram-app',
    source: 'insta-story-sado',
  },
};
const experiment = {
  id: 'sado-003',
  checkpoints: ['0h', '24h', '72h', '7d'],
  attributionEnvironment: 'instagram-app',
  foresttourMetrics: ['story_sado_visit', 'story_sado_context'],
};
const series = {
  meta: {
    landing: {
      storyPath: '/stories/sado',
      sources: { story: 'insta-story-sado' },
    },
  },
};
const published = {
  checkpoint: '0h',
  observedAt: '2026-07-26T18:00:00.000Z',
  publishedPermalink: 'https://www.instagram.com/p/example/',
  metrics: { postsTotal: 1 },
};
const metadata = { format: 'jpeg', width: 1080, height: 1920 };

test('수치가 있는 24h 기준선과 일치하는 계약만 Story 게시 준비를 통과한다', () => {
  const result = verifyStoryReady({
    manifest,
    experiment,
    series,
    records: [
      published,
      { checkpoint: '24h', observedAt: '2026-07-27T18:01:00.000Z', metrics: { reach: 0 } },
    ],
    assetMetadata: metadata,
    now: new Date('2026-07-27T18:02:00.000Z'),
  });
  assert.equal(result.ready, true);
});

test('24h가 미도래했거나 빈 기록뿐이면 Story 게시를 차단한다', () => {
  assert.throws(
    () => verifyStoryReady({
      manifest,
      experiment,
      series,
      records: [
        published,
        { checkpoint: '24h', observedAt: '2026-07-27T18:01:00.000Z', metrics: {} },
      ],
      assetMetadata: metadata,
      now: new Date('2026-07-27T18:02:00.000Z'),
    }),
    /24h 체크포인트가 기록되지 않았습니다/,
  );
});

test('링크·측정 계약이나 자산 규격이 다르면 Story 게시를 차단한다', () => {
  assert.throws(
    () => verifyStoryReady({
      manifest: {
        ...manifest,
        linkSticker: { ...manifest.linkSticker, url: 'https://foresttour.kr/stories/sado?from=band' },
      },
      experiment,
      series,
      records: [
        published,
        { checkpoint: '24h', observedAt: '2026-07-27T18:01:00.000Z', metrics: { reach: 1 } },
      ],
      assetMetadata: { format: 'png', width: 1080, height: 1350 },
      now: new Date('2026-07-27T18:02:00.000Z'),
    }),
    /1080×1920 JPEG[\s\S]*링크 스티커 URL/,
  );
});
