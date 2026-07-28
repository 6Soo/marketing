import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { activationStatus } from './record-instagram-activation.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const CHECKPOINT_HOURS = { '0h': 0, '24h': 24, '72h': 72, '7d': 168 };

// 지각 수집 차단용 유예 시간.
//
// Instagram 인사이트는 시점값이 아니라 **누적 lifetime 값**이다. 24h 체크포인트를 50시간 뒤에
// 읽으면 "24시간 시점의 수치"가 아니라 "지금까지 쌓인 수치"가 들어온다. 그런데도 라벨은 24h로
// 남으므로, 학습 단계에서 체크포인트 간 비교가 조용히 오염된다.
//
// 예약 수집기는 6시간마다 돈다(.github/workflows/instagram-activation-checkpoints.yml `15 */6 * * *`).
// 정상 운영이라면 도래 후 한 주기 안에 반드시 잡힌다. 그 안에 못 잡았다면 그것은 지연이 아니라
// **복구 불가능한 누락**이므로 `missed`로 확정하고 다시는 수집 대상으로 올리지 않는다.
// (실제 사고: 2026-07-26~29 Meta 차단 기간에 사도·북알프스 24h가 통째로 누락됐다.)
export const COLLECTION_GRACE_HOURS = 6;

function option(args, name) {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function json(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function checkpointCoverage(experiment, records, checkpoint) {
  const observations = records.filter((record) => record.checkpoint === checkpoint);
  const observationsWithMetrics = observations.filter(
    (record) => Object.keys(record.metrics ?? {}).length > 0,
  );
  const requiredSourceGroups = checkpoint === '0h'
    ? []
    : experiment.measurementSourceGroups ?? [];
  const missingSourceGroups = requiredSourceGroups.filter(
    (group) => !observationsWithMetrics.some((record) => group.includes(record.source)),
  );
  return {
    complete: observationsWithMetrics.length > 0 && missingSourceGroups.length === 0,
    observations: observations.length,
    missingSourceGroups,
  };
}

export function buildActivationReport(
  experiment,
  records,
  now = new Date(),
  { graceHours = COLLECTION_GRACE_HOURS } = {},
) {
  const published = records
    .filter((record) => record.publishedPermalink)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt))[0];
  if (!published) throw new Error(`${experiment.id}: 게시 permalink 체크포인트가 없습니다.`);

  const publishedAt = new Date(published.observedAt);
  const graceMs = graceHours * 60 * 60 * 1000;
  const checkpoints = experiment.checkpoints.map((checkpoint) => {
    const hours = CHECKPOINT_HOURS[checkpoint];
    if (hours === undefined) throw new Error(`지원하지 않는 체크포인트: ${checkpoint}`);
    const dueAt = new Date(publishedAt.valueOf() + hours * 60 * 60 * 1000);
    const coverage = checkpointCoverage(experiment, records, checkpoint);
    let state;
    if (coverage.complete) state = 'recorded';
    else if (now < dueAt) state = 'upcoming';
    else if (now.valueOf() <= dueAt.valueOf() + graceMs) state = 'due';
    else state = 'missed';
    return {
      checkpoint,
      dueAt: dueAt.toISOString(),
      state,
      observations: coverage.observations,
      missingSourceGroups: coverage.missingSourceGroups,
    };
  });
  // 'missed'는 의도적으로 후보에서 제외한다 — 되살릴 수 없는 창을 뒤늦게 채우면 안 된다.
  const next = checkpoints.find((item) => item.state === 'due')
    ?? checkpoints.find((item) => item.state === 'upcoming')
    ?? null;

  return {
    experiment: experiment.id,
    permalink: published.publishedPermalink,
    publishedAt: publishedAt.toISOString(),
    generatedAt: now.toISOString(),
    activation: activationStatus(records),
    checkpoints,
    // 누락은 조용히 사라지면 안 된다. 학습·판단 단계가 "관측했는데 0이었다"와
    // "관측 자체를 못 했다"를 구분할 수 있도록 명시적으로 노출한다.
    missedCheckpoints: checkpoints
      .filter((item) => item.state === 'missed')
      .map((item) => ({ checkpoint: item.checkpoint, dueAt: item.dueAt })),
    nextAction: next
      ? {
          checkpoint: next.checkpoint,
          dueAt: next.dueAt,
          action: next.state === 'due' ? 'collect-now' : 'wait-until-due',
        }
      : null,
  };
}

export function reportMarkdown(report) {
  const rows = report.checkpoints.map(
    (item) => `| ${item.checkpoint} | ${item.dueAt} | ${item.state} | ${item.observations} | ${
      item.missingSourceGroups.map((group) => group.join(' or ')).join('; ') || '—'
    } |`,
  );
  return [
    `# Instagram activation · ${report.experiment}`,
    '',
    `- Post: ${report.permalink}`,
    `- Activation: ${report.activation.status}`,
    `- Next: ${report.nextAction
      ? `${report.nextAction.checkpoint} · ${report.nextAction.action} · ${report.nextAction.dueAt}`
      : 'complete'}`,
    ...(report.missedCheckpoints?.length
      ? [`- **Missed (복구 불가): ${report.missedCheckpoints
          .map((item) => `${item.checkpoint} (due ${item.dueAt})`)
          .join(', ')}** — 유예 ${COLLECTION_GRACE_HOURS}시간을 넘겨 수집하지 않는다.`]
      : []),
    '',
    '| Checkpoint | Due (UTC) | State | Records | Missing source groups |',
    '| --- | --- | --- | ---: | --- |',
    ...rows,
    '',
  ].join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const experimentId = option(args, 'experiment');
  if (!experimentId || !/^[a-z0-9-]+$/.test(experimentId)) {
    throw new Error('--experiment=<id>가 필요합니다.');
  }
  const at = option(args, 'at');
  const now = at ? new Date(at) : new Date();
  if (Number.isNaN(now.valueOf())) throw new Error('--at은 유효한 ISO 날짜여야 합니다.');

  const experiment = json(join(REPO, 'data', 'experiments', `${experimentId}.json`));
  const records = json(join(REPO, 'data', 'activation', experimentId, 'index.json'));
  const report = buildActivationReport(experiment, records, now);
  console.log(args.includes('--json') ? JSON.stringify(report, null, 2) : reportMarkdown(report));
  if (report.checkpoints.some((item) => item.state === 'due')) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
