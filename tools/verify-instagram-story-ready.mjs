import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildActivationReport } from './instagram-activation-report.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function option(args, name) {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function json(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function verifyStoryReady({
  manifest,
  experiment,
  series,
  records,
  assetMetadata,
  now = new Date(),
}) {
  const failures = [];
  if (manifest.schemaVersion !== 1 || manifest.format !== 'instagram-story') {
    failures.push('manifest 형식이 올바르지 않습니다.');
  }
  if (manifest.publishGate !== '24h-checkpoint-recorded') {
    failures.push('24h 체크포인트 게시 게이트가 없습니다.');
  }
  if (assetMetadata?.format !== 'jpeg'
      || assetMetadata.width !== 1080
      || assetMetadata.height !== 1920) {
    failures.push('Story 자산은 1080×1920 JPEG여야 합니다.');
  }

  const report = buildActivationReport(experiment, records, now);
  const checkpoint24h = report.checkpoints.find((item) => item.checkpoint === '24h');
  if (checkpoint24h?.state !== 'recorded') {
    failures.push(`24h 체크포인트가 기록되지 않았습니다: ${checkpoint24h?.state ?? 'missing'}`);
  }

  const expectedSource = series.meta?.landing?.sources?.story;
  const expectedPath = series.meta?.landing?.storyPath;
  const expectedEvent = experiment.foresttourMetrics.find(
    (metric) => /^story_.+_visit$/.test(metric),
  );
  let stickerUrl;
  try {
    stickerUrl = new URL(manifest.linkSticker?.url);
  } catch {
    failures.push('링크 스티커 URL이 유효하지 않습니다.');
  }
  if (stickerUrl) {
    if (stickerUrl.origin !== 'https://foresttour.kr'
        || stickerUrl.pathname !== expectedPath
        || stickerUrl.searchParams.get('from') !== expectedSource) {
      failures.push('링크 스티커 URL이 시리즈의 story 계약과 일치하지 않습니다.');
    }
  }
  if (manifest.measurement?.source !== expectedSource
      || manifest.measurement?.expectedEvent !== expectedEvent
      || manifest.measurement?.environment !== experiment.attributionEnvironment) {
    failures.push('Story 측정 계약이 실험 설정과 일치하지 않습니다.');
  }
  if (failures.length) throw new Error(`Story 게시 준비 실패:\n- ${failures.join('\n- ')}`);
  return {
    ready: true,
    experiment: experiment.id,
    checkpoint: '24h',
    asset: manifest.asset,
    linkSticker: manifest.linkSticker,
    measurement: manifest.measurement,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const experimentId = option(args, 'experiment');
  const manifestArg = option(args, 'manifest');
  if (!experimentId || !/^[a-z0-9-]+$/.test(experimentId) || !manifestArg) {
    throw new Error('--experiment=<id>와 --manifest=<path>가 필요합니다.');
  }
  const manifestPath = resolve(manifestArg);
  const manifest = json(manifestPath);
  const experiment = json(join(REPO, 'data', 'experiments', `${experimentId}.json`));
  const records = json(join(REPO, 'data', 'activation', experimentId, 'index.json'));
  const seriesPath = join(REPO, 'cardnews', 'series', manifest.series, 'cards.mjs');
  const { default: series } = await import(pathToFileURL(seriesPath).href);
  const assetPath = resolve(dirname(manifestPath), manifest.asset);
  if (!existsSync(assetPath)) throw new Error(`Story 자산이 없습니다: ${assetPath}`);
  const { default: sharp } = await import('sharp');
  const assetMetadata = await sharp(assetPath).metadata();

  const result = verifyStoryReady({
    manifest,
    experiment,
    series,
    records,
    assetMetadata,
  });
  if (args.includes('--live-link')) {
    const response = await fetch(result.linkSticker.url, { redirect: 'follow' });
    if (!response.ok) throw new Error(`Story 링크 확인 실패: HTTP ${response.status}`);
    result.liveLinkStatus = response.status;
  }
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
