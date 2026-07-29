import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  MEDIA_METRICS,
  getMediaInsights,
  getAccountInsights,
  collectInsights,
} from './ig-insights.mjs';
import { extractInstagramMetrics } from './collect-instagram-activation-metrics.mjs';

const TOOLS = dirname(fileURLToPath(import.meta.url));
const FAKE_TOKEN = 'secret-token-must-never-appear-12345';
const FAKE_USER_ID = '9876543210';

function setupTestEnv() {
  const dir = mkdtempSync(join(tmpdir(), 'ig-insights-test-'));
  const envFile = join(dir, '.env');
  writeFileSync(envFile, `IG_USER_ID=${FAKE_USER_ID}\nIG_ACCESS_TOKEN=${FAKE_TOKEN}\n`, 'utf8');
  return { dir, envFile };
}

// T-1: bulk 실패 + 개별 호출 중 1개(views) 실패 시 나머지 5개 존재 및 metricErrors.views 기록
// T-2: 실패 메트릭(views)의 0/null 자리 채움 없음
test('T-1 & T-2: bulk 실패 시 개별 호출 fallback 동작 및 부재 메트릭 합성 0/null 미생성 검증', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnvFile = process.env.IG_ENV_FILE;
  const originalUserId = process.env.IG_USER_ID;
  const originalAccessToken = process.env.IG_ACCESS_TOKEN;

  const { dir, envFile } = setupTestEnv();
  process.env.IG_ENV_FILE = envFile;
  delete process.env.IG_USER_ID;
  delete process.env.IG_ACCESS_TOKEN;

  const fetchedUrls = [];

  globalThis.fetch = async (url, options) => {
    const urlStr = String(url);
    fetchedUrls.push(urlStr);

    // Bulk 요청 (metric=reach,saved,likes,comments,shares,views) -> 400 실패
    if (urlStr.includes('metric=reach%2Csaved%2Clikes%2Ccomments%2Cshares%2Cviews') ||
        urlStr.includes('metric=reach,saved,likes,comments,shares,views')) {
      return {
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: 'Invalid metric impressions/views', type: 'OAuthException', code: 100 },
        }),
      };
    }

    // 개별 views 요청 -> 실패
    if (urlStr.includes('metric=views')) {
      return {
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: 'Metric views is not supported', type: 'OAuthException', code: 100 },
        }),
      };
    }

    // 기타 개별 요청 (reach, saved, likes, comments, shares) -> 성공
    const metricMatch = urlStr.match(/metric=([a-z]+)/);
    const metricName = metricMatch ? metricMatch[1] : 'unknown';

    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            name: metricName,
            period: 'lifetime',
            values: [{ value: 42 }],
            title: metricName,
            description: `${metricName} description`,
            id: `media_123/insights/${metricName}/lifetime`,
          },
        ],
      }),
    };
  };

  try {
    const result = await getMediaInsights('media_123', true);

    // T-1 검증
    assert.equal(result.insightsFallback, true);
    assert.ok(result.metricErrors);
    assert.ok(result.metricErrors.views.includes('views is not supported'));

    const metricNames = result.data.map((item) => item.name);
    assert.equal(metricNames.length, 5);
    assert.deepEqual(metricNames.sort(), ['comments', 'likes', 'reach', 'saved', 'shares']);

    // T-2 검증 (views 항목의 0/null 자리 채움이 데이터에 전혀 존재하지 않음)
    assert.equal(metricNames.includes('views'), false);
    assert.equal(result.data.some((item) => item.name === 'views'), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnvFile !== undefined) process.env.IG_ENV_FILE = originalEnvFile;
    else delete process.env.IG_ENV_FILE;
    if (originalUserId !== undefined) process.env.IG_USER_ID = originalUserId;
    if (originalAccessToken !== undefined) process.env.IG_ACCESS_TOKEN = originalAccessToken;
    rmSync(dir, { recursive: true, force: true });
  }
});

// T-3: insights: null 엔트리에 대해 하류 extractInstagramMetrics 계약 검증
test('T-3: insights: null 스냅샷 하류 추출 계약 (0 관측값 vs 양수 vs 필드 부재 fail-closed)', () => {
  const permalink = 'https://www.instagram.com/p/C123456789/';

  // ① like_count 0 / comments_count 0 -> likes: 0, comments: 0 (관측값 fallback)
  const snapshotCase1 = {
    media: [
      {
        media: {
          permalink,
          like_count: 0,
          comments_count: 0,
        },
        insights: null,
      },
    ],
  };
  const metrics1 = extractInstagramMetrics(snapshotCase1, permalink);
  assert.deepEqual(metrics1, { likes: 0, comments: 0 });

  // ② like_count 7 / comments_count 2 -> likes: 7, comments: 2
  const snapshotCase2 = {
    media: [
      {
        media: {
          permalink,
          like_count: 7,
          comments_count: 2,
        },
        insights: null,
      },
    ],
  };
  const metrics2 = extractInstagramMetrics(snapshotCase2, permalink);
  assert.deepEqual(metrics2, { likes: 7, comments: 2 });

  // ③ 두 필드 모두 부재 -> 에러 throw (fail-closed)
  const snapshotCase3 = {
    media: [
      {
        media: {
          permalink,
        },
        insights: null,
      },
    ],
  };
  assert.throws(
    () => extractInstagramMetrics(snapshotCase3, permalink),
    /확인 가능한 Instagram 지표가 없습니다/
  );
});

