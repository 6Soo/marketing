// 무료 상업용 사진 검색 (인스타 카드뉴스 자동화용, 2026-07-21).
// Pexels API 사용 — 상업적 이용·수정(자르기/텍스트 얹기) 전부 허용, 출처 표기 의무 아님.
// 키는 리포 루트 .env(PEXELS_API_KEY)에서 자동 로드(사장 결정 2026-07-21: 설정 없이 바로 실행).
// 환경변수가 이미 있으면 그것이 우선.
//
// "japan"처럼 뭉뚱그린 검색어는 오사카성·교토 절 같은 흔한 관광지 사진이 대부분이라
// "그들이 모르는 일본" 톤에 안 맞는다 — 그래서 이 파일은 후보를 한 장만 자동 확정하지 않고
// 여러 장을 가져와, 사람(또는 다음 단계 필터)이 톤에 맞는 것을 고르게 한다.
//
// CLI: node tools/stock-photo.mjs "japan misty mountain village" --orientation=portrait --n=6
//      (클라우드 세션 프록시 환경에서는 NODE_USE_ENV_PROXY=1 을 앞에 붙인다)
// 모듈: import { searchPhotos, CARD_QUERY_BANK } from './stock-photo.mjs'
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_BASE = 'https://api.pexels.com/v1/search';

// 리포 루트 .env에서 키 자동 로드 (dotenv 의존성 없이 필요한 한 줄만 파싱)
function envKey() {
  if (process.env.PEXELS_API_KEY) return process.env.PEXELS_API_KEY;
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const m = readFileSync(join(root, '.env'), 'utf8').match(/^PEXELS_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  } catch { /* .env 없으면 아래 에러로 안내 */ }
  return '';
}

export async function searchPhotos(query, { orientation = 'portrait', perPage = 6, apiKey } = {}) {
  const key = apiKey || envKey();
  if (!key) throw new Error('PEXELS_API_KEY가 없습니다 — 리포 루트 .env에 PEXELS_API_KEY=... 한 줄을 넣어주세요.');

  const url = `${API_BASE}?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=${orientation}`;
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Pexels 검색 실패 (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.photos || []).map(p => ({
    id: p.id,
    width: p.width,
    height: p.height,
    alt: p.alt || '',
    photographer: p.photographer,
    photographerUrl: p.photographer_url,
    pageUrl: p.url,                 // pexels.com 사진 페이지(원하면 캡션에 출처 링크로)
    src: {
      portrait: p.src.portrait,     // 800x1200 — 카드뉴스 4:5에 가장 가까움
      large2x: p.src.large2x,       // 940x650 근방 고해상도
      original: p.src.original,
    },
  }));
}

// "그들이 모르는 일본" 컨셉용 카드별 큐레이션 검색어.
// 관광지명(교토·오사카·후지산·시부야 등)을 일부러 넣지 않는다 — 그게 "그들이 아는 일본"이라
// 이 컨셉 자체와 상충한다. 대신 지형·분위기·생활 장면으로 검색해 관광지가 덜 섞이게 한다.
export const CARD_QUERY_BANK = {
  // 방향 A — 필드노트: 표지 폴라로이드 자리
  a_cover: ['japan countryside village mist morning', 'japan rural mountain hamlet fog'],
  // 방향 B — 심야 산길: 지금은 CSS 그라디언트지만, 실사진을 밑에 깔면 더 사실적
  b_night: ['japan mountain night fog stars', 'japan hot spring steam night mountain'],
  b_mood: ['japan onsen outdoor steam mountain', 'japan ryokan lantern night'],
  // 방향 C는 의도적으로 사진 없이 타이포/색으로만 — 여기 넣지 않음
};

if (process.argv[1] && process.argv[1].endsWith('stock-photo.mjs')) {
  const args = process.argv.slice(2);
  const query = args.find(a => !a.startsWith('--'));
  const opt = name => args.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
  if (!query) {
    console.error('사용법: node stock-photo.mjs "검색어" [--orientation=portrait|landscape|square] [--n=6]');
    process.exit(1);
  }
  const photos = await searchPhotos(query, {
    orientation: opt('orientation') || 'portrait',
    perPage: Number(opt('n')) || 6,
  });
  for (const p of photos) {
    console.log(`#${p.id}  ${p.width}x${p.height}  ${p.photographer}`);
    console.log(`  ${p.alt}`);
    console.log(`  ${p.src.portrait}`);
    console.log('');
  }
}
