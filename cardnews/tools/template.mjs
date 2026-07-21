// 카드뉴스 HTML 템플릿 — 딥 포레스트(브랜드) 팔레트, 명조 제목 + 고딕 본문.
//
// 디자인 원칙(학습-09 부록 스펙 + 훅 독트린):
// - 캔버스 1080×1350(4:5). 제목:소제목:본문 ≈ 4:3:1.5, 본문 최소 24px.
// - 고딕=정보, 명조=감성 — 필드노트 톤이므로 제목은 명조(Noto Serif KR).
// - 표지에는 로고를 넣지 않는다(2~3초 오디션에 훅만 남긴다). 내지 워터마크·쪽번호는 전 장 동일 위치.
// - 강조어는 <em>(기울임이 아니라 골드 컬러)으로 카드 데이터에서 직접 지정한다 —
//   "어디를 강조할지"가 훅 설계의 일부라서 템플릿이 임의로 정하지 않는다.
// - 사진이 아직 없는 카드는 타이포+유령 숫자(ghost)로 성립하게 — 숫자는 그 자체가 훅이다.

const P = {
  bg: '#0E1B14',          // 딥 포레스트(대문배너-확정 계열)
  bgGlow1: '#1A2E22',
  bgGlow2: '#233D2C',
  ink: '#F4EFE3',         // 웜 크림(예비 C안 계열) — 순백보다 종이 느낌
  sub: '#A9BCA7',         // 세이지
  accent: '#D9B36C',      // 바랜 금 — 강조어 전용
  line: 'rgba(244,239,227,.28)',
  ghost: 'rgba(244,239,227,.06)',
};

// 종이 질감: SVG 노이즈를 데이터 URI로 — 외부 파일 없이 자립.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E")`;

const BASE_CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1080px; height:1350px; overflow:hidden; }
  body {
    background:
      radial-gradient(900px 700px at 85% -10%, ${P.bgGlow2} 0%, transparent 60%),
      radial-gradient(1100px 900px at -15% 110%, ${P.bgGlow1} 0%, transparent 55%),
      ${P.bg};
    color:${P.ink};
    font-family:'Noto Sans KR', sans-serif;
    position:relative;
  }
  body::after { content:''; position:absolute; inset:0; background-image:${GRAIN}; pointer-events:none; }
  .photo { position:absolute; inset:0; background-size:cover; background-position:center; }
  .scrim { position:absolute; inset:0;
    background:linear-gradient(to top, rgba(4,10,7,.82) 0%, rgba(4,10,7,.35) 42%, rgba(4,10,7,.08) 68%, transparent 100%); }
  .frame { position:absolute; inset:44px; border:1.5px solid ${P.line}; pointer-events:none; }
  .stage { position:absolute; inset:44px; padding:64px 60px 130px; display:flex; flex-direction:column;
    word-break:keep-all; } /* 한국어 조판: 단어 중간 줄바꿈 방지 */
  em { font-style:normal; color:${P.accent}; }
  .kicker { font-size:27px; font-weight:700; letter-spacing:.32em; color:${P.sub}; }
  .serif { font-family:'Noto Serif KR', serif; }
  .ghost { position:absolute; right:-30px; bottom:150px; font-family:'Noto Serif KR',serif; font-weight:900;
    font-size:430px; line-height:1; color:${P.ghost}; letter-spacing:-.04em; z-index:0; }
  .wm { position:absolute; left:104px; bottom:76px; font-size:24px; letter-spacing:.22em;
    color:${P.sub}; font-weight:700; }
  .pageno { position:absolute; right:104px; bottom:76px; font-size:24px; color:${P.sub};
    font-variant-numeric:tabular-nums; letter-spacing:.1em; }
  .rehook { margin-top:auto; padding-top:36px; border-top:1.5px solid ${P.line};
    font-size:30px; color:${P.sub}; line-height:1.5; }
  .rehook b { color:${P.ink}; font-weight:700; }
`;

const esc = s => (s ?? '');
const head = extra => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${BASE_CSS}${extra}</style></head>`;

