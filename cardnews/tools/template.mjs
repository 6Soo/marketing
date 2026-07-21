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
  :root { --ink: #242019; --paper: #E9E4D3; --red: #9C2B22; }
  .card {
    word-break: keep-all;
    width: 100%; aspect-ratio: 4/5; position: relative; overflow: hidden;
    display: flex; flex-direction: column;
  }
  .pc {
    background-size: cover; background-position: center;
    color: #fff; padding: 20px;
    font-family: "Noto Serif KR", "Nanum Myeongjo", "Apple SD Gothic Neo", serif;
  }
  .wm { position: absolute; top: 16px; left: 18px; font-family: "Pretendard", "Noto Sans KR", sans-serif;
        font-size: .6rem; font-weight: 700; letter-spacing: .08em; color: rgba(255,255,255,.75); }
  .pg { position: absolute; top: 16px; right: 18px; font-family: ui-monospace, monospace;
        font-size: .62rem; color: rgba(255,255,255,.7); font-variant-numeric: tabular-nums; }
  .wm.dark { color: rgba(36,32,25,.55); }
  .pg.dark { color: rgba(36,32,25,.5); }
  .pc-bottom { margin-top: auto; }
  .pc-eye { font-family: ui-monospace, "SF Mono", monospace; font-size: .62rem; letter-spacing: .05em;
            color: rgba(255,255,255,.85); margin-bottom: 8px; text-shadow: 0 1px 6px rgba(0,0,0,.4); }
  .pc-title { font-size: 1.62rem; font-weight: 700; line-height: 1.26; text-wrap: balance;
              text-shadow: 0 1px 10px rgba(0,0,0,.45); margin-bottom: 8px; }
  .pc-body { font-family: "Pretendard", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif; font-size: .82rem;
             line-height: 1.6; color: rgba(255,255,255,.88); text-shadow: 0 1px 6px rgba(0,0,0,.5); }
  .pc-hand { font-style: italic; font-size: .76rem; color: rgba(255,255,255,.72);
             margin-top: 10px; text-shadow: 0 1px 6px rgba(0,0,0,.5); }
  .cover { justify-content: center; }
  .cover-mid { margin-top: auto; margin-bottom: auto; }
  .cover-title { font-size: 2.05rem; font-weight: 700; line-height: 1.22; text-shadow: 0 2px 14px rgba(0,0,0,.5); margin: 10px 0 12px; }
  .cover-sub { font-family: "Pretendard", "Noto Sans KR", sans-serif; font-size: .78rem; letter-spacing: .02em; color: rgba(255,255,255,.85); text-shadow: 0 1px 6px rgba(0,0,0,.5); }
  .paper {
    background: var(--paper); color: var(--ink); padding: 22px;
    font-family: "Noto Serif KR", "Nanum Myeongjo", "Apple SD Gothic Neo", serif;
  }
  .paper h2 { font-size: 1.5rem; line-height: 1.3; font-weight: 600; text-wrap: balance; margin: 10px 0 8px; }
  .mono { font-family: ui-monospace, "SF Mono", Consolas, monospace; font-size: .66rem; letter-spacing: .04em; color: #55503F; }
  .body { font-size: .9rem; line-height: 1.62; margin-top: 8px; text-wrap: balance; }
  .hand { font-style: italic; font-size: .8rem; color: #6B4A28; margin-top: auto; border-top: 1px dashed #BFB495; padding-top: 9px; }
  .stamp {
    position: absolute; top: 18px; right: 18px; width: 58px; height: 58px; border-radius: 50%;
    border: 1.4px solid var(--red); color: var(--red); display: flex; align-items: center; justify-content: center;
    text-align: center; font-family: ui-monospace, monospace; font-size: .5rem; line-height: 1.2; transform: rotate(8deg); opacity: .9; z-index: 2;
  }
  .pc .stamp { border-color: rgba(255,255,255,.85); color: rgba(255,255,255,.9); }
`;

// 기준본의 스크림(그라디언트) 원문 — 표지용/내지용 두 가지.
const SCRIM_COVER = `linear-gradient(180deg, rgba(10,10,12,.46) 0%, rgba(10,10,12,.30) 45%, rgba(8,8,10,.62) 100%)`;
const SCRIM_BODY = `linear-gradient(180deg, rgba(10,10,12,.34) 0%, rgba(10,10,12,.05) 22%, rgba(10,10,12,0) 42%, rgba(10,10,12,.38) 62%, rgba(8,8,10,.78) 100%)`;

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
      <p class="body" style="margin-top:${c.stamp ? 14 : 10}px;">${esc(c.body)}</p>
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
