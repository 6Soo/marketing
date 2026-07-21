// 카드뉴스 렌더러 — 시리즈 데이터(cards.mjs) → 1080×1350 PNG + 검토용 PDF.
// 외부 패키지 없이 Node 내장 모듈 + 로컬 Chromium 헤드리스만 사용한다.
//
// 사용:
//   node cardnews/tools/render.mjs cardnews/series/sanriku          # PNG 전 장
//   node cardnews/tools/render.mjs cardnews/series/sanriku --pdf    # + 검토용 PDF
//   node cardnews/tools/render.mjs cardnews/series/sanriku --only=cover-a
//
// 원리(왜 이렇게 만들었나):
// - 카드 한 장 = HTML 한 페이지. 디자인을 CSS로 통제하면 수정·반복이 코드 diff로 남고,
//   포토샵 없이도 문구 A/B를 몇 초 만에 다시 뽑을 수 있다.
// - Chromium `--screenshot`은 뷰포트 크기 그대로 PNG를 쓴다 → 1080×1350(인스타 4:5) 고정.
// - PDF는 `--print-to-pdf` + CSS `@page{size:1080px 1350px}` 조합 — 카드 1장 = PDF 1쪽.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { cardHTML, reviewHTML } from './template.mjs';

function findChrome() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  // headless_shell을 우선한다: 일반 chrome 바이너리는 --headless 스크린샷에서
  // 창 높이의 약 78px을 UI 몫으로 떼어 하단이 투명으로 잘리는 문제가 있다(실측 2026-07-21).
  const roots = ['/opt/pw-browsers'];
  for (const prefix of ['chromium_headless_shell-', 'chromium-']) {
    for (const root of roots) {
      if (!existsSync(root)) continue;
      for (const d of readdirSync(root)) {
        if (!d.startsWith(prefix)) continue;
        for (const bin of ['headless_shell', 'chrome']) {
          const p = join(root, d, 'chrome-linux', bin);
          if (existsSync(p)) return p;
        }
      }
    }
  }
  throw new Error('Chromium을 찾지 못했습니다 — CHROME_BIN 환경변수로 경로를 지정하세요.');
}

const CHROME_FLAGS = ['--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--force-device-scale-factor=1', '--disable-dev-shm-usage'];

function shot(chrome, htmlPath, pngPath) {
  execFileSync(chrome, [...CHROME_FLAGS, `--screenshot=${pngPath}`, '--window-size=1080,1350', htmlPath],
    { stdio: 'pipe' }); // Chromium이 dbus 경고를 stderr로 뿜지만 렌더와 무관하다.
}

function pdf(chrome, htmlPath, pdfPath) {
  execFileSync(chrome, [...CHROME_FLAGS, `--print-to-pdf=${pdfPath}`, '--no-pdf-header-footer', htmlPath],
    { stdio: 'pipe' });
}

// ---- main ----
const args = process.argv.slice(2);
const seriesDir = args.find(a => !a.startsWith('--'));
if (!seriesDir) {
  console.error('사용법: node render.mjs <시리즈 폴더> [--pdf] [--only=카드id]');
  process.exit(1);
}
const wantPdf = args.includes('--pdf');
const only = args.find(a => a.startsWith('--only='))?.split('=')[1];

const dir = resolve(seriesDir);
const { default: series } = await import(pathToFileURL(join(dir, 'cards.mjs')));
const outDir = join(dir, '..', '..', 'out', basename(dir));
mkdirSync(outDir, { recursive: true });

const chrome = findChrome();
const work = join(tmpdir(), `cardnews-${basename(dir)}`);
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

// 쪽번호: 표지(변형 몇 개든 게시 때는 1장)=1쪽, 내지는 2쪽부터.
const numbered = series.cards.filter(c => c.kind !== 'cover');
const total = numbered.length + 1;

const cards = series.cards.filter(c => !only || c.id === only);
for (const card of cards) {
  const page = card.kind === 'cover' ? 1 : numbered.indexOf(card) + 2;
  const html = cardHTML(series.meta, card, page, total);
  const htmlPath = join(work, `${card.id}.html`);
  writeFileSync(htmlPath, html);
  const pngPath = join(outDir, `${card.id}.png`);
  shot(chrome, htmlPath, pngPath);
  console.log(`✓ ${card.id}.png`);
}

if (wantPdf) {
  // 검토용 PDF: (선택) 시리즈 폴더의 review-intro.html 조각 → 표지 후보 그리드 → 전 카드 풀사이즈.
  const introPath = join(dir, 'review-intro.html');
  const intro = existsSync(introPath) ? readFileSync(introPath, 'utf8') : '';
  const html = reviewHTML(series.meta, series.cards, intro, outDir);
  const htmlPath = join(work, 'review.html');
  writeFileSync(htmlPath, html);
  const pdfPath = join(outDir, 'review.pdf');
  pdf(chrome, htmlPath, pdfPath);
  console.log(`✓ review.pdf`);
}

// 실게시 전 교체할 사진 목록을 함께 남긴다 — 사진 수급이 별도 작업이라 잊기 쉬움.
const notes = series.cards.filter(c => c.photoNote).map(c => `- ${c.id}: ${c.photoNote}`);
if (notes.length) {
  writeFileSync(join(outDir, '사진-수급-목록.md'),
    `# ${series.meta.episode} — 실게시 전 사진 교체 목록\n\n${notes.join('\n')}\n`);
  console.log(`✓ 사진-수급-목록.md (${notes.length}건)`);
}
