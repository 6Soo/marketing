/**
 * 검증된 훅 성과가 있을 때만 다음 학습 메모를 만든다.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const dryRun = process.argv.includes('--dry-run');

export function updateStrategy() {
  const performanceFile = join(REPO, 'data', 'performance.json');
  if (!existsSync(performanceFile)) throw new Error('data/performance.json이 없습니다.');

  const performance = JSON.parse(readFileSync(performanceFile, 'utf8'));
  const ranked = Object.entries(performance.hookFormulas || {})
    .filter(([, value]) => Number(value.uses) > 0 && Number(value.avgReach) > 0)
    .map(([id, value]) => ({
      id,
      name: value.name || id,
      uses: Number(value.uses),
      saveRate: Number(value.avgSaves) / Number(value.avgReach),
    }))
    .sort((a, b) => b.saveRate - a.saveRate);

  if (!ranked.length) {
    console.log('검증된 훅 성과 데이터가 없어 전략 파일을 만들지 않습니다.');
    return null;
  }

  const learningDir = join(REPO, 'learning');
  const ids = readdirSync(learningDir)
    .map(file => Number(file.match(/^학습-(\d+)/)?.[1]))
    .filter(Number.isFinite);
  const nextId = String(Math.max(0, ...ids) + 1).padStart(2, '0');
  const best = ranked[0];
  const stamp = new Date().toISOString().slice(0, 10);
  const content = `# 학습-${nextId} — 훅 성과 갱신 (${stamp})

- 가장 높은 저장률 훅: ${best.name}
- 사용 횟수: ${best.uses}
- 평균 저장률: ${(best.saveRate * 100).toFixed(2)}%

표본이 적으면 우선순위를 확정하지 않습니다. 다음 게시물에서도 다른 훅을 함께 시험해 비교합니다.
`;
  const outFile = join(learningDir, `학습-${nextId}-훅-성과.md`);
  if (dryRun) console.log(content);
  else {
    writeFileSync(outFile, content, 'utf8');
    console.log(`전략 학습 파일 생성: ${outFile}`);
  }
  return outFile;
}

if (process.argv[1]?.endsWith('strategy-updater.mjs')) {
  try {
    updateStrategy();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
