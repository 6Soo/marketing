import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const METRICS = [
  'reach',
  'likes',
  'comments',
  'saves',
  'shares',
  'profileVisits',
  'follows',
  'postsTotal',
  'followersTotal',
  'followingTotal',
  'story_sado_visit',
  'story_sado_context',
  'story_sado_related',
  'story_sado_discoveries',
  'story_sado_tour',
];
const SOURCES = new Set(['instagram-ui', 'graph-api', 'foresttour-admin']);

function option(args, name) {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function nonNegativeInteger(value, name) {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) throw new Error(`${name}은 0 이상의 정수여야 합니다.`);
  return Number(value);
}

function safeTimestamp(value = new Date().toISOString()) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) throw new Error('observed-at은 유효한 ISO 날짜여야 합니다.');
  return parsed.toISOString();
}

function atomicJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(temporary, path);
}

export function buildCheckpoint({
  experiment,
  checkpoint,
  source,
  observedAt,
  permalink,
  values = {},
}) {
  if (!experiment || !/^[a-z0-9-]+$/.test(experiment)) {
    throw new Error('experiment는 영문 소문자·숫자·하이픈 식별자여야 합니다.');
  }
  if (!checkpoint) throw new Error('checkpoint가 필요합니다(예: 0h, 24h, 72h, 7d).');
  if (!SOURCES.has(source)) {
    throw new Error(`source는 ${[...SOURCES].join(', ')} 중 하나여야 합니다.`);
  }
  const metrics = {};
  for (const metric of METRICS) {
    const value = nonNegativeInteger(values[metric], metric);
    if (value !== undefined) metrics[metric] = value;
  }
  if (!permalink && Object.keys(metrics).length === 0) {
    throw new Error('permalink 또는 실제 확인한 지표가 하나 이상 필요합니다.');
  }
  if (permalink) {
    const url = new URL(permalink);
    if (url.protocol !== 'https:' || url.hostname !== 'www.instagram.com') {
      throw new Error('permalink는 https://www.instagram.com/ 게시물 URL이어야 합니다.');
    }
  }
  return {
    schemaVersion: 1,
    experiment,
    checkpoint,
    source,
    observedAt: safeTimestamp(observedAt),
    ...(permalink ? { publishedPermalink: permalink } : {}),
    metrics,
  };
}

export function activationStatus(records) {
  const permalink = records.find((record) => record.publishedPermalink)?.publishedPermalink;
  const latest = {};
  const checkpointOrder = { pre: -1, '0h': 0, '24h': 24, '72h': 72, '7d': 168 };
  const orderedRecords = [...records].sort((a, b) => {
    const phaseDifference =
      (checkpointOrder[a.checkpoint] ?? 0) - (checkpointOrder[b.checkpoint] ?? 0);
    return phaseDifference || (a.observedAt ?? '').localeCompare(b.observedAt ?? '');
  });
  for (const record of orderedRecords) {
    for (const [name, value] of Object.entries(record.metrics ?? {})) latest[name] = value;
  }
  const organicInteraction =
    (latest.likes ?? 0) + (latest.comments ?? 0) + (latest.saves ?? 0) + (latest.shares ?? 0) > 0;
  const instagramAttributedStoryVisit = (latest.story_sado_visit ?? 0) > 0;
  return {
    status: permalink && organicInteraction && instagramAttributedStoryVisit
      ? 'initial-activation-evidenced'
      : 'collecting',
    evidence: {
      publishedPermalink: Boolean(permalink),
      organicInteraction,
      instagramAttributedStoryVisit,
    },
    latestMetrics: latest,
  };
}

export function recordCheckpoint(record, root = REPO) {
  const compactTime = record.observedAt.replace(/[:.]/g, '-');
  const output = join(
    root,
    'data',
    'activation',
    record.experiment,
    `${record.checkpoint}-${compactTime}-${record.source}.json`,
  );
  atomicJson(output, record);
  return output;
}

function loadRecords(experiment, root = REPO) {
  const indexPath = join(root, 'data', 'activation', experiment, 'index.json');
  try {
    return JSON.parse(readFileSync(indexPath, 'utf8'));
  } catch {
    return [];
  }
}

export function updateIndex(record, root = REPO) {
  const records = loadRecords(record.experiment, root);
  records.push(record);
  records.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const indexPath = join(root, 'data', 'activation', record.experiment, 'index.json');
  atomicJson(indexPath, records);
  return { indexPath, records };
}

async function main() {
  const args = process.argv.slice(2);
  const experiment = option(args, 'experiment');
  const checkpoint = option(args, 'checkpoint');
  const source = option(args, 'source');
  const observedAt = option(args, 'observed-at');
  const permalink = option(args, 'permalink');
  const values = Object.fromEntries(METRICS.map((metric) => [metric, option(args, metric)]));
  const record = buildCheckpoint({
    experiment,
    checkpoint,
    source,
    observedAt,
    permalink,
    values,
  });
  const output = recordCheckpoint(record);
  const { indexPath, records } = updateIndex(record);
  console.log(`체크포인트 저장: ${output}`);
  console.log(`실험 인덱스 갱신: ${indexPath}`);
  console.log(JSON.stringify(activationStatus(records), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
