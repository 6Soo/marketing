import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { activationStatus } from './record-instagram-activation.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const CHECKPOINT_HOURS = { '0h': 0, '24h': 24, '72h': 72, '7d': 168 };

function option(args, name) {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function json(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function buildActivationReport(experiment, records, now = new Date()) {
  const published = records
    .filter((record) => record.publishedPermalink)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt))[0];
  if (!published) throw new Error(`${experiment.id}: 게시 permalink 체크포인트가 없습니다.`);

  const publishedAt = new Date(published.observedAt);
  const checkpoints = experiment.checkpoints.map((checkpoint) => {
    const hours = CHECKPOINT_HOURS[checkpoint];
    if (hours === undefined) throw new Error(`지원하지 않는 체크포인트: ${checkpoint}`);
    const dueAt = new Date(publishedAt.valueOf() + hours * 60 * 60 * 1000);
    const observations = records.filter((record) => record.checkpoint === checkpoint);
    const hasMetrics = observations.some(
      (record) => Object.keys(record.metrics ?? {}).length > 0,
    );
    return {
      checkpoint,
      dueAt: dueAt.toISOString(),
      state: hasMetrics ? 'recorded' : now >= dueAt ? 'due' : 'upcoming',
      observations: observations.length,
    };
  });
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
    (item) => `| ${item.checkpoint} | ${item.dueAt} | ${item.state} | ${item.observations} |`,
  );
  return [
    `# Instagram activation · ${report.experiment}`,
    '',
    `- Post: ${report.permalink}`,
    `- Activation: ${report.activation.status}`,
    `- Next: ${report.nextAction
      ? `${report.nextAction.checkpoint} · ${report.nextAction.action} · ${report.nextAction.dueAt}`
      : 'complete'}`,
    '',
    '| Checkpoint | Due (UTC) | State | Records |',
    '| --- | --- | --- | ---: |',
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
