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

function loadIndex(experiment, root) {
  try {
    return JSON.parse(
      readFileSync(join(root, 'data', 'activation', experiment, 'index.json'), 'utf8'),
    );
  } catch {
    return [];
  }
}

export function ingestPublishResult({ experiment, result, source: requestedSource, root = REPO }) {
  if (!result || typeof result !== 'object') throw new Error('게시 결과 JSON 객체가 필요합니다.');
  if (!result.permalink) throw new Error('게시 결과에 permalink가 없습니다.');
  if (!result.timestamp) throw new Error('게시 결과에 timestamp가 없습니다.');

  const source = requestedSource ?? result.source ?? 'graph-api';
  if (!['graph-api', 'instagram-ui'].includes(source)) {
    throw new Error('source must be graph-api or instagram-ui');
  }
  const existing = loadIndex(experiment, root);
  const duplicate = existing.find(
    (record) =>
      record.checkpoint === '0h'
      && record.source === source
      && record.publishedPermalink === result.permalink,
  );
  if (duplicate) {
    return {
      outcome: 'already-recorded',
      record: duplicate,
      status: activationStatus(existing),
    };
  }

  const record = buildCheckpoint({
    experiment,
    checkpoint: '0h',
    source,
    observedAt: result.timestamp,
    permalink: result.permalink,
  });
  const output = recordCheckpoint(record, root);
  const { indexPath, records } = updateIndex(record, root);
  return {
    outcome: 'recorded',
    output,
    indexPath,
    record,
    status: activationStatus(records),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const experiment = option(args, 'experiment');
  const resultFile = option(args, 'result-file');
  const source = option(args, 'source');
  if (!experiment) throw new Error('--experiment=<id>가 필요합니다.');
  if (!resultFile) throw new Error('--result-file=<path>가 필요합니다.');
  const result = JSON.parse(readFileSync(resolve(resultFile), 'utf8'));
  console.log(JSON.stringify(ingestPublishResult({ experiment, result, source }), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
