import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { activationStatus } from './record-instagram-activation.mjs';
import { discoverActivationExperiments } from './list-instagram-activation-experiments.mjs';
import { checkpointCoverage } from './instagram-activation-report.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

function sum(metrics, names) {
  return names.reduce((total, name) => total + Number(metrics[name] ?? 0), 0);
}

function rate(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

export function learnExperiment(experiment, records) {
  const completeMeasuredCheckpoints = new Set(
    experiment.checkpoints
      .filter((checkpoint) => !['pre', '0h'].includes(checkpoint))
      .filter((checkpoint) => checkpointCoverage(experiment, records, checkpoint).complete),
  );
  const learningRecords = records.filter(
    (record) =>
      ['pre', '0h'].includes(record.checkpoint)
      || completeMeasuredCheckpoints.has(record.checkpoint),
  );
  const status = activationStatus(learningRecords);
  const metrics = status.latestMetrics;
  const hasMeasuredCheckpoint = completeMeasuredCheckpoints.size > 0;
  const interactions = sum(metrics, ['likes', 'comments', 'saves', 'shares']);
  const visitMetric = experiment.foresttourMetrics.find((name) => name.endsWith('_visit'));
  const attributedVisits = Number(metrics[visitMetric] ?? 0);
  const reach = Number(metrics.reach ?? 0);
  const pre = records
    .filter((record) => record.checkpoint === 'pre')
    .flatMap((record) => Object.entries(record.metrics ?? {}))
    .reduce((values, [name, value]) => ({ ...values, [name]: value }), {});
  const followerDelta =
    Number.isFinite(metrics.followersTotal) && Number.isFinite(pre.followersTotal)
      ? metrics.followersTotal - pre.followersTotal
      : null;

  let recommendation = '다음 측정 체크포인트까지 기다린다.';
  if (hasMeasuredCheckpoint) {
    if (reach === 0) recommendation = '도달 경로와 게시 노출 상태를 먼저 점검한다.';
    else if (interactions === 0) recommendation = '표지 훅과 첫 두 장의 저장 가치를 개선한다.';
    else if (attributedVisits === 0) recommendation = '프로필·캡션의 foresttour 이동 안내를 강화한다.';
    else recommendation = '현재 포맷을 다음 여행지에 반복하고 방문 이후 이탈 구간을 개선한다.';
  }

  return {
    experiment: experiment.id,
    destination: experiment.destination,
    status: status.status,
    dataState: hasMeasuredCheckpoint ? 'measured' : 'awaiting-checkpoint',
    reach,
    interactions,
    attributedVisits,
    interactionRate: rate(interactions, reach),
    attributedVisitRate: rate(attributedVisits, reach),
    followerDelta,
    recommendation,
  };
}

export function compareExperiments(results) {
  return [...results].sort((a, b) => {
    const measured = Number(b.dataState === 'measured') - Number(a.dataState === 'measured');
    const activated =
      Number(b.status === 'initial-activation-evidenced')
      - Number(a.status === 'initial-activation-evidenced');
    return measured || activated || b.attributedVisits - a.attributedVisits
      || b.interactions - a.interactions || b.reach - a.reach;
  });
}

function percent(value) {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`;
}

export function learningMarkdown(results) {
  const ranked = compareExperiments(results);
  return [
    '# Instagram activation learning',
    '',
    '| Experiment | State | Reach | Interactions | Story visits | Interaction rate | Visit rate |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
    ...ranked.map((item) =>
      `| ${item.destination} (${item.experiment}) | ${item.dataState} | ${item.reach} | `
      + `${item.interactions} | ${item.attributedVisits} | ${percent(item.interactionRate)} | `
      + `${percent(item.attributedVisitRate)} |`),
    '',
    '## Next actions',
    '',
    ...ranked.map((item) => `- **${item.destination}**: ${item.recommendation}`),
    '',
  ].join('\n');
}

async function main() {
  const ids = discoverActivationExperiments(REPO);
  const results = ids.map((id) => {
    const experiment = JSON.parse(
      readFileSync(join(REPO, 'data', 'experiments', `${id}.json`), 'utf8'),
    );
    const records = JSON.parse(
      readFileSync(join(REPO, 'data', 'activation', id, 'index.json'), 'utf8'),
    );
    return learnExperiment(experiment, records);
  });
  console.log(process.argv.includes('--json')
    ? JSON.stringify(compareExperiments(results), null, 2)
    : learningMarkdown(results));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
