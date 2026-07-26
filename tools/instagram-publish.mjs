// Instagram 공식 Graph API 게시 도구.
//
// 기본은 드라이런이다. 실제 게시에는 --publish가 필요하다.
// 토큰은 URL, stdout, stderr에 출력하지 않으며 Graph 요청은 Bearer 헤더를 사용한다.
//
// 사용:
//   node tools/instagram-publish.mjs doctor
//   node tools/instagram-publish.mjs carousel --images=URL1,URL2 --caption-file=캡션.txt [--publish]
//   node tools/instagram-publish.mjs reel --video=URL --caption-file=캡션.txt [--publish]
//   node tools/instagram-publish.mjs limit
//   node tools/instagram-publish.mjs refresh-token --write-env

import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = process.env.IG_ENV_FILE || join(REPO, '.env');
const VER = process.env.GRAPH_API_VERSION || 'v23.0';
const HOST = process.env.GRAPH_HOST || 'graph.instagram.com';
const BASE = `https://${HOST}/${VER}`;

function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = readFileSync(ENV_FILE, 'utf8').match(new RegExp(`^${escaped}=(.*)$`, 'm'));
    if (match) return match[1].trim();
  } catch {
    // 필수값 검사는 명령별로 수행한다.
  }
  return '';
}

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name, dflt) =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const flag = (name) => args.includes(`--${name}`);
const live = flag('publish');
const resultFile = opt('result-file');

const IG_USER = env('IG_USER_ID');
const TOKEN = env('IG_ACCESS_TOKEN');

function requireCredentials() {
  if (IG_USER && TOKEN) return;
  throw new Error('Instagram API 자격정보가 없습니다. .env의 IG_USER_ID와 IG_ACCESS_TOKEN을 확인하세요.');
}

function graphErrorDetails(payload, status) {
  const error = payload?.error || {};
  return {
    httpStatus: status,
    type: typeof error.type === 'string' ? error.type : undefined,
    code: Number.isFinite(error.code) ? error.code : undefined,
    subcode: Number.isFinite(error.error_subcode) ? error.error_subcode : undefined,
    message: typeof error.message === 'string' ? error.message : '알 수 없는 Graph API 오류',
    trace: typeof error.fbtrace_id === 'string' ? error.fbtrace_id : undefined,
  };
}

