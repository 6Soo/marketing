import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateBandPost } from './band-publish.mjs';

const SERIES = new URL('../cardnews/series/sado', import.meta.url).pathname;

test('Gemini 실패 시 원문을 게시 초안처럼 저장하지 않는다', async () => {
  const output = join(tmpdir(), `band-publish-fail-${process.pid}.txt`);

  await assert.rejects(
    generateBandPost(SERIES, 'wed', {
      output,
      askGemini: async () => {
        throw new Error('테스트 API 실패');
      },
    }),
    /BAND 초안 생성 실패: 테스트 API 실패/,
  );
  assert.equal(existsSync(output), false);
});

test('생성 결과가 비어 있으면 실패한다', async () => {
  const output = join(tmpdir(), `band-publish-empty-${process.pid}.txt`);

  await assert.rejects(
    generateBandPost(SERIES, 'wed', {
      output,
      askGemini: async () => '  ',
    }),
    /BAND 초안 생성 실패: 빈 응답/,
  );
  assert.equal(existsSync(output), false);
});