// kind별 본문 — 각 함수는 .stage 내부만 그린다.
const KINDS = {
  // 표지: 훅이 전부. 시리즈 배지는 위 구석에 작게, 아래엔 스와이프 유도 한 줄.
  cover(meta, c) {
    return `
    <div class="stage" style="justify-content:center">
      <div class="kicker" style="position:absolute;top:64px;left:60px">${esc(meta.series)}</div>
      <h1 class="serif" style="font-weight:900;font-size:${c.hookSize || 96}px;line-height:1.3;letter-spacing:-.01em;z-index:1">${esc(c.hook)}</h1>
      ${c.sub ? `<p style="margin-top:44px;font-size:36px;line-height:1.6;color:${P.sub};z-index:1">${esc(c.sub)}</p>` : ''}
      <div style="position:absolute;left:60px;bottom:64px;right:60px;display:flex;justify-content:space-between;font-size:27px;color:${P.sub}">
        <span style="letter-spacing:.22em">${esc(meta.episode)}</span><span>밀어서 계속 →</span>
      </div>
    </div>`;
  },
  // 본문: 킥커 + 명조 제목 + 본문 + (선택) 유령 숫자 + (선택) 다음 장 예고(rehook).
  story(meta, c, i, n) {
    return `
    ${c.ghost ? `<div class="ghost" style="font-size:${c.ghostSize || 430}px">${esc(c.ghost)}</div>` : ''}
    <div class="stage">
      ${c.kicker ? `<div class="kicker" style="margin-bottom:40px">${esc(c.kicker)}</div>` : ''}
      <h2 class="serif" style="font-weight:700;font-size:${c.titleSize || 66}px;line-height:1.4;z-index:1">${esc(c.title)}</h2>
      <div style="margin-top:48px;font-size:34px;line-height:1.85;color:${P.ink};opacity:.92;z-index:1;max-width:840px">${esc(c.body)}</div>
      ${c.rehook ? `<div class="rehook">${esc(c.rehook)}</div>` : ''}
    </div>
    <div class="wm">${esc(meta.series)}</div><div class="pageno">${String(i).padStart(2, "0")} / ${n}</div>`;
  },
  // 인용: 큰따옴표 한 문장이 주인공.
  quote(meta, c, i, n) {
    return `
    <div class="stage" style="justify-content:center">
      <div class="serif" style="font-size:200px;line-height:.6;color:${P.accent};opacity:.85">“</div>
      <blockquote class="serif" style="font-weight:700;font-size:${c.titleSize || 76}px;line-height:1.5;margin-top:24px;z-index:1">${esc(c.title)}</blockquote>
      <div style="margin-top:52px;font-size:32px;line-height:1.8;color:${P.sub};max-width:820px">${esc(c.body)}</div>
      ${c.rehook ? `<div class="rehook">${esc(c.rehook)}</div>` : ''}
    </div>
    <div class="wm">${esc(meta.series)}</div><div class="pageno">${String(i).padStart(2, "0")} / ${n}</div>`;
  },
  // 마무리: 요약(저장 유도) + 상품 연결 한 줄(제0원칙상 허용된 유일한 자리).
  outro(meta, c, i, n) {
    const rows = (c.items || []).map(t => `
      <div style="display:flex;gap:24px;padding:26px 0;border-bottom:1px solid ${P.line};font-size:33px;line-height:1.55">
        <span style="color:${P.accent};font-weight:700">·</span><span>${t}</span></div>`).join('');
    return `
    <div class="stage">
      ${c.kicker ? `<div class="kicker" style="margin-bottom:40px">${esc(c.kicker)}</div>` : ''}
      <h2 class="serif" style="font-weight:700;font-size:62px;line-height:1.4">${esc(c.title)}</h2>
      <div style="margin-top:40px">${rows}</div>
      <div style="margin-top:auto;font-size:31px;line-height:1.7;color:${P.sub}">${esc(c.body)}</div>
      ${c.connect ? `<div style="margin-top:28px;padding-top:32px;border-top:1.5px solid ${P.line};font-size:31px;color:${P.ink}">${esc(c.connect)}</div>` : ''}
    </div>
    <div class="wm">${esc(meta.series)}</div><div class="pageno">${String(i).padStart(2, "0")} / ${n}</div>`;
  },
};

export function cardHTML(meta, card, i, total) {
  const kind = KINDS[card.kind] || KINDS.story;
  const photo = card.photo ? `<div class="photo" style="background-image:url('${card.photo}')"></div><div class="scrim"></div>` : '';
  const frame = card.photo ? '' : '<div class="frame"></div>';
  return `${head('')}<body>${photo}${frame}${kind(meta, card, i, total)}</body></html>`;
}

// 검토용 PDF: 렌더된 PNG 실물을 그대로 페이지에 얹는다(PDF=PNG 보장).
export function reviewHTML(meta, cards, introHTML, pngDir) {
  const covers = cards.filter(c => c.kind === 'cover');
  const coverGrid = covers.length > 1 ? `
    <section class="page pad">
      <h2>표지 훅 후보 ${covers.length}안 — 한 장만 고르시면 됩니다</h2>
      <div class="grid">${covers.map(c => `
        <figure><img src="file://${pngDir}/${c.id}.png"><figcaption>${c.variant || c.id}${c.note ? ` — ${c.note}` : ''}</figcaption></figure>`).join('')}
      </div>
    </section>` : '';
  return `${head(`
    /* 카드용 BASE_CSS의 1080×1350 고정·overflow:hidden을 해제해야 여러 쪽이 나온다. */
    html,body { width:auto; height:auto; overflow:visible; }
    @page { size:1080px 1350px; margin:0; }
    .page { width:1080px; height:1350px; page-break-after:always; position:relative; overflow:hidden; }
    .page:last-child { page-break-after:auto; } /* 꼬리 빈 쪽 방지 */
    .pad { padding:90px 84px; }
    h2 { font-family:'Noto Serif KR',serif; font-size:52px; line-height:1.4; margin-bottom:48px; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:36px; }
    figure img { width:100%; display:block; border:1px solid ${P.line}; }
    figcaption { font-size:26px; color:${P.sub}; margin-top:14px; line-height:1.5; }
    .full img { width:1080px; height:1350px; display:block; }
  `)}<body>
    ${introHTML}
    ${coverGrid}
    ${cards.map(c => `<section class="page full"><img src="file://${pngDir}/${c.id}.png"></section>`).join('')}
  </body></html>`;
}
