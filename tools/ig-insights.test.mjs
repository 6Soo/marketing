import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaMetricsForType } from './ig-insights.mjs';

test('FEED와 CAROUSEL은 거부되는 profile_visits·follows를 요청하지 않는다', () => {
  for (const type of ['FEED', 'CAROUSEL_ALBUM', '']) {
    const metrics = mediaMetricsForType(type);
    assert.equal(metrics.includes('profile_visits'), false);
    assert.equal(metrics.includes('follows'), false);
    assert.equal(metrics.includes('reach'), true);
    assert.equal(metrics.includes('views'), true);
  }
});

test('REELS만 profile_visits·follows를 추가 요청한다', () => {
  const metrics = mediaMetricsForType('REELS');
  assert.equal(metrics.includes('profile_visits'), true);
  assert.equal(metrics.includes('follows'), true);
});
