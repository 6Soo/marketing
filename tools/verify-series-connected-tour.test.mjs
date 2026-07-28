import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import {
  FAIL_CLOSED_TOUR_POLICIES,
  extractPublishCaption,
  verifyConnectedTourContract,
} from './verify-series-connected-tour.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SERIES_ROOT = join(REPO, 'cardnews', 'series');

function loadSeriesNames() {
  return readdirSync(SERIES_ROOT, { withFileTypes: true })
    .filter(e => e.isDirectory() && existsSync(join(SERIES_ROOT, e.name, 'cards.mjs')))
    .map(e => e.name)
    .sort();
}

async function loadSeries(name) {
  const dir = join(SERIES_ROOT, name);
  const { default: series } = await import(pathToFileURL(join(dir, 'cards.mjs')));
  let captionRaw;
  for (const cand of ['캡션.md', 'caption.txt', 'caption.md']) {
    const p = join(dir, cand);
    if (existsSync(p)) { captionRaw = readFileSync(p, 'utf8'); break; }
  }
  return { name, series, captionRaw };
}

test('실제 시리즈 전부가 connectedTour 계약을 통과한다', async () => {
  const names = loadSeriesNames();
  assert.ok(names.length >= 4, `시리즈를 찾지 못했습니다: ${names.join(', ')}`);
  for (const name of names) {
    const loaded = await loadSeries(name);
    const result = verifyConnectedTourContract(loaded);
    assert.equal(result.name, name);
  }
});

test('공개 일정이 연결된 시리즈와 연결되지 않은 시리즈가 실제 데이터에서 구분된다', async () => {
  const results = [];
  for (const name of loadSeriesNames()) results.push(verifyConnectedTourContract(await loadSeries(name)));
  const linked = results.filter(r => r.linked).map(r => r.name);
  const unlinked = results.filter(r => !r.linked).map(r => r.name);
  assert.deepEqual(linked, ['northern-alps']);
  assert.deepEqual(unlinked, ['hida', 'sado', 'sanriku']);
  const alps = results.find(r => r.name === 'northern-alps');
  assert.equal(alps.productId, 'fNod');
  assert.ok(FAIL_CLOSED_TOUR_POLICIES.has(alps.policy));
});

// ── 일부러 깨뜨린 픽스처 ───────────────────────────────────────
const linkedFixture = () => ({
  name: 'fixture',
  captionRaw: '여행지 이야기만 담은 캡션입니다.',
  series: {
    meta: {
      landing: {
        connectedTour: {
          productId: 'fNod',
          requiredTitleTerms: ['알펜루트'],
          policy: 'reservation-api-runtime-fail-closed',
        },
      },
    },
    cards: [{ id: 'cover-a', kind: 'cover', title: '북알프스', sub: '길의 기록' }],
  },
});

const unlinkedFixture = () => ({
  name: 'fixture',
  captionRaw: '여행지 이야기만 담은 캡션입니다.',
  series: {
    meta: { landing: { connectedTour: null } },
    cards: [{ id: 'cover-a', kind: 'cover', title: '사도', sub: '광산이 멈춘 뒤에도' }],
  },
});

test('깨뜨린 픽스처 — connectedTour 키 자체가 없으면 거부한다', () => {
  const broken = unlinkedFixture();
  delete broken.series.meta.landing.connectedTour;
  assert.throws(() => verifyConnectedTourContract(broken), /connectedTour 키가 없습니다/);
});

test('깨뜨린 픽스처 — productId·정책·매칭 조건이 빠지면 거부한다', () => {
  for (const [key, message] of [['productId', /productId/], ['policy', /policy가 없습니다/], ['requiredTitleTerms', /매칭 조건이 하나도 없습니다/]]) {
    const broken = linkedFixture();
    delete broken.series.meta.landing.connectedTour[key];
    assert.throws(() => verifyConnectedTourContract(broken), message);
  }
});

test('깨뜨린 픽스처 — 빈 매칭 조건은 조건 있음으로 인정하지 않는다', () => {
  const broken = linkedFixture();
  broken.series.meta.landing.connectedTour.requiredTitleTerms = [];
  assert.throws(() => verifyConnectedTourContract(broken), /비어 있지 않은 문자열 배열/);
});

test('깨뜨린 픽스처 — fail-closed가 아닌 정책은 거부한다', () => {
  for (const policy of ['always-show', 'reservation-api-runtime-fail-open', 'static']) {
    const broken = linkedFixture();
    broken.series.meta.landing.connectedTour.policy = policy;
    assert.throws(() => verifyConnectedTourContract(broken), /fail-closed 정책이 아닙니다/);
  }
});

test('깨뜨린 픽스처 — 본문 예약 딥링크가 connectedTour 상품과 다르면 거부한다', () => {
  const broken = linkedFixture();
  broken.series.cards[0].sub = '예매: https://reserve.foresttour.kr/tour/zzzz?from=insta';
  assert.throws(() => verifyConnectedTourContract(broken), /connectedTour.productId/);
});

test('깨뜨린 픽스처 — 연결된 일정이 없는데 카드에 상거래 문구가 있으면 거부한다', () => {
  const cases = [
    ['https://reserve.foresttour.kr/tour/fNod?from=insta', /예약 링크/],
    ['지금 예약하세요', /예약·모객 문구/],
    ['다음 출발 10월', /출발일 약속/],
    ['3박 4일 일정', /박수 표기/],
    ['1,290,000원부터', /가격 표기/],
  ];
  for (const [text, message] of cases) {
    const broken = unlinkedFixture();
    broken.series.cards[0].sub = text;
    assert.throws(() => verifyConnectedTourContract(broken), message);
  }
});

test('깨뜨린 픽스처 — 연결된 일정이 없는데 게시 캡션에 상거래 문구가 있으면 거부한다', () => {
  const broken = unlinkedFixture();
  broken.captionRaw = '# 게시 본문\n---\n사도 이야기입니다. 다음 출발은 10월입니다.\n---\n# 게시 전 확인';
  assert.throws(() => verifyConnectedTourContract(broken), /게시 캡션에 출발일 약속/);
});

test('캡션 검토 메모는 게시 본문이 아니므로 계약 검사 대상이 아니다', () => {
  const raw = '# 게시 본문\n---\n사도 이야기입니다.\n---\n# 게시 전 확인\n- 출발일·박수·예약 문구를 추가하지 않는다.';
  assert.equal(extractPublishCaption(raw), '사도 이야기입니다.');
  const ok = unlinkedFixture();
  ok.captionRaw = raw;
  assert.equal(verifyConnectedTourContract(ok).linked, false);
});
