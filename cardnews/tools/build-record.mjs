// 기록용 HTML 빌더 — 기준본(나만몰랐던일본-001-히다.html)과 같은 검토 페이지를 시리즈에서 생성.
// 카드 마크업·CSS는 template.mjs(=기준본 원문)를 그대로 쓰고, 사진은 소형 크롭을 base64 임베드해
// 파일 하나로 자립시킨다(기준본과 동일 관례).
//
// 사용: node cardnews/tools/build-record.mjs cardnews/series/sanriku <소형사진폴더> <출력.html>

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CARD_CSS, cardBody } from './template.mjs';

const [seriesDir, smallDir, outPath] = process.argv.slice(2);
if (!outPath) {
  console.error('사용법: node build-record.mjs <시리즈 폴더> <소형사진 폴더> <출력.html>');
  process.exit(1);
}
const dir = resolve(seriesDir);
const { default: series } = await import(pathToFileURL(join(dir, 'cards.mjs')));
const meta = series.meta;

// 캡션: 시리즈 폴더 캡션.md의 --- 사이 본문을 그대로 싣는다.
let caption = '';
const capPath = join(dir, '캡션.md');
if (existsSync(capPath)) {
  const m = readFileSync(capPath, 'utf8').split(/\r?\n---\r?\n/);
  if (m[1]) caption = m[1].trim();
}

const b64 = id => {
  const p = join(resolve(smallDir), `${id}.jpg`);
  return existsSync(p) ? `data:image/jpeg;base64,${readFileSync(p).toString('base64')}` : '';
};

const numbered = series.cards.filter(c => c.kind !== 'cover');
const total = numbered.length + 1;
const cols = series.cards.map(card => {
  const page = card.kind === 'cover' ? 1 : numbered.indexOf(card) + 2;
  const c = card.photo ? { ...card, photoUrl: b64(card.id) } : card;
  const label = card.kind === 'cover' ? (card.variant || '표지') : (card.eye || card.id);
  return `
    <div class="card-col">
      ${cardBody(meta, c, page, total)}
      <div class="card-cap"><span>${label}</span><span>${page}/${total}</span></div>
    </div>`;
}).join('\n');

// 기준본의 페이지 크롬 CSS(카드 CSS는 template.mjs에서).
const PAGE_CSS = `
  :root { --bg: #EFEBE0; --bg2: #E6E1D2; --fg: #221F1A; --dim: #6E6656; --accent: #3F5C3B; --line: #D9D3C2; }
  @media (prefers-color-scheme: dark) { :root { --bg: #18160F; --bg2: #201D15; --fg: #EDE7D8; --dim: #9C9484; --accent: #8FAE8A; --line: #332F24; } }
  html, body { background: var(--bg); color: var(--fg); font-family: "Pretendard", "Apple SD Gothic Neo", -apple-system, "Malgun Gothic", sans-serif; -webkit-font-smoothing: antialiased; overflow-x: clip; }
  .wrap { max-width: 1040px; margin: 0 auto; padding: clamp(28px,6vw,64px) clamp(16px,5vw,40px) 48px; }
  .eyebrow { font-size: .72rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); margin-bottom: 14px; }
  h1 { font-size: clamp(1.8rem,5vw,2.7rem); font-weight: 800; line-height: 1.2; letter-spacing: -.01em; text-wrap: balance; margin-bottom: 14px; }
  .brief { max-width: 52ch; font-size: .98rem; line-height: 1.65; color: var(--dim); }
  .brief b { color: var(--fg); }
  .note { margin-top: 16px; font-size: .8rem; color: var(--dim); border-left: 2px solid var(--line); padding-left: 12px; line-height: 1.6; max-width: 52ch; }
  .card-row { display: flex; gap: 18px; overflow-x: auto; padding: 30px 0 10px; scroll-snap-type: x proximity; touch-action: pan-x pan-y; }
  @media (pointer: coarse) { .card-row { scroll-snap-type: none; } } /* 안드로이드 세로 제스처 가로채기 방지(기준본 동기화) */
  .card-col { flex: 0 0 auto; width: min(78vw, 300px); scroll-snap-align: start; }
  .card-cap { margin-top: 10px; font-size: .74rem; color: var(--dim); display: flex; justify-content: space-between; font-variant-numeric: tabular-nums; }
  .foot { margin-top: 48px; padding-top: 18px; border-top: 1px solid var(--line); font-size: .85rem; line-height: 1.7; color: var(--dim); max-width: 62ch; }
  .foot b { color: var(--fg); }
`;

const html = `<title>${meta.series} ${meta.number} ${meta.episode} — 인스타 카드</title>
<style>${PAGE_CSS}${CARD_CSS}</style>
<div class="wrap">
  <header>
    <p class="eyebrow">숲길따라 감성여행 · Instagram — ${meta.series} ${meta.number}</p>
    <h1>${meta.episode} — 여행지 소개판</h1>
    <p class="brief"><b>제0원칙 + 훅 독트린 적용.</b> 표지는 "구체적 대상 + 숨긴 결론"(궁금증 갭)으로 세우고,
    본문 사실은 전부 출처 검증(series/sanriku/사실-검증.md — 독립 반박 검증 오류 0건). 상품 연결은
    캡션·프로필 링크만 담당합니다. 마지막 장은 저장할 수 있는 핵심 요약으로 구성했습니다.</p>
    <p class="note">실게시 PNG(1080×1350)는 cardnews/out/${basename(dir)}/ — 렌더는
    <b>node cardnews/tools/render.mjs cardnews/series/${basename(dir)}</b>. 사진은 전부 Pexels 분위기
    대역(photos/${basename(dir)}/출처.md) — 모객글·대장 실사진 확보 시 교체 1순위.</p>
  </header>
  <div class="card-row">
${cols}
  </div>
  ${caption ? `<section style="margin-top:44px;max-width:62ch;">
    <p class="eyebrow" style="margin-bottom:10px;">함께 올릴 캡션 초안</p>
    <div style="background:var(--bg2);border:1px solid var(--line);padding:18px 20px;font-size:.92rem;line-height:1.75;white-space:pre-wrap;">${caption}</div>
  </section>` : ''}
  <footer class="foot">
    <p><b>게시 전 확인</b> — ① 사진 전부 Pexels 대역이므로 실사진 확보 시 교체
    (검색어·출처: photos/${basename(dir)}/출처.md). ② 사실 검증은 완료(사실-검증.md).
    ③ 프로필 링크는 https://foresttour.kr.</p>
  </footer>
</div>
`;
writeFileSync(resolve(outPath), html);
console.log(`✓ ${outPath}`);
