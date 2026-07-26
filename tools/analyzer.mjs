/**
 * Instagram Insights 스냅샷을 보수적으로 집계한다.
 * 훅 공식과 게시물의 매핑이 없는 상태에서는 임의로 성과를 귀속하지 않는다.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const INSIGHTS_DIR = join(REPO, 'data', 'insights');
const PERFORMANCE_FILE = join(REPO, 'data', 'performance.json');

function metricValue(payload, name) {
  if (payload == null) return 0;
  if (typeof payload[name] === 'number') return payload[name];
  const row = payload.data?.find(item => item.name === name);
  return Number(row?.values?.[0]?.value ?? row?.total_value?.value ?? 0) || 0;
}

function loadPerformance() {
  if (existsSync(PERFORMANCE_FILE)) return JSON.parse(readFileSync(PERFORMANCE_FILE, 'utf8'));
  return {
    version: 1,
    hookFormulas: {},
    seriesPerformance: {},
    channelPerformance: {},
    lastUpdated: null,
  };
}

export function analyzePerformance() {
  const performance = loadPerformance();
  const files = existsSync(INSIGHTS_DIR)
    ? readdirSync(INSIGHTS_DIR).filter(file => file.endsWith('.json')).sort()
    : [];

  const totals = { snapshots: files.length, posts: 0, reach: 0, saved: 0, shares: 0, likes: 0, comments: 0 };
  for (const file of files) {
    const snapshot = JSON.parse(readFileSync(join(INSIGHTS_DIR, file), 'utf8'));
    for (const entry of snapshot.media || []) {
      const metrics = entry.insights?.insights || entry.insights || {};
      totals.posts += 1;
      totals.reach += metricValue(metrics, 'reach');
      totals.saved += metricValue(metrics, 'saved');
      totals.shares += metricValue(metrics, 'shares');
      totals.likes += Number(entry.media?.like_count ?? metricValue(metrics, 'likes')) || 0;
      totals.comments += Number(entry.media?.comments_count ?? metricValue(metrics, 'comments')) || 0;
    }
  }

  performance.channelPerformance.instagram = {
    ...totals,
    saveRate: totals.reach > 0 ? totals.saved / totals.reach : 0,
  };
  performance.lastUpdated = new Date().toISOString();
  writeFileSync(PERFORMANCE_FILE, JSON.stringify(performance, null, 2) + '\n', 'utf8');
  console.log(`성과 집계 완료: 스냅샷 ${totals.snapshots}개, 게시물 관측 ${totals.posts}건`);
  return performance;
}

export function getHookRanking() {
  const performance = loadPerformance();
  return Object.entries(performance.hookFormulas || {})
    .filter(([, value]) => Number(value.uses) > 0)
    .map(([id, value]) => ({
      id,
      name: value.name || id,
      uses: Number(value.uses) || 0,
      saveRate: Number(value.avgReach) > 0 ? Number(value.avgSaves) / Number(value.avgReach) : 0,
    }))
    .sort((a, b) => b.saveRate - a.saveRate);
}

export function generateReport() {
  const performance = analyzePerformance();
  const instagram = performance.channelPerformance.instagram;
  const hooks = getHookRanking();
  const stamp = new Date().toISOString().slice(0, 10);
  const outDir = join(REPO, 'strategy');
  mkdirSync(outDir, { recursive: true });

  const hookRows = hooks.length
    ? hooks.map((hook, index) => `${index + 1}. ${hook.name} — 저장률 ${(hook.saveRate * 100).toFixed(2)}% (${hook.uses}회)`).join('\n')
    : '게시물과 훅 공식의 검증된 매핑이 없어 순위를 산출하지 않았습니다.';
  const report = `# 주간 마케팅 리포트 — ${stamp}

## 수집 상태

- Insights 스냅샷: ${instagram.snapshots}개
- 관측 게시물: ${instagram.posts}건
- 도달: ${instagram.reach}
- 저장: ${instagram.saved}
- 공유: ${instagram.shares}
- 저장률: ${(instagram.saveRate * 100).toFixed(2)}%

## 훅 공식 성과

${hookRows}

## 판정

실측값이 없는 항목은 추정값으로 채우지 않았습니다. 훅 공식 비교는 게시물 ID와
카드 시리즈의 연결 정보가 쌓인 뒤 시작합니다.
`;
  const outFile = join(outDir, `주간리포트-${stamp}.md`);
  writeFileSync(outFile, report, 'utf8');
  console.log(`주간 리포트 생성 완료: ${outFile}`);
  return outFile;
}

const command = process.argv[2];
if (process.argv[1]?.endsWith('analyzer.mjs')) {
  if (command === 'analyze') analyzePerformance();
  else if (command === 'report') generateReport();
  else if (command === 'hooks') console.log(JSON.stringify(getHookRanking(), null, 2));
  else {
    console.error('사용법: node tools/analyzer.mjs [analyze|report|hooks]');
    process.exitCode = 1;
  }
}
