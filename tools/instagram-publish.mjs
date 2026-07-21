// 인스타그램 자동 게시 (공식 Graph API, Content Publishing).
//
// ⚠ 음악에 대한 사실 (이 시스템의 설계 이유):
//   게시 API에는 인스타 음악 라이브러리를 붙이는 파라미터가 없다 — 음악 스티커는 앱 전용.
//   따라서 ① 캐러셀(사진)은 음악 없이 게시되는 것이 플랫폼 사양이고,
//   ② 음악을 넣으려면 오디오를 영상 파일에 미리 구워 넣은 릴스(REELS)로 게시한다
//      (cardnews/tools/build-reel.mjs가 그 영상을 만든다).
//
// 사전 요건(.env): IG_USER_ID(비즈니스 계정 ID) · IG_ACCESS_TOKEN(장기 토큰).
//   상세 취득 절차: context/사장님-가이드.md §인스타 자동 게시.
// 미디어는 공개 URL이어야 한다(Graph API가 URL에서 받아감) — 예: reserve.foresttour.kr/static/.
//
// 사용 (기본은 드라이런 — 실제 전송은 --publish):
//   node tools/instagram-publish.mjs carousel --images=URL1,URL2,... --caption-file=캡션.txt [--publish]
//   node tools/instagram-publish.mjs reel --video=URL [--cover=URL] --caption-file=캡션.txt \
//        [--audio-name="숲길 필드노트"] [--publish]
//   (클라우드 세션 프록시 환경에서는 NODE_USE_ENV_PROXY=1 접두)

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 기본은 2024-07 신설 "Instagram API with Instagram Login" — 페이스북 페이지 연결이 필요 없다.
// (구형 Facebook Login 방식을 쓰면 GRAPH_HOST=graph.facebook.com 으로 바꾼다.)
const VER = process.env.GRAPH_API_VERSION || 'v23.0';
const HOST = process.env.GRAPH_HOST || 'graph.instagram.com';
const BASE = `https://${HOST}/${VER}`;

function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const m = readFileSync(join(root, '.env'), 'utf8').match(new RegExp(`^${name}=(.+)$`, 'm'));
    if (m) return m[1].trim();
  } catch { /* 아래 검사에서 안내 */ }
  return '';
}

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name, dflt) => args.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const flag = name => args.includes(`--${name}`);
const live = flag('publish');

const IG_USER = env('IG_USER_ID'), TOKEN = env('IG_ACCESS_TOKEN');
if (live && (!IG_USER || !TOKEN)) {
  console.error('IG_USER_ID / IG_ACCESS_TOKEN이 없습니다 — .env에 추가하세요(사장님-가이드 §인스타).');
  process.exit(1);
}

async function call(path, params) {
  const url = `${BASE}/${path}`;
  const body = new URLSearchParams({ ...params, access_token: live ? TOKEN : '<토큰>' });
  if (!live) {
    console.log(`[드라이런] POST ${url}`);
    for (const [k, v] of body) if (k !== 'access_token') console.log(`    ${k} = ${v}`);
    return { id: `<드라이런-${path.split('/').pop()}>` };
  }
  const res = await fetch(url, { method: 'POST', body });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`Graph API 오류 (${path}): ${JSON.stringify(json.error || json)}`);
  return json;
}

async function waitReady(containerId) {
  if (!live) { console.log(`[드라이런] GET ${BASE}/${containerId}?fields=status_code (FINISHED까지 10초 간격 폴링)`); return; }
  for (let i = 0; i < 60; i++) { // 최대 10분
    const res = await fetch(`${BASE}/${containerId}?fields=status_code,status&access_token=${TOKEN}`);
    const json = await res.json();
    if (json.status_code === 'FINISHED') return;
    if (json.status_code === 'ERROR') throw new Error(`컨테이너 처리 실패: ${JSON.stringify(json)}`);
    await new Promise(r => setTimeout(r, 10_000));
  }
  throw new Error('컨테이너 처리 타임아웃(10분) — 영상 규격을 확인하세요.');
}

const caption = opt('caption-file') ? readFileSync(opt('caption-file'), 'utf8').trim() : opt('caption', '');

if (cmd === 'carousel') {
  const urls = (opt('images', '') || '').split(',').filter(Boolean);
  if (urls.length < 2 || urls.length > 10) { console.error('캐러셀은 이미지 2~10장(--images=URL,URL,...)'); process.exit(1); }
  const children = [];
  for (const u of urls) {
    const item = await call(`${IG_USER || '<IG_USER_ID>'}/media`, { image_url: u, is_carousel_item: 'true' });
    children.push(item.id);
  }
  const container = await call(`${IG_USER || '<IG_USER_ID>'}/media`, {
    media_type: 'CAROUSEL', children: children.join(','), caption,
  });
  const pub = await call(`${IG_USER || '<IG_USER_ID>'}/media_publish`, { creation_id: container.id });
  console.log(live ? `✓ 캐러셀 게시 완료: media_id=${pub.id}` : '※ 캐러셀은 API 사양상 음악 없이 게시됩니다 — 음악은 릴스(reel 커맨드)로.');
} else if (cmd === 'reel') {
  const video = opt('video');
  if (!video) { console.error('--video=<공개 URL> 필요'); process.exit(1); }
  const params = {
    media_type: 'REELS', video_url: video, caption,
    share_to_feed: flag('no-feed') ? 'false' : 'true',
  };
  if (opt('cover')) params.cover_url = opt('cover');
  if (opt('audio-name')) params.audio_name = opt('audio-name'); // 원본 오디오의 '표시 이름'만 지정(라이브러리 선택 아님)
  const container = await call(`${IG_USER || '<IG_USER_ID>'}/media`, params);
  await waitReady(container.id);
  const pub = await call(`${IG_USER || '<IG_USER_ID>'}/media_publish`, { creation_id: container.id });
  console.log(live ? `✓ 릴스 게시 완료: media_id=${pub.id}` : '※ 음악은 영상에 구워진 오디오가 그대로 게시됩니다(build-reel.mjs 산출물).');
} else if (cmd === 'refresh-token') {
  // 장기 토큰은 60일 유효 — 만료 전(발급 24시간 후부터) 이 커맨드로 갱신하면 다시 60일.
  if (!TOKEN) { console.error('IG_ACCESS_TOKEN이 없습니다.'); process.exit(1); }
  const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${TOKEN}`);
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  console.log(`새 토큰(유효 ${Math.round(json.expires_in / 86400)}일) — .env의 IG_ACCESS_TOKEN을 교체하세요:\n${json.access_token}`);
} else if (cmd === 'limit') {
  // 게시 한도: 24시간 이동 창 기준 100회.
  const res = await fetch(`${BASE}/${IG_USER}/content_publishing_limit?access_token=${TOKEN}`);
  console.log(JSON.stringify(await res.json(), null, 2));
} else {
  console.error('사용법: instagram-publish.mjs <carousel|reel|refresh-token|limit> [옵션] — 파일 상단 주석 참조');
  process.exit(1);
}
