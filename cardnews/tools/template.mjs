// 카드뉴스 템플릿 — evidence-v2 (2026-07-26).
// 초기 MVP의 전면 스크림+대형 명조+도장 문법을 폐기하고, 현지 사진을 증거로 크게 보여준 뒤
// 짧은 편집 메모를 분리해 읽는 구조로 개편했다. 목표는 '브랜드 카드뉴스처럼 보이기'가 아니라
// 친구에게 보내고 저장할 수 있는 여행 기록처럼 보이는 것이다.
//
// 렌더 원리: 기준본 카드는 300×375(4:5) 기준으로 설계돼 있다(rem·px 혼용).
// 1080×1350 실게시 PNG는 이 원판 DOM을 CSS transform: scale(3.6)으로 확대해 캡처한다 —
// 글리프는 벡터라 확대 후에도 선명하고, px 값 비율이 기준본과 1:1로 유지된다.

const CARD_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --ink: #181a17; --paper: #F2EFE6; --red: #A43A2E; --forest: #254536; }
  .card {
    word-break: keep-all;
    width: 100%; aspect-ratio: 4/5; position: relative; overflow: hidden;
    display: flex; flex-direction: column;
    font-family: "Noto Sans KR", "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
  }
  .pc {
    background-size: cover; background-position: center top;
    color: var(--ink); padding: 18px;
  }
  .wm { position: absolute; top: 16px; left: 18px; font-size: .5rem; font-weight: 750;
        letter-spacing: .12em; color: rgba(255,255,255,.9); text-transform: uppercase;
        text-shadow: 0 1px 7px rgba(0,0,0,.55); }
  .pg { position: absolute; top: 16px; right: 18px; font-family: ui-monospace, "SF Mono", monospace;
        font-size: .52rem; color: rgba(255,255,255,.88); font-variant-numeric: tabular-nums;
        text-shadow: 0 1px 7px rgba(0,0,0,.55); }
  .wm.dark { color: rgba(36,32,25,.55); }
  .pg.dark { color: rgba(36,32,25,.5); }
  .pc-bottom { margin: auto -18px -18px; max-width: none; min-height: 42%;
               padding: 15px 18px 17px; background: rgba(242,239,230,.97);
               box-shadow: 0 -10px 30px rgba(12,15,12,.12); }
  .pc-bottom::before { content: ""; display: block; width: 18px; height: 3px; margin-bottom: 8px;
                       background: var(--red); }
  .pc-eye { font-size: .52rem; font-weight: 750; letter-spacing: .075em; color: var(--forest);
            margin-bottom: 7px; }
  .pc-title { font-size: 1.2rem; font-weight: 800; line-height: 1.25; letter-spacing: -.035em;
              text-wrap: balance; margin-bottom: 7px; }
  .pc-body { font-size: .66rem; font-weight: 500; line-height: 1.52; color: #35372f; max-width: 34ch; }
  .pc-hand { font-family: "Noto Serif KR", "Nanum Myeongjo", serif; font-size: .56rem;
             line-height: 1.4; color: #76503b; margin-top: 8px; }
  .cover { justify-content: center; }
  .cover-kicker { position: absolute; top: 18px; left: 18px; display: inline-flex; align-items: center;
                  min-height: 20px; padding: 0 9px; border-radius: 99px; background: rgba(20,25,21,.72);
                  color: #fff; font-size: .48rem; font-weight: 750; letter-spacing: .08em; }
  .cover-mid { margin: auto -18px -18px; padding: 16px 18px 20px; width: calc(100% + 36px);
               background: rgba(20,23,19,.8); backdrop-filter: blur(5px); }
  .cover-mid::before { content: ""; display: block; width: 18px; height: 3px; margin-bottom: 9px;
                       background: #F1CF62; }
  .cover-title { font-size: 1.62rem; font-weight: 850; line-height: 1.16; letter-spacing: -.04em;
                 text-wrap: balance; color: #fff; margin: 7px 0 10px; }
  .cover-sub { font-size: .62rem; font-weight: 550; line-height: 1.45; color: rgba(255,255,255,.9);
               max-width: 31ch; }
  .paper {
    background-color: var(--paper); color: var(--ink); padding: 24px 22px 22px;
    background-image: radial-gradient(rgba(53,75,54,.08) .7px, transparent .7px);
    background-size: 7px 7px;
  }
  .paper::after { content: ""; position: absolute; top: 0; bottom: 0; left: 12px; width: 3px;
                  background: rgba(164,58,46,.34); }
  .paper h2 { font-size: 1.35rem; line-height: 1.25; font-weight: 800; letter-spacing: -.035em;
              text-wrap: balance; margin: 11px 0 8px; }
  .mono { font-family: ui-monospace, "SF Mono", Consolas, monospace; font-size: .62rem;
          letter-spacing: .06em; color: #55503F; }
  .body { font-size: .76rem; line-height: 1.58; margin-top: 8px; text-wrap: balance; }
  .summary-list { list-style: none; margin-top: 12px; display: grid; gap: 8px; }
  .summary-list li { display: grid; grid-template-columns: 24px 1fr; align-items: baseline;
                     font-family: "Noto Sans KR", "Malgun Gothic", sans-serif; font-size: .7rem;
                     line-height: 1.4; padding-bottom: 7px; border-bottom: 1px solid rgba(85,80,63,.16); }
  .summary-list b { color: var(--red); font-family: ui-monospace, "SF Mono", monospace;
                    font-size: .58rem; letter-spacing: .04em; }
  .hand { font-family: "Noto Serif KR", "Nanum Myeongjo", serif; font-size: .64rem;
          line-height: 1.45; color: #6B4A28; margin-top: auto;
          border-top: 1px dashed #BFB495; padding-top: 9px; }
  .stamp {
    position: absolute; top: 18px; right: 18px; width: 58px; height: 58px; border-radius: 50%;
    border: 1.4px solid var(--red); color: var(--red); display: flex; align-items: center; justify-content: center;
    text-align: center; font-family: ui-monospace, monospace; font-size: .5rem; line-height: 1.2; transform: rotate(8deg); opacity: .9; z-index: 2;
  }
  .pc .stamp { border-color: rgba(255,255,255,.85); color: rgba(255,255,255,.9); }
`;

const SCRIM_COVER = `linear-gradient(180deg, rgba(8,12,10,.14) 0%, rgba(8,12,10,0) 62%)`;
const SCRIM_BODY = `linear-gradient(180deg, rgba(8,12,10,.16) 0%, rgba(8,12,10,0) 52%)`;

const esc = s => (s ?? '');

// kind별 카드 마크업 — 기준본 DOM 구조 그대로.
function cardBody(meta, c, page, total) {
  const wmpg = dark => `<div class="wm${dark ? ' dark' : ''}">${esc(meta.watermark)}</div><div class="pg${dark ? ' dark' : ''}">${page}/${total}</div>`;
  if (c.kind === 'cover') {
    return `
    <div class="card pc cover" style="background-image: ${SCRIM_COVER}, url('${c.photoUrl}');">
      <div class="cover-kicker">${esc(meta.series)} · ${esc(meta.number)}</div>
      <div class="cover-mid">
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
