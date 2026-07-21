// 카드뉴스 렌더러 — 시리즈 데이터(cards.mjs) → 1080×1350 PNG (인스타 실게시 실물).
// 비주얼은 template.mjs가 기준본(그들이모르는일본-001-히다.html) CSS를 그대로 사용한다.
//
// 사용:
//   node cardnews/tools/render.mjs cardnews/series/sanriku            # PNG 전 장
//   node cardnews/tools/render.mjs cardnews/series/sanriku --only=cover-a
//
// 산출물 전달 규칙: 이미지형 산출물은 PDF로 묶지 말고 PNG 원본을 직접 전달(사장 지적 2026-07-21).

import { writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { cardHTML } from './template.mjs';

function findChrome() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  // headless_shell 우선: 일반 chrome 바이너리는 --headless 스크린샷에서 창 높이의 약 78px을
  // UI 몫으로 떼어 하단이 투명으로 잘린다(실측 2026-07-21).
  for (const prefix of ['chromium_headless_shell-', 'chromium-']) {
    const root = '/opt/pw-browsers';
    if (!existsSync(root)) continue;
    for (const d of readdirSync(root)) {
      if (!d.startsWith(prefix)) continue;
      for (const bin of ['headless_shell', 'chrome']) {
        const p = join(root, d, 'chrome-linux', bin);
        if (existsSync(p)) return p;
      }
    }
  }
  throw new Error('Chromium을 찾지 못했습니다 — CHROME_BIN 환경변수로 경로를 지정하세요.');
}

const args = process.argv.slice(2);
const seriesDir = args.find(a => !a.startsWith('--'));
if (!seriesDir) {
  console.error('사용법: node render.mjs <시리즈 폴더> [--only=카드id]');
  process.exit(1);
}
const only = args.find(a => a.startsWith('--only='))?.split('=')[1];

const dir = resolve(seriesDir);
const repoRoot = resolve(dir, '..', '..', '..');
const { default: series } = await import(pathToFileURL(join(dir, 'cards.mjs')));
const outDir = join(repoRoot, 'cardnews', 'out', basename(dir));
mkdirSync(outDir, { recursive: true });

const chrome = findChrome();
const work = join(tmpdir(), `cardnews-${basename(dir)}`);
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

// 쪽번호: 표지(변형 몇 개든 게시 때는 1장)=1쪽, 내지는 2쪽부터.
const numbered = series.cards.filter(c => c.kind !== 'cover');
const total = numbered.length + 1;

for (const card of series.cards.filter(c => !only || c.id === only)) {
  const page = card.kind === 'cover' ? 1 : numbered.indexOf(card) + 2;
  const c = card.photo
    ? { ...card, photoUrl: pathToFileURL(resolve(repoRoot, card.photo)).href }
    : card;
  const htmlPath = join(work, `${card.id}.html`);
  writeFileSync(htmlPath, cardHTML(series.meta, c, page, total));
  execFileSync(chrome, ['--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--disable-dev-shm-usage',
    `--screenshot=${join(outDir, card.id + '.png')}`, '--window-size=1080,1350', htmlPath],
    { stdio: 'pipe' });
  console.log(`✓ ${card.id}.png`);
}
