import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  activationStatus,
  buildCheckpoint,
  recordCheckpoint,
  updateIndex,
} from './record-instagram-activation.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

function option(args, name) {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function normalizePermalink(value) {
  return String(value || '').replace(/\/+$/, '');
}

function insightValue(insight) {
  const direct = insight?.total_value?.value;
  if (Number.isFinite(Number(direct))) return Number(direct);
  const values = insight?.values;
  if (Array.isArray(values) && values.length) {
    const value = values.at(-1)?.value;
    if (Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

export function extractInstagramMetrics(snapshot, permalink) {
  const entry = snapshot?.media?.find(
    (item) => normalizePermalink(item?.media?.permalink) === normalizePermalink(permalink),
  );
  if (!entry) throw new Error(`Instagram 스냅샷에서 게시물을 찾지 못했습니다: ${permalink}`);
  const byName = new Map(
    (entry.insights?.data ?? []).map((insight) => [insight.name, insightValue(insight)]),
  );
  const metrics = {};
  const mapped = {
    reach: byName.get('reach'),
    saves: byName.get('saved'),
    shares: byName.get('shares'),
    likes: byName.get('likes') ?? entry.media.like_count,
    comments: byName.get('comments') ?? entry.media.comments_count,
  };
  for (const [name, value] of Object.entries(mapped)) {
    if (Number.isInteger(Number(value)) && Number(value) >= 0) metrics[name] = Number(value);
  }
  if (!Object.keys(metrics).length) throw new Error('게시물에서 확인 가능한 Instagram 지표가 없습니다.');
  return metrics;
}

export function extractForesttourMetrics(payload, experiment) {
  if (!Array.isArray(payload?.funnelRows)) {
    throw new Error('foresttour 집계에 funnelRows 배열이 없습니다.');
  }
  return Object.fromEntries(
    experiment.foresttourMetrics.map((event) => [
      event,
      payload.funnelRows
        .filter((row) => row.source === experiment.sourceCode && row.event === event)
        .reduce((sum, row) => sum + Number(row.count || 0), 0),
    ]),
  );
}

function saveMetrics({ experiment, checkpoint, source, metrics, root = REPO }) {
  const record = buildCheckpoint({
    experiment,
    checkpoint,
    source,
    values: Object.fromEntries(
      Object.entries(metrics).map(([name, value]) => [name, String(value)]),
    ),
  });
  const output = recordCheckpoint(record, root);
  const { indexPath, records } = updateIndex(record, root);
  return { output, indexPath, record, status: activationStatus(records) };
}

async function main() {
  const args = process.argv.slice(2);
  const experimentId = option(args, 'experiment');
  const checkpoint = option(args, 'checkpoint');
  const instagramFile = option(args, 'instagram-file');
  const foresttourFile = option(args, 'foresttour-file');
  const foresttourLive = args.includes('--foresttour-live');
  if (!experimentId || !checkpoint) {
    throw new Error('--experiment=<id>와 --checkpoint=<24h|72h|7d>가 필요합니다.');
  }
  if (!instagramFile && !foresttourFile && !foresttourLive) {
    throw new Error('--instagram-file, --foresttour-file, --foresttour-live 중 하나 이상 필요합니다.');
  }
  if (foresttourFile && foresttourLive) {
    throw new Error('--foresttour-file과 --foresttour-live는 함께 사용할 수 없습니다.');
  }
  const experiment = JSON.parse(
    readFileSync(join(REPO, 'data', 'experiments', `${experimentId}.json`), 'utf8'),
  );
  const records = JSON.parse(
    readFileSync(join(REPO, 'data', 'activation', experimentId, 'index.json'), 'utf8'),
  );
  const permalink = records.find((record) => record.publishedPermalink)?.publishedPermalink;
  if (!permalink) throw new Error('실험에 게시 permalink가 없습니다.');

  const results = [];
  if (instagramFile) {
    const snapshot = JSON.parse(readFileSync(resolve(instagramFile), 'utf8'));
    results.push(saveMetrics({
      experiment: experimentId,
      checkpoint,
      source: 'graph-api',
      metrics: extractInstagramMetrics(snapshot, permalink),
    }));
  }
  if (foresttourFile || foresttourLive) {
    let payload;
    if (foresttourLive) {
      const adminKey = process.env.FORESTTOUR_ADMIN_KEY;
      if (!adminKey) throw new Error('FORESTTOUR_ADMIN_KEY가 필요합니다.');
      const response = await fetch('https://foresttour.kr/api/track?days=90', {
        headers: { 'x-admin-key': adminKey },
      });
      if (!response.ok) throw new Error(`foresttour 집계 요청 실패: HTTP ${response.status}`);
      payload = await response.json();
    } else {
      payload = JSON.parse(readFileSync(resolve(foresttourFile), 'utf8'));
    }
    results.push(saveMetrics({
      experiment: experimentId,
      checkpoint,
      source: 'foresttour-admin',
      metrics: extractForesttourMetrics(payload, experiment),
    }));
  }
  console.log(JSON.stringify(results, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
