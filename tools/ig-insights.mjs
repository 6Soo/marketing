import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
function getEnvFile() {
  return process.env.IG_ENV_FILE || join(REPO, '.env');
}

export const MEDIA_METRICS = ['reach', 'saved', 'likes', 'comments', 'shares', 'views'];

/**
 * 환경 변수 로드 (.env 패턴 적용)
 * @param {string} name
 * @returns {string}
 */
function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = readFileSync(getEnvFile(), 'utf8').match(new RegExp(`^${escaped}=(.+)$`, 'm'));
    if (m) return m[1].trim();
  } catch { /* ENV_FILE 없으면 무시 */ }
  return '';
}

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

async function fetchJson(url, token) {
  const authToken = token || env('IG_ACCESS_TOKEN');
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
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
 * @param {boolean} live
 */
export async function getMediaInsights(mediaId, live = false) {
  if (!live) {
    console.log(`[Dry Run] 미디어 인사이트 요청 확인 (Media ID: ${mediaId}) — 가상 수치는 만들지 않습니다.`);
    return null;
  }

  const userId = env('IG_USER_ID');
  const token = env('IG_ACCESS_TOKEN');

  if (!userId || !token) {
    throw new Error('IG_USER_ID 또는 IG_ACCESS_TOKEN이 설정되지 않았습니다.');
  }

  const bulkUrl = graphUrl(`${mediaId}/insights`, {
    metric: MEDIA_METRICS.join(','),
  });

  try {
    const data = await fetchJson(bulkUrl, token);
    return data;
  } catch (bulkErr) {
    const metricResults = await Promise.allSettled(
      MEDIA_METRICS.map(async (m) => {
        const url = graphUrl(`${mediaId}/insights`, { metric: m });
        const res = await fetchJson(url, token);
        return { metric: m, res };
      }),
    );

    const dataItems = [];
    const metricErrors = {};

    for (let i = 0; i < MEDIA_METRICS.length; i++) {
      const metricName = MEDIA_METRICS[i];
      const result = metricResults[i];

      if (result.status === 'fulfilled') {
        const resData = result.value.res?.data;
        if (Array.isArray(resData)) {
          dataItems.push(...resData);
        }
      } else {
        const errMsg = result.reason?.message || String(result.reason);
        metricErrors[metricName] = errMsg;
        console.error(`[Media ${mediaId}] 인사이트 메트릭 '${metricName}' 수집 실패: ${errMsg}`);
      }
    }

    if (dataItems.length === 0) {
      throw bulkErr;
    }

    return {
      data: dataItems,
      insightsFallback: true,
      ...(Object.keys(metricErrors).length > 0 ? { metricErrors } : {}),
    };
  }
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

  const userId = env('IG_USER_ID');
  const token = env('IG_ACCESS_TOKEN');

  if (!userId || !token) {
    throw new Error('IG_USER_ID 또는 IG_ACCESS_TOKEN이 설정되지 않았습니다.');
  }

  const url = graphUrl(`${userId}/insights`, {
    metric: 'reach,follower_count,profile_views',
    period: 'day',
  });
  const data = await fetchJson(url, token);
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
  let exitCodeOne = false;

  if (!live) {
    console.log('[Dry Run] 미디어 목록 수집 및 각각의 인사이트 수집 시뮬레이션');
    accountData = await getAccountInsights(false);
    mediaData = [];
  } else {
    accountData = await getAccountInsights(true);
    const userId = env('IG_USER_ID');
    const token = env('IG_ACCESS_TOKEN');
    // 미디어 목록 조회
    const mediaUrl = graphUrl(`${userId}/media`, {
      fields: 'id,permalink,caption,timestamp,media_type,like_count,comments_count',
    });
    const mediaList = await fetchJson(mediaUrl, token);

    mediaData = [];
    let isolatedCount = 0;

    if (mediaList && Array.isArray(mediaList.data)) {
      for (const media of mediaList.data) {
        try {
          const insights = await getMediaInsights(media.id, true);
          mediaData.push({ media, insights });
        } catch (err) {
          const insightsError = err.message || String(err);
          console.error(`[Media ${media.id}] 인사이트 수집 격리: ${insightsError}`);
          mediaData.push({ media, insights: null, insightsError });
          isolatedCount++;
        }
      }
      if (mediaList.data.length > 0 && isolatedCount === mediaList.data.length) {
        exitCodeOne = true;
      }
    }
  }

  const result = {
    date: dateStr,
    account: accountData,
    media: mediaData,
  };

  const outputPath = join(insightsDir, `${dateStr}.json`);
  if (!live) {
    console.log(`[Dry Run] 데이터 저장 건너뜀: ${outputPath}`);
  } else {
    writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`데이터 저장 완료: ${outputPath}`);
  }

  if (exitCodeOne) {
    process.exitCode = 1;
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
