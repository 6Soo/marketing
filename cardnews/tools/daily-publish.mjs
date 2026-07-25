// 일일 카드뉴스 자동 발행 오케스트레이터 (2026-07-23).
// HTML(cards.mjs) → render.mjs(PNG) → JPEG 변환 → 공개 정적 폴더/GitHub raw 서빙 → instagram-publish.mjs 캐러셀 게시.

import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');            // marketing 리포 루트
const args = process.argv.slice(2);
const opt = (name, dflt) => args.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const flag = name => args.includes(`--${name}`);
const live = flag('publish');

function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const m = readFileSync(join(REPO, '.env'), 'utf8').match(new RegExp(`^${name}=(.+)$`, 'm'));
    if (m) { process.env[name] = m[1].trim(); return process.env[name]; }
  } catch { /* 아래에서 안내 */ }
  return '';
}

// ── 설정 로드 ────────────────────────────────────────────────
const seriesDir = resolve(REPO, opt('series', env('SERIES')));
if (!opt('series', env('SERIES')) || !existsSync(join(seriesDir, 'cards.mjs'))) {
  console.error('시리즈 폴더가 없습니다 — --series=cardnews/series/<이름> (cards.mjs 포함) 지정');
  process.exit(1);
}
const stamp = opt('stamp', new Date().toISOString().slice(0, 10).replace(/-/g, ''));
const seriesName = basename(seriesDir);
const outDir = join(REPO, 'cardnews', 'out', seriesName);

// ── 1) 발행 카드 순서 결정(표지 1장 + 내지 전부, 최대 10장) ──
const { default: series } = await import(pathToFileURL(join(seriesDir, 'cards.mjs')));
const covers = series.cards.filter(c => c.kind === 'cover');
const coverId = opt('cover', covers[0]?.id);
const cover = covers.find(c => c.id === coverId);
if (!cover) { console.error(`표지 카드 '${coverId}'를 못 찾음(후보: ${covers.map(c => c.id).join(', ')})`); process.exit(1); }
let order = [cover, ...series.cards.filter(c => c.kind !== 'cover')];
if (order.length > 10) {
  console.warn(`⚠ 카드 ${order.length}장 → API 캐러셀 상한 10장이라 앞 10장만 게시합니다(나머지 ${order.length - 10}장 제외).`);
  order = order.slice(0, 10);
}
console.log(`시리즈: ${series.meta.series} ${series.meta.number} — ${series.meta.episode}`);
console.log(`게시 카드 ${order.length}장: ${order.map(c => c.id).join(' → ')} (표지=${cover.id})`);

// ── 2) 렌더(PNG). --skip-render면 기존 out/ 재사용 ──
if (!flag('skip-render')) {
  console.log('· 렌더링(render.mjs) …');
  const r = spawnSync('node', [join(REPO, 'cardnews', 'tools', 'render.mjs'), seriesDir],
    { stdio: 'inherit', env: process.env });
  if (r.status !== 0) { console.error('render.mjs 실패 — 위 로그 확인(Chromium 필요).'); process.exit(1); }
}

// ── 3) PNG → JPEG 변환(API가 JPEG만 받음) ──
async function toJpeg(srcPng, destJpg) {
  try { rmSync(destJpg, { force: true }); } catch { /* 이전 시도의 깨진 잔여 파일 제거 */ }
  try {
    const sharp = (await import('sharp')).default;
    await sharp(srcPng).jpeg({ quality: 88, chromaSubsampling: '4:4:4' }).toFile(destJpg);
    return 'sharp';
  } catch { /* 다음 후보 */ }
  const tryCli = (cmd, a) => { const r = spawnSync(cmd, a, { stdio: 'ignore' }); return !r.error && r.status === 0 && existsSync(destJpg); };
  if (tryCli('magick', [srcPng, '-quality', '88', destJpg])) return 'magick';
  if (tryCli('convert', [srcPng, '-quality', '88', destJpg])) return 'convert';
  if (tryCli('ffmpeg', ['-y', '-i', srcPng, '-q:v', '3', destJpg])) return 'ffmpeg';
  if (tryCli('python3', ['-c', "import sys;from PIL import Image;Image.open(sys.argv[1]).convert('RGB').save(sys.argv[2],'JPEG',quality=88)", srcPng, destJpg])) return 'python-PIL';
  return null;
}

