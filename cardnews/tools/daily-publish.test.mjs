import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

function createFixture(id, photoStatus, cards) {
  const fixtureDir = join(REPO, 'cardnews', '__gate-fixtures', id);
  const expFile = join(REPO, 'data', 'experiments', `${id}.json`);

  mkdirSync(fixtureDir, { recursive: true });

  const expData = {
    id,
    seriesPath: `cardnews/__gate-fixtures/${id}`,
    sourceCode: 'insta-carousel-fixture',
    landingUrl: 'https://foresttour.kr/stories/fixture?from=insta-carousel-fixture',
  };
  writeFileSync(expFile, JSON.stringify(expData, null, 2), 'utf8');

  const cardsContent = `export default {
  meta: {
    series: '테스트',
    number: '000',
    episode: '픽스처',
    photoStatus: ${JSON.stringify(photoStatus)},
    landing: {
      sources: { carousel: 'insta-carousel-fixture' },
      connectedTour: null,
    },
  },
  cards: ${JSON.stringify(cards, null, 2)},
};
`;
  writeFileSync(join(fixtureDir, 'cards.mjs'), cardsContent, 'utf8');

  return () => {
    rmSync(fixtureDir, { recursive: true, force: true });
    rmSync(expFile, { force: true });
  };
}

test('중복 사진이면 --validate-live가 exit 1로 차단된다', (t) => {
  const id = `gate-fixture-${process.pid}-1`;
  const cleanup = createFixture(id, 'verified', [
    { id: 'cover-a', kind: 'cover', title: '표지', sub: '서브', photo: 'cardnews/photos/sado/03-kitazawa.jpg' },
    { id: 'card-1', kind: 'pc', title: '내지', sub: '서브', photo: 'cardnews/photos/sado/03-kitazawa.jpg' },
  ]);
  t.after(cleanup);

  const res = spawnSync(
    'node',
    ['cardnews/tools/daily-publish.mjs', `--series=cardnews/__gate-fixtures/${id}`, '--validate-live', `--experiment=${id}`],
    { cwd: REPO, encoding: 'utf8' }
  );

  const output = (res.stdout || '') + (res.stderr || '');
  assert.equal(res.status, 1);
  assert.ok(
    output.includes('중복') || output.includes('출처 검증'),
    `출력에 "중복" 또는 "출처 검증"이 포함되어야 합니다. 실제 출력:\n${output}`
  );
});

test('서로 다른 검증된 사진이면 --validate-live가 exit 0으로 통과한다', (t) => {
  const id = `gate-fixture-${process.pid}-2`;
  const cleanup = createFixture(id, 'verified', [
    { id: 'cover-a', kind: 'cover', title: '표지', sub: '서브', photo: 'cardnews/photos/sado/02-goldmine.jpg' },
    { id: 'card-1', kind: 'pc', title: '내지1', sub: '서브', photo: 'cardnews/photos/sado/03-kitazawa.jpg' },
    { id: 'card-2', kind: 'pc', title: '내지2', sub: '서브', photo: 'cardnews/photos/sado/04-taraibune.jpg' },
  ]);
  t.after(cleanup);

  const res = spawnSync(
    'node',
    ['cardnews/tools/daily-publish.mjs', `--series=cardnews/__gate-fixtures/${id}`, '--validate-live', `--experiment=${id}`],
    { cwd: REPO, encoding: 'utf8' }
  );

  assert.equal(res.status, 0);
});

test('photoStatus가 placeholder면 기존대로 exit 1', (t) => {
  const id = `gate-fixture-${process.pid}-3`;
  const cleanup = createFixture(id, 'placeholder', [
    { id: 'cover-a', kind: 'cover', title: '표지', sub: '서브', photo: 'cardnews/photos/sado/02-goldmine.jpg' },
    { id: 'card-1', kind: 'pc', title: '내지1', sub: '서브', photo: 'cardnews/photos/sado/03-kitazawa.jpg' },
    { id: 'card-2', kind: 'pc', title: '내지2', sub: '서브', photo: 'cardnews/photos/sado/04-taraibune.jpg' },
  ]);
  t.after(cleanup);

  const res = spawnSync(
    'node',
    ['cardnews/tools/daily-publish.mjs', `--series=cardnews/__gate-fixtures/${id}`, '--validate-live', `--experiment=${id}`],
    { cwd: REPO, encoding: 'utf8' }
  );

  const output = (res.stdout || '') + (res.stderr || '');
  assert.equal(res.status, 1);
  assert.ok(
    output.includes('사진 상태'),
    `출력에 "사진 상태"가 포함되어야 합니다. 실제 출력:\n${output}`
  );
});
