// 카드뉴스 렌더러 — 시리즈 데이터(cards.mjs) → 1080×1350 PNG (인스타 실게시 실물).
// 비주얼은 template.mjs가 기준본(나만몰랐던일본-001-히다.html) CSS를 그대로 사용한다.
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
import { searchPhotos } from '../../tools/stock-photo.mjs';

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

  const prefixes = ['chromium_headless_shell-', 'chromium-'];
  const relBins = [
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
    for (const prefix of prefixes) {
      for (const d of entries) {
        if (!d.startsWith(prefix)) continue;
        for (const bin of relBins) {
          const p = join(root, d, bin);
          if (existsSync(p)) return p;
        }
      }
    }
  }

  const systemCandidates = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const sysPath of systemCandidates) {
    if (existsSync(sysPath)) return sysPath;
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

async function ensurePhoto(card, repoRoot, seriesName) {
  if (card.photo && existsSync(resolve(repoRoot, card.photo))) {
    return pathToFileURL(resolve(repoRoot, card.photo)).href;
  }
  if (card.kind === 'paper') return null; // 종이 카드는 사진 없이 종이 텍스처
  console.log(`· [자동 사진 소싱] ${card.id} 카드 배경 사진 Pexels 수급 중…`);
  const query = `${seriesName} ${card.title || card.eye || 'japan'}`.replace(/<br>/g, ' ');
  try {
    const photos = await searchPhotos(query, { orientation: 'portrait', perPage: 1 });
    if (photos.length > 0 && photos[0].src?.portrait) {
      const imgUrl = photos[0].src.portrait;
      const targetDir = join(repoRoot, 'cardnews', 'photos', seriesName);
      mkdirSync(targetDir, { recursive: true });
      const targetFile = join(targetDir, `${card.id}.jpg`);
      const res = await fetch(imgUrl);
      const arrayBuffer = await res.arrayBuffer();
      writeFileSync(targetFile, Buffer.from(arrayBuffer));
      console.log(`  ✓ 자동 수급 저장 완료: cardnews/photos/${seriesName}/${card.id}.jpg`);
      return pathToFileURL(targetFile).href;
    }
  } catch (err) {
    console.warn(`  ⚠ 자동 사진 소싱 실패 (${err.message}) — 기본 템플릿 처리`);
  }
  return null;
}

for (const card of series.cards.filter(c => !only || c.id === only)) {
  const page = card.kind === 'cover' ? 1 : numbered.indexOf(card) + 2;
  const photoUrl = await ensurePhoto(card, repoRoot, basename(dir));
  const c = photoUrl ? { ...card, photoUrl } : card;
  const htmlPath = join(work, `${card.id}.html`);
  writeFileSync(htmlPath, cardHTML(series.meta, c, page, total));
  execFileSync(chrome, ['--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--disable-dev-shm-usage',
    `--screenshot=${join(outDir, card.id + '.png')}`, '--window-size=1080,1350', htmlPath],
    { stdio: 'pipe' });
  console.log(`✓ ${card.id}.png`);
}
