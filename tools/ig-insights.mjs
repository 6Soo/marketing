import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

/**
 * 환경 변수 로드 (.env 패턴 적용)
 * @param {string} name
 * @returns {string}
 */
function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const m = readFileSync(join(REPO, '.env'), 'utf8').match(new RegExp(`^${name}=(.+)$`, 'm'));
    if (m) return m[1].trim();
  } catch { /* .env 없으면 무시 */ }
  return '';
}

const IG_USER_ID = env('IG_USER_ID');
const IG_ACCESS_TOKEN = env('IG_ACCESS_TOKEN');

function safeGraphError(payload, status) {
  const error = payload?.error || {};
  return [
    `Instagram API 오류 HTTP ${status}`,
    typeof error.type === 'string' ? error.type : undefined,
    Number.isFinite(error.code) ? `code ${error.code}` : undefined,
    Number.isFinite(error.error_subcode) ? `subcode ${error.error_subcode}` : undefined,
    typeof error.message === 'string' ? error.message : '알 수 없는 오류',
    typeof error.fbtrace_id === 'string' ? `trace ${error.fbtrace_id}` : undefined,
  ].filter(Boolean).join(' · ');
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${IG_ACCESS_TOKEN}` },
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    // 아래 상태 오류로 처리한다.
  }
  if (!response.ok || payload.error) {
    throw new Error(safeGraphError(payload, response.status));
  }
  return payload;
}

function graphUrl(path, params) {
  const url = new URL(`https://graph.instagram.com/v23.0/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}

/**
 * 인스타그램 미디어 인사이트 수집
 * @param {string} mediaId
 * @param {string|boolean} mediaProductType 미디어 상품 유형. boolean이면 기존 live 인자로 처리한다.
 * @param {boolean} live
 */
const BASE_MEDIA_METRICS = [
  'reach',
  'views',
  'saved',
  'likes',
  'comments',
  'shares',
  'total_interactions',
];

/**
 * 미디어 상품 유형별 Graph API 허용 지표를 반환한다.
 * profile_visits·follows는 REELS에서만 요청한다. FEED/CAROUSEL에 섞으면
 * 지표 하나 때문에 요청 전체가 code 100으로 실패한다.
 *
 * @param {string} mediaProductType
 * @returns {string[]}
 */
export function mediaMetricsForType(mediaProductType = '') {
  const metrics = [...BASE_MEDIA_METRICS];
  if (String(mediaProductType).toUpperCase() === 'REELS') {
    metrics.push('profile_visits', 'follows');
  }
  return metrics;
}

export async function getMediaInsights(mediaId, mediaProductType = '', live = false) {
  // 기존 getMediaInsights(mediaId, live) 호출과 호환한다.
  if (typeof mediaProductType === 'boolean') {
    live = mediaProductType;
    mediaProductType = '';
  }

  if (!live) {
    console.log(`[Dry Run] 미디어 인사이트 요청 확인 (Media ID: ${mediaId}) — 가상 수치는 만들지 않습니다.`);
    return null;
  }

  if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
    throw new Error('IG_USER_ID 또는 IG_ACCESS_TOKEN이 설정되지 않았습니다.');
  }

  // 기본 지원 지표는 2026-07-29 실측으로 확정했다(CAROUSEL_ALBUM/FEED 기준).
  // impressions·navigation은 이 미디어 타입에서 거부되며(code 100), impressions의 대체는 views다.
  // profile_visits·follows는 REELS에만 허용되고 FEED/CAROUSEL에서는 거부된다.
  // 지표 하나가 거부되면 요청 전체가 실패하므로 미검증 지표를 임의로 추가하지 말 것.
  const url = graphUrl(`${mediaId}/insights`, {
    metric: mediaMetricsForType(mediaProductType).join(','),
  });
  const data = await fetchJson(url);
  return data;
}

/**
 * 계정 인사이트 수집
 * @param {boolean} live
 */
export async function getAccountInsights(live = false) {
  if (!live) {
    console.log(`[Dry Run] 계정 인사이트 요청 확인 — 가상 수치는 만들지 않습니다.`);
    return null;
  }

  if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
    throw new Error('IG_USER_ID 또는 IG_ACCESS_TOKEN이 설정되지 않았습니다.');
  }

  // 계정 인사이트는 media와 허용 지표 집합이 다르다(2026-07-29 실측).
  // impressions는 여기서도 거부된다. 값이 비어 오는 것은 정상이며(데이터 없음) 0으로 채우지 않는다.
  const url = graphUrl(`${IG_USER_ID}/insights`, {
    metric: 'reach,follower_count,profile_views,website_clicks,accounts_engaged,total_interactions',
    period: 'day',
  });
  const data = await fetchJson(url);
  return data;
}

/**
 * 전체 인사이트 수집 및 저장
 * @param {boolean} live
 */
export async function collectInsights(live = false) {
  console.log('인사이트 수집 시작...');
  const dateStr = new Date().toISOString().split('T')[0];
  const insightsDir = join(REPO, 'data', 'insights');
  if (live && !existsSync(insightsDir)) {
    mkdirSync(insightsDir, { recursive: true });
  }

  let accountData, mediaData;
  if (!live) {
    console.log('[Dry Run] 미디어 목록 수집 및 각각의 인사이트 수집 시뮬레이션');
    accountData = await getAccountInsights(false);
    mediaData = [];
  } else {
    accountData = await getAccountInsights(true);
    // 미디어 목록 조회
    const mediaUrl = graphUrl(`${IG_USER_ID}/media`, {
      fields: 'id,permalink,caption,timestamp,media_type,media_product_type,like_count,comments_count',
    });
    const mediaList = await fetchJson(mediaUrl);

    mediaData = [];
    if (mediaList && mediaList.data) {
      for (const media of mediaList.data) {
        const insights = await getMediaInsights(media.id, media.media_product_type, true);
        mediaData.push({ media, insights });
      }
    }
  }

  const result = {
    date: dateStr,
    account: accountData,
    media: mediaData
  };

  const outputPath = join(insightsDir, `${dateStr}.json`);
  if (!live) {
    console.log(`[Dry Run] 데이터 저장 건너뜀: ${outputPath}`);
  } else {
    writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`데이터 저장 완료: ${outputPath}`);
  }

  return result;
}

// CLI 모드 실행 감지
if (process.argv[1] && process.argv[1].endsWith('ig-insights.mjs')) {
  const args = process.argv.slice(2);
  const command = args[0] || 'collect';
  const live = args.includes('--live') || args.includes('--publish');

  (async () => {
    try {
      if (command === 'collect') {
        await collectInsights(live);
      } else if (command === 'account') {
        const data = await getAccountInsights(live);
        console.log('계정 인사이트:', JSON.stringify(data, null, 2));
      } else if (command === 'media') {
        const mediaId = args[1];
        if (!mediaId) {
          console.error('미디어 ID를 입력해주세요. 사용법: node ig-insights.mjs media <mediaId>');
          process.exit(1);
        }
        const data = await getMediaInsights(mediaId, live);
        console.log('미디어 인사이트:', JSON.stringify(data, null, 2));
      } else {
        console.error(`알 수 없는 명령입니다: ${command}`);
      }
    } catch (e) {
      console.error('실행 중 오류 발생:', e.message);
      process.exitCode = 1;
    }
  })();
}
