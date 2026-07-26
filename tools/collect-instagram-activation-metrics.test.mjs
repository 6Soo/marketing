import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractForesttourMetrics,
  extractInstagramMetrics,
} from './collect-instagram-activation-metrics.mjs';

test('permalink로 대상 게시물을 찾아 Instagram 지표를 정규화한다', () => {
  const snapshot = {
    media: [{
      media: {
        permalink: 'https://www.instagram.com/p/example/',
        like_count: 3,
        comments_count: 2,
      },
      insights: {
        data: [
          { name: 'reach', values: [{ value: 120 }] },
          { name: 'saved', total_value: { value: 4 } },
          { name: 'shares', values: [{ value: 5 }] },
        ],
      },
    }],
  };
  assert.deepEqual(
    extractInstagramMetrics(snapshot, 'https://www.instagram.com/p/example'),
    { reach: 120, saves: 4, shares: 5, likes: 3, comments: 2 },
  );
});

test('다른 게시물 지표를 대신 사용하지 않는다', () => {
  assert.throws(
    () => extractInstagramMetrics({ media: [] }, 'https://www.instagram.com/p/missing/'),
    /찾지 못했습니다/,
  );
});

test('고유 sourceCode의 foresttour 퍼널만 합산하고 관측된 0을 보존한다', () => {
  const experiment = {
    sourceCode: 'insta-carousel-sado',
    foresttourMetrics: ['story_sado_visit', 'story_sado_context', 'story_sado_tour'],
  };
  const payload = {
    funnelRows: [
      { source: 'insta-carousel-sado', event: 'story_sado_visit', count: 2 },
      { source: 'insta-carousel-sado', event: 'story_sado_visit', count: 1 },
      { source: 'insta', event: 'story_sado_visit', count: 99 },
      { source: 'insta-carousel-sado', event: 'story_sado_context', count: 1 },
    ],
  };
  assert.deepEqual(extractForesttourMetrics(payload, experiment), {
    story_sado_visit: 3,
    story_sado_context: 1,
    story_sado_tour: 0,
  });
});