const stageDir = join(REPO, 'cardnews', 'out', '_publish', stamp);
mkdirSync(stageDir, { recursive: true });
const urls = [];
let converter = null;
for (const card of order) {
  const src = join(outDir, `${card.id}.png`);
  if (!existsSync(src)) { console.error(`렌더 PNG 없음: ${src} (--skip-render 없이 다시 실행하거나 render 확인)`); process.exit(1); }
  const uniqueId = Date.now().toString(36);
  const fname = `${stamp}-${uniqueId}-${seriesName}-${card.id}.jpg`;
  const dst = join(outDir, fname);
  const how = await toJpeg(src, dst);
  if (!how) {
    if (live) { console.error('JPEG 변환기가 없습니다 — CI/서버에 `npm i sharp`(권장) 설치 필요.'); process.exit(1); }
    console.warn(`⚠ [드라이런] 변환기 없음 → ${fname} 변환 건너뜀(흐름만 표시).`);
  } else { converter = how; }
  urls.push(`https://cdn.jsdelivr.net/gh/6Soo/marketing@Master/cardnews/out/${seriesName}/${fname}`);
}

if (live) {
  console.log('· GitHub raw 호스팅으로 JPEG 커밋 및 푸시 중 …');
  spawnSync('git', ['add', join(outDir, '*.jpg')], { stdio: 'inherit', cwd: REPO });
  spawnSync('git', ['commit', '-m', `build: cardnews JPEGs for ${seriesName}`], { stdio: 'inherit', cwd: REPO });
  spawnSync('git', ['push'], { stdio: 'inherit', cwd: REPO });
}
if (converter) console.log(`· JPEG 변환 완료(${converter}) → ${outDir}`);

// ── 4) 캡션 로드(시리즈 폴더의 캡션.md 또는 caption.txt) ──
let caption = '';
for (const cand of ['캡션.md', 'caption.txt', 'caption.md']) {
  const p = join(seriesDir, cand);
  if (existsSync(p)) {
    const raw = readFileSync(p, 'utf8').trim();
    // 캡션 자동 정제 (마크다운 가이드 주석 및 검토 메모 제거)
    let text = raw;
    if (text.includes('---')) {
      const parts = text.split(/---+/).map(pt => pt.trim()).filter(Boolean);
      const main = parts.find(pt => !pt.startsWith('#') && !pt.startsWith('>') && !pt.startsWith('※'));
      if (main) text = main;
    }
    caption = text.split('\n').filter(line => !line.trim().startsWith('> ') && !line.trim().startsWith('※ ')).join('\n').trim();
    console.log(`· 캡션 정제 로드 완료: ${cand}`);
    break;
  }
}
if (!caption) console.warn('⚠ 캡션 파일(캡션.md/caption.txt)이 없어 빈 캡션으로 진행합니다.');
const capFile = join(stageDir, `_caption-${seriesName}.txt`);
writeFileSync(capFile, caption);

// ── 5) 게시 위임(instagram-publish.mjs carousel) ──
console.log(`\n· 발행 위임 → instagram-publish.mjs carousel (${live ? '실게시' : '드라이런'})`);
const pubArgs = ['carousel', `--images=${urls.join(',')}`, `--caption-file=${capFile}`];
if (live) pubArgs.push('--publish');
const pub = spawnSync('node', [join(REPO, 'tools', 'instagram-publish.mjs'), ...pubArgs],
  { stdio: 'inherit', env: process.env });
if (pub.status !== 0) { console.error('발행 단계 실패 — 위 로그 확인.'); process.exit(1); }

console.log(`\n✓ 완료(${live ? '실게시' : '드라이런'}). 공개 URL ${urls.length}건:`);
urls.forEach(u => console.log('   ' + u));
