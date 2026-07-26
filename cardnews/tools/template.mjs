// 카드뉴스 템플릿 — 기준본(cardnews/나만몰랐던일본-001-히다.html)의 CSS·구조를 그대로 복사.
// ⚠ 비주얼 계약(CLAUDE.md): 새 디자인 창작 금지. 카드 CSS는 기준본에서 옮겨온 원문이며,
//   내용 슬롯(eye/title/body/hand)만 데이터에서 채운다. 수정할 일이 생기면 기준본을 먼저 고치고
//   여기로 다시 복사한다(단일 원천 = 기준본).
//
// 렌더 원리: 기준본 카드는 300×375(4:5) 기준으로 설계돼 있다(rem·px 혼용).
// 1080×1350 실게시 PNG는 이 원판 DOM을 CSS transform: scale(3.6)으로 확대해 캡처한다 —
// 글리프는 벡터라 확대 후에도 선명하고, px 값 비율이 기준본과 1:1로 유지된다.

// ── 기준본 카드 CSS 원문 (리뷰 페이지 크롬 제외, 카드 관련 부분만) ──
const CARD_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --ink: #242019; --paper: #E9E4D3; --red: #9C2B22; --forest: #354B36; }
  .card {
    word-break: keep-all;
    width: 100%; aspect-ratio: 4/5; position: relative; overflow: hidden;
    display: flex; flex-direction: column;
    -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
  }
  .pc {
    background-size: cover; background-position: center;
    color: #fff; padding: 22px;
    font-family: "Noto Serif KR", "Nanum Myeongjo", "Apple SD Gothic Neo", serif;
  }
  .wm { position: absolute; top: 18px; left: 22px; font-family: "Noto Sans KR", "Malgun Gothic", sans-serif;
        font-size: .58rem; font-weight: 700; letter-spacing: .1em; color: rgba(255,255,255,.82);
        text-shadow: 0 1px 8px rgba(0,0,0,.5); }
  .pg { position: absolute; top: 18px; right: 22px; font-family: ui-monospace, "SF Mono", monospace;
        font-size: .6rem; color: rgba(255,255,255,.78); font-variant-numeric: tabular-nums;
        text-shadow: 0 1px 8px rgba(0,0,0,.45); }
  .wm.dark { color: rgba(36,32,25,.55); }
  .pg.dark { color: rgba(36,32,25,.5); }
  .pc-bottom { margin-top: auto; max-width: 100%; }
  .pc-bottom::before { content: ""; display: block; width: 24px; height: 2px; margin-bottom: 10px;
                       background: rgba(255,255,255,.9); }
  .pc-eye { font-family: "Noto Sans KR", "Malgun Gothic", sans-serif; font-size: .6rem; font-weight: 650;
            letter-spacing: .06em; color: rgba(255,255,255,.86); margin-bottom: 8px;
            text-shadow: 0 1px 7px rgba(0,0,0,.55); }
  .pc-title { font-size: 1.58rem; font-weight: 700; line-height: 1.24; letter-spacing: -.015em;
              text-wrap: balance; text-shadow: 0 2px 12px rgba(0,0,0,.62); margin-bottom: 9px; }
  .pc-body { font-family: "Noto Sans KR", "Malgun Gothic", sans-serif; font-size: .8rem;
             font-weight: 450; line-height: 1.58; color: rgba(255,255,255,.94);
             text-shadow: 0 1px 7px rgba(0,0,0,.65); max-width: 31ch; }
  .pc-hand { font-size: .7rem; line-height: 1.45; color: rgba(255,255,255,.78);
             margin-top: 10px; text-shadow: 0 1px 7px rgba(0,0,0,.6); }
  .cover { justify-content: center; }
  .cover-mid { margin-top: auto; margin-bottom: 28px; }
  .cover-mid::before { content: ""; display: block; width: 30px; height: 2px; margin-bottom: 11px;
                       background: rgba(255,255,255,.92); }
  .cover-title { font-size: 1.94rem; font-weight: 700; line-height: 1.2; letter-spacing: -.018em;
                 text-wrap: balance; text-shadow: 0 2px 15px rgba(0,0,0,.68); margin: 9px 0 13px; }
  .cover-sub { font-family: "Noto Sans KR", "Malgun Gothic", sans-serif; font-size: .74rem;
               line-height: 1.5; letter-spacing: .01em; color: rgba(255,255,255,.9);
               text-shadow: 0 1px 7px rgba(0,0,0,.65); max-width: 29ch; }
  .paper {
    background-color: var(--paper); color: var(--ink); padding: 24px 22px 22px;
    background-image: repeating-linear-gradient(180deg, transparent 0, transparent 31px,
                      rgba(68,75,55,.055) 31px, rgba(68,75,55,.055) 32px);
    font-family: "Noto Serif KR", "Nanum Myeongjo", "Apple SD Gothic Neo", serif;
  }
  .paper::after { content: ""; position: absolute; top: 0; bottom: 0; left: 12px; width: 1px;
                  background: rgba(156,43,34,.18); }
  .paper h2 { font-size: 1.42rem; line-height: 1.28; font-weight: 650; letter-spacing: -.01em;
              text-wrap: balance; margin: 11px 0 8px; }
  .mono { font-family: ui-monospace, "SF Mono", Consolas, monospace; font-size: .62rem;
          letter-spacing: .06em; color: #55503F; }
  .body { font-size: .84rem; line-height: 1.62; margin-top: 8px; text-wrap: balance; }
  .summary-list { list-style: none; margin-top: 12px; display: grid; gap: 8px; }
  .summary-list li { display: grid; grid-template-columns: 24px 1fr; align-items: baseline;
                     font-family: "Noto Sans KR", "Malgun Gothic", sans-serif; font-size: .7rem;
                     line-height: 1.4; padding-bottom: 7px; border-bottom: 1px solid rgba(85,80,63,.16); }
  .summary-list b { color: var(--red); font-family: ui-monospace, "SF Mono", monospace;
                    font-size: .58rem; letter-spacing: .04em; }
  .hand { font-size: .7rem; line-height: 1.45; color: #6B4A28; margin-top: auto;
          border-top: 1px dashed #BFB495; padding-top: 9px; }
  .stamp {
    position: absolute; top: 18px; right: 18px; width: 58px; height: 58px; border-radius: 50%;
    border: 1.4px solid var(--red); color: var(--red); display: flex; align-items: center; justify-content: center;
    text-align: center; font-family: ui-monospace, monospace; font-size: .5rem; line-height: 1.2; transform: rotate(8deg); opacity: .9; z-index: 2;
  }
  .pc .stamp { border-color: rgba(255,255,255,.85); color: rgba(255,255,255,.9); }
`;

// 기준본의 스크림(그라디언트) 원문 — 표지용/내지용 두 가지.
const SCRIM_COVER = `linear-gradient(180deg, rgba(8,12,10,.34) 0%, rgba(8,12,10,.08) 42%, rgba(8,10,9,.76) 100%)`;
const SCRIM_BODY = `linear-gradient(180deg, rgba(8,12,10,.28) 0%, rgba(8,12,10,.02) 32%, rgba(8,10,9,.18) 53%, rgba(8,10,9,.86) 100%)`;

const esc = s => (s ?? '');

// kind별 카드 마크업 — 기준본 DOM 구조 그대로.
function cardBody(meta, c, page, total) {
  const wmpg = dark => `<div class="wm${dark ? ' dark' : ''}">${esc(meta.watermark)}</div><div class="pg${dark ? ' dark' : ''}">${page}/${total}</div>`;
  if (c.kind === 'cover') {
    return `
    <div class="card pc cover" style="background-image: ${SCRIM_COVER}, url('${c.photoUrl}');">
      <div class="stamp">숲길<br>RECORD</div>
      <div class="cover-mid">
        <p class="pc-eye">${esc(meta.series)} · ${esc(meta.number)}</p>
        <h2 class="cover-title">${esc(c.title)}</h2>
        <p class="cover-sub">${esc(c.sub)}</p>
      </div>
    </div>`;
  }
  if (c.kind === 'paper') {
    return `
    <div class="card paper">
      ${c.stamp ? `<div class="stamp">${esc(c.stamp)}</div>` : wmpg(true)}
      <p class="mono"${c.stamp ? '' : ' style="margin-top:18px;"'}>${esc(c.eye)}</p>
      <h2>${esc(c.title)}</h2>
      ${c.items?.length
        ? `<ul class="summary-list">${c.items.map((item, i) => `<li><b>${String(i + 1).padStart(2, '0')}</b><span>${esc(item)}</span></li>`).join('')}</ul>`
        : `<p class="body" style="margin-top:${c.stamp ? 14 : 10}px;">${esc(c.body)}</p>`}
      <p class="hand">${esc(c.hand)}</p>
    </div>`;
  }
  return `
    <div class="card pc" style="background-image: ${SCRIM_BODY}, url('${c.photoUrl}');">
      ${wmpg(false)}
      <div class="pc-bottom">
        <p class="pc-eye">${esc(c.eye)}</p>
        <h2 class="pc-title">${esc(c.title)}</h2>
        <p class="pc-body">${esc(c.body)}</p>
        ${c.hand ? `<p class="pc-hand">${esc(c.hand)}</p>` : ''}
      </div>
    </div>`;
}

// 1080×1350 캡처용 페이지: 300×375 원판을 3.6배 확대.
export function cardHTML(meta, card, page, total) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
    ${CARD_CSS}
    html, body { width: 1080px; height: 1350px; overflow: hidden; background: #000; }
    .scalebox { width: 300px; height: 375px; transform: scale(3.6); transform-origin: top left; }
  </style></head><body><div class="scalebox">${cardBody(meta, card, page, total)}</div></body></html>`;
}

export { CARD_CSS, SCRIM_COVER, SCRIM_BODY, cardBody };