// T-4: 전멸 가드 (전 미디어 격리 시 exit 1, 부분 성공 시 exit 0)
test('T-4: collectInsights live 전멸 가드 검증 (전건 격리 시 exitCode 1, 부분 성공 시 exitCode 0/미설정)', async () => {
  const originalFetch = globalThis.fetch;
  const originalExitCode = process.exitCode;
  const { dir, envFile } = setupTestEnv();
  const originalEnvFile = process.env.IG_ENV_FILE;
  process.env.IG_ENV_FILE = envFile;

  try {
    // 1. 전건 실패 시나리오
    process.exitCode = undefined;
    globalThis.fetch = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('/media_1/insights')) {
        return {
          ok: false,
          status: 400,
          json: async () => ({ error: { message: 'Graph Error', code: 100 } }),
        };
      }
      if (urlStr.includes('/media')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ id: 'media_1', permalink: 'https://instagr.am/p/1' }],
          }),
        };
      }
      // 계정 인사이트 및 미디어 목록 등 기본 성공
      return { ok: true, status: 200, json: async () => ({ id: FAKE_USER_ID, data: [] }) };
    };

    await collectInsights(true);
    assert.equal(process.exitCode, 1);

    // 2. 부분 성공 시나리오 (한 미디어 성공)
    process.exitCode = undefined;
    globalThis.fetch = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('/media_1/insights')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ name: 'reach', values: [{ value: 100 }] }],
          }),
        };
      }
      if (urlStr.includes('/media')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ id: 'media_1', permalink: 'https://instagr.am/p/1' }],
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({ id: FAKE_USER_ID, data: [] }) };
    };

    await collectInsights(true);
    assert.notEqual(process.exitCode, 1);
  } finally {
    globalThis.fetch = originalFetch;
    process.exitCode = originalExitCode;
    if (originalEnvFile !== undefined) process.env.IG_ENV_FILE = originalEnvFile;
    else delete process.env.IG_ENV_FILE;
    rmSync(dir, { recursive: true, force: true });
  }
});

// T-5: stderr 진단 출력 및 토큰 누출 검증
test('T-5: 인사이트 실패 시 stderr 요약 출력 및 안전성(토큰 미포함) 검증', async () => {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  const { dir, envFile } = setupTestEnv();
  const originalEnvFile = process.env.IG_ENV_FILE;
  process.env.IG_ENV_FILE = envFile;

  const stderrLogs = [];
  console.error = (...args) => {
    stderrLogs.push(args.join(' '));
  };

  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/insights')) {
      return {
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: 'Specific metric failed', code: 100, type: 'OAuthException' },
        }),
      };
    }
    return { ok: true, status: 200, json: async () => ({ data: [] }) };
  };

  try {
    try {
      await getMediaInsights('media_999', true);
    } catch {
      // expected throw when all metrics fail
    }

    const combinedStderr = stderrLogs.join('\n');
    // 미디어 ID와 실패 메트릭명 포함 확인
    assert.ok(combinedStderr.includes('media_999'));
    assert.ok(combinedStderr.includes('reach') || combinedStderr.includes('views'));
    // 토큰이 stderr에 포함되지 않는지 확인
    assert.equal(combinedStderr.includes(FAKE_TOKEN), false);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
    if (originalEnvFile !== undefined) process.env.IG_ENV_FILE = originalEnvFile;
    else delete process.env.IG_ENV_FILE;
    rmSync(dir, { recursive: true, force: true });
  }
});

// T-6: IG_ENV_FILE 하위호환 및 오버라이드 검증
test('T-6: IG_ENV_FILE 오버라이드 및 미설정 시 기본 하위호환 동작', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnvFile = process.env.IG_ENV_FILE;
  const originalUserId = process.env.IG_USER_ID;
  const originalAccessToken = process.env.IG_ACCESS_TOKEN;

  delete process.env.IG_USER_ID;
  delete process.env.IG_ACCESS_TOKEN;

  const { dir, envFile } = setupTestEnv();
  process.env.IG_ENV_FILE = envFile;

  let usedToken = '';
  globalThis.fetch = async (url, options) => {
    const authHeader = options?.headers?.Authorization || '';
    usedToken = authHeader.replace('Bearer ', '');
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [{ name: 'reach', values: [{ value: 1 }] }] }),
    };
  };

  try {
    await getMediaInsights('media_env_test', true);
    assert.equal(usedToken, FAKE_TOKEN);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnvFile !== undefined) process.env.IG_ENV_FILE = originalEnvFile;
    else delete process.env.IG_ENV_FILE;
    if (originalUserId !== undefined) process.env.IG_USER_ID = originalUserId;
    if (originalAccessToken !== undefined) process.env.IG_ACCESS_TOKEN = originalAccessToken;
    rmSync(dir, { recursive: true, force: true });
  }
});

// T-7: views 보존 (bulk 성공 픽스처에서 views 포함 확인)
test('T-7: bulk 성공 픽스처에서 insights.data에 views 메트릭 존재 보존', async () => {
  const originalFetch = globalThis.fetch;
  const { dir, envFile } = setupTestEnv();
  const originalEnvFile = process.env.IG_ENV_FILE;
  process.env.IG_ENV_FILE = envFile;

  globalThis.fetch = async (url) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: MEDIA_METRICS.map((m) => ({
          name: m,
          period: 'lifetime',
          values: [{ value: 100 }],
          id: `media_bulk/insights/${m}/lifetime`,
        })),
      }),
    };
  };

  try {
    const result = await getMediaInsights('media_bulk', true);
    assert.ok(Array.isArray(result?.data));
    const viewsItem = result.data.find((item) => item.name === 'views');
    assert.ok(viewsItem, 'bulk 성공 시 views 메트릭 항목이 존재해야 함');
    assert.equal(viewsItem.name, 'views');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnvFile !== undefined) process.env.IG_ENV_FILE = originalEnvFile;
    else delete process.env.IG_ENV_FILE;
    rmSync(dir, { recursive: true, force: true });
  }
});
