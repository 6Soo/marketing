import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

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

// 간단한 https 요청 유틸리티
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode < 200 || res.statusCode >= 300 || json.error) {
            reject(new Error(`Instagram API 오류 ${res.statusCode}: ${JSON.stringify(json.error || json)}`));
            return;
          }
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
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

  if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
    throw new Error('IG_USER_ID 또는 IG_ACCESS_TOKEN이 설정되지 않았습니다.');
  }

  const url = `https://graph.instagram.com/v23.0/${mediaId}/insights?metric=reach,impressions,saved,likes,comments,shares&access_token=${IG_ACCESS_TOKEN}`;
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

  const url = `https://graph.instagram.com/v23.0/${IG_USER_ID}/insights?metric=reach,follower_count,profile_views&period=day&access_token=${IG_ACCESS_TOKEN}`;
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
    const mediaUrl = `https://graph.instagram.com/v23.0/${IG_USER_ID}/media?fields=id,caption,timestamp,media_type,like_count,comments_count&access_token=${IG_ACCESS_TOKEN}`;
    const mediaList = await fetchJson(mediaUrl);

    mediaData = [];
    if (mediaList && mediaList.data) {
      for (const media of mediaList.data) {
        const insights = await getMediaInsights(media.id, true);
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