function formatGraphError(path, payload, status) {
  const details = graphErrorDetails(payload, status);
  const parts = [
    `Graph API 오류 (${path})`,
    `HTTP ${details.httpStatus}`,
    details.type,
    details.code === undefined ? undefined : `code ${details.code}`,
    details.subcode === undefined ? undefined : `subcode ${details.subcode}`,
    details.message,
    details.trace ? `trace ${details.trace}` : undefined,
  ].filter(Boolean);
  return parts.join(' · ');
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function graphGet(path, params = {}) {
  requireCredentials();
  const url = new URL(`${BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const payload = await readJson(response);
  if (!response.ok || payload.error) throw new Error(formatGraphError(path, payload, response.status));
  return payload;
}

async function graphPost(path, params) {
  const url = `${BASE}/${path}`;
  if (!live) {
    console.log(`[드라이런] POST ${url}`);
    for (const [key, value] of Object.entries(params)) console.log(`    ${key} = ${value}`);
    return { id: `<드라이런-${path.split('/').pop()}>` };
  }
  requireCredentials();
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: new URLSearchParams(params),
  });
  const payload = await readJson(response);
  if (!response.ok || payload.error) throw new Error(formatGraphError(path, payload, response.status));
  return payload;
}

async function waitReady(containerId) {
  if (!live) {
    console.log(`[드라이런] GET ${BASE}/${containerId}?fields=status_code,status`);
    return;
  }
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const payload = await graphGet(containerId, { fields: 'status_code,status' });
    if (payload.status_code === 'FINISHED') return;
    if (payload.status_code === 'ERROR') {
      throw new Error(`컨테이너 처리 실패 · ${payload.status || '상태 메시지 없음'}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  throw new Error('컨테이너 처리 타임아웃(10분). 미디어 규격을 확인하세요.');
}

function writeEnvToken(nextToken) {
  if (!nextToken || /[\r\n]/.test(nextToken)) throw new Error('갱신 응답에 유효한 토큰이 없습니다.');
  const original = readFileSync(ENV_FILE, 'utf8');
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  const pattern = /^IG_ACCESS_TOKEN=.*$/m;
  const updated = pattern.test(original)
    ? original.replace(pattern, `IG_ACCESS_TOKEN=${nextToken}`)
    : `${original.replace(/\s*$/, '')}${newline}IG_ACCESS_TOKEN=${nextToken}${newline}`;
  const mode = statSync(ENV_FILE).mode;
  const temporary = `${ENV_FILE}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(temporary, updated, { encoding: 'utf8', mode });
    renameSync(temporary, ENV_FILE);
  } finally {
    rmSync(temporary, { force: true });
  }
}

async function writePublishResult(publishedId, mediaType) {
  if (!live || !resultFile) return;
  const media = await graphGet(publishedId, {
    fields: 'id,permalink,timestamp,media_type',
  });
  mkdirSync(dirname(resultFile), { recursive: true });
  writeFileSync(resultFile, `${JSON.stringify({
    mediaId: String(media.id || publishedId),
    permalink: media.permalink || null,
    timestamp: media.timestamp || new Date().toISOString(),
    mediaType: media.media_type || mediaType,
  }, null, 2)}\n`, 'utf8');
  console.log(`✓ 게시 결과 기록 완료 · ${resultFile}`);
}

const caption = opt('caption-file')
  ? readFileSync(opt('caption-file'), 'utf8').trim()
  : opt('caption', '');

try {
  if (cmd === 'doctor') {
    requireCredentials();
    const profile = await graphGet('me', { fields: 'id,user_id,username' });
    const remoteUserId = String(profile.user_id || profile.id || '');
    if (!remoteUserId || remoteUserId !== String(IG_USER)) {
      throw new Error('Instagram 계정 ID가 로컬 설정과 일치하지 않습니다.');
    }
    const limit = await graphGet(`${IG_USER}/content_publishing_limit`);
    const usage = limit?.data?.[0]?.quota_usage;
    console.log(`✓ Instagram API 연결 정상 · @${profile.username || '계정'} · 게시 한도 사용 ${usage ?? '확인 불가'}`);
  } else if (cmd === 'carousel') {
    const urls = (opt('images', '') || '').split(',').filter(Boolean);
    if (urls.length < 2 || urls.length > 10) {
      throw new Error('캐러셀은 이미지 2~10장이 필요합니다(--images=URL,URL,...).');
    }
    const children = [];
    for (const url of urls) {
      const item = await graphPost(`${IG_USER || '<IG_USER_ID>'}/media`, {
        image_url: url,
        is_carousel_item: 'true',
      });
      await waitReady(item.id);
      children.push(item.id);
    }
    const container = await graphPost(`${IG_USER || '<IG_USER_ID>'}/media`, {
      media_type: 'CAROUSEL',
      children: children.join(','),
      caption,
    });
    await waitReady(container.id);
    const published = await graphPost(`${IG_USER || '<IG_USER_ID>'}/media_publish`, {
      creation_id: container.id,
    });
    await writePublishResult(published.id, 'CAROUSEL_ALBUM');
    console.log(
      live
        ? `✓ 캐러셀 게시 완료 · media_id=${published.id}`
        : '※ 캐러셀은 API 사양상 음악 없이 게시됩니다. 음악은 릴스에 포함하세요.',
    );
  } else if (cmd === 'reel') {
    const video = opt('video');
    if (!video) {
      throw new Error('--video=<공개 URL>이 필요합니다.');
    }
    const params = {
      media_type: 'REELS',
      video_url: video,
      caption,
      share_to_feed: flag('no-feed') ? 'false' : 'true',
    };
    if (opt('cover')) params.cover_url = opt('cover');
    if (opt('audio-name')) params.audio_name = opt('audio-name');
    const container = await graphPost(`${IG_USER || '<IG_USER_ID>'}/media`, params);
    await waitReady(container.id);
    const published = await graphPost(`${IG_USER || '<IG_USER_ID>'}/media_publish`, {
      creation_id: container.id,
    });
    await writePublishResult(published.id, 'VIDEO');
    console.log(
      live
        ? `✓ 릴스 게시 완료 · media_id=${published.id}`
        : '※ 음악은 영상에 미리 포함된 오디오가 그대로 게시됩니다.',
    );
  } else if (cmd === 'refresh-token') {
    requireCredentials();
    if (!flag('write-env')) {
      throw new Error('토큰 평문 출력을 금지합니다. 로컬 .env에 안전하게 저장하려면 --write-env를 사용하세요.');
    }
    const response = await fetch('https://graph.instagram.com/refresh_access_token', {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'ig_refresh_token',
        access_token: TOKEN,
      }),
    });
    const payload = await readJson(response);
    if (!response.ok || payload.error) {
      throw new Error(formatGraphError('refresh_access_token', payload, response.status));
    }
    writeEnvToken(payload.access_token);
    console.log(`✓ Instagram 토큰 갱신 및 .env 저장 완료 · 유효 ${Math.round(payload.expires_in / 86400)}일`);
  } else if (cmd === 'limit') {
    const payload = await graphGet(`${IG_USER}/content_publishing_limit`);
    const row = payload?.data?.[0] || {};
    console.log(`Instagram 게시 한도 · 사용 ${row.quota_usage ?? '확인 불가'} / ${row.config?.quota_total ?? 100}`);
  } else {
    throw new Error('사용법: instagram-publish.mjs <doctor|carousel|reel|refresh-token|limit> [옵션]');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Instagram 명령 실행 중 오류가 발생했습니다.');
  process.exitCode = 1;
}
