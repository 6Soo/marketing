import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

function option(args, name) {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function hasPublishedCheckpoint(root, id) {
  const indexPath = join(root, 'data', 'activation', id, 'index.json');
  if (!existsSync(indexPath)) return false;
  try {
    const records = JSON.parse(readFileSync(indexPath, 'utf8'));
    return records.some((record) => Boolean(record.publishedPermalink));
  } catch {
    return false;
  }
}

export function discoverActivationExperiments(root = REPO, requested) {
  const experimentsDir = join(root, 'data', 'experiments');
  const ids = readdirSync(experimentsDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.slice(0, -5))
    .filter((id) => hasPublishedCheckpoint(root, id))
    .sort();
  if (!requested) return ids;
  if (!ids.includes(requested)) {
    throw new Error(`게시 체크포인트가 있는 실험을 찾지 못했습니다: ${requested}`);
  }
  return [requested];
}

async function main() {
  const args = process.argv.slice(2);
  const experiments = discoverActivationExperiments(REPO, option(args, 'experiment'));
  if (!experiments.length) throw new Error('감시할 활성 Instagram 실험이 없습니다.');
  console.log(args.includes('--json') ? JSON.stringify(experiments) : experiments.join('\n'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
