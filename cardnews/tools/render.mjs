// 카드뉴스 렌더러 — 시리즈 데이터(cards.mjs) → 1080×1350 PNG (인스타 실게시 실물).
// 비주얼은 template.mjs의 현행 디자인 시스템(evidence-v2)을 사용한다.
//
// 사용:
//   node cardnews/tools/render.mjs cardnews/series/sanriku            # PNG 전 장
//   node cardnews/tools/render.mjs cardnews/series/sanriku --only=cover-a
//
// 산출물 전달 규칙: 이미지형 산출물은 PDF로 묶지 말고 PNG 원본을 직접 전달(사장 지적 2026-07-21).

import { writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { cardHTML } from './template.mjs';
import { captureScreenshot } from './chrome-capture.mjs';

function findChrome() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  // headless_shell 우선: 일반 chrome 바이너리는 --headless 스크린샷에서 창 높이의 약 78px을
  // UI 몫으로 떼어 하단이 투명으로 잘린다(실측 2026-07-21).
  const roots = [
    '/opt/pw-browsers',
    process.env.HOME ? join(process.env.HOME, '.cache', 'ms-playwright') : null,
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'ms-playwright') : null,
    process.env.USERPROFILE ? join(process.env.USERPROFILE, 'AppData', 'Local', 'ms-playwright') : null,
  ].filter(Boolean);
  const bins = [
    join('chrome-linux', 'headless_shell'),
    join('chrome-linux', 'chrome'),
    join('chrome-win', 'headless_shell.exe'),
    join('chrome-win', 'chrome.exe'),
    join('chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
  ];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    let entries = [];
    try { entries = readdirSync(root); } catch { continue; }
    for (const prefix of ['chromium_headless_shell-', 'chromium-']) {
      for (const d of entries) {
        if (!d.startsWith(prefix)) continue;
        for (const bin of bins) {
          const p = join(root, d, bin);
          if (existsSync(p)) return p;
        }
      }
    }
  }
  for (const p of [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ]) if (existsSync(p)) return p;
  throw new Error('Chromium/Chrome/Edge를 찾지 못했습니다 — CHROME_BIN 환경변수로 경로를 지정하세요.');
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
  const screenshotPath = join(outDir, card.id + '.png');
  writeFileSync(htmlPath, cardHTML(series.meta, c, page, total));
  const result = await captureScreenshot(chrome, [
    '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--disable-background-networking', '--no-first-run',
    '--force-device-scale-factor=1', '--disable-dev-shm-usage',
    `--screenshot=${screenshotPath}`, '--window-size=1080,1350', htmlPath,
  ], screenshotPath);
  console.log(`✓ ${card.id}.png (${result.width}×${result.height}, ${Math.round(result.bytes / 1024)}KB${result.forcedShutdown ? ', 지연 프로세스 정리' : ''})`);
}
