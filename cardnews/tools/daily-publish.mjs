// 일일 카드뉴스 자동 발행 오케스트레이터 (2026-07-23).
// HTML(cards.mjs) → render.mjs(PNG) → JPEG 변환 → 공개 정적 폴더로 스테이징 → instagram-publish.mjs 캐러셀 게시.
//
// ⚠ 핵심 사실(공식 문서 실측 2026-07-23): 인스타 Content Publishing API는 **JPEG만** 받는다
//   ("JPEG is the only image format supported"). render.mjs 산출물은 PNG이므로 이 단계에서
//   반드시 JPEG로 변환한 뒤 공개 URL로 올려야 한다. 미디어는 공개 URL 필수(Graph API가 URL에서 받아감).
//
// 발행 자체는 tools/instagram-publish.mjs(carousel)에 위임 — 여기서는 render→변환→스테이징→캡션까지 조립.
//
// 설정(.env 또는 환경변수):
//   SERIES           오늘 발행할 시리즈 폴더 (예: cardnews/series/sanriku)   [--series= 로도 지정]
//   PUBLIC_DIR       Vercel 등으로 공개 서빙되는 정적 폴더의 로컬 경로(변환 JPEG를 여기에 씀)
//   PUBLIC_BASE_URL  위 폴더가 매핑되는 공개 URL (예: https://reserve.foresttour.kr/ig)
//   IG_USER_ID, IG_ACCESS_TOKEN   instagram-publish.mjs가 실게시(--publish) 때 사용
//
// 사용(기본은 드라이런 — 실제 전송은 --publish):
//   node cardnews/tools/daily-publish.mjs --series=cardnews/series/sanriku
//   node cardnews/tools/daily-publish.mjs --series=cardnews/series/sanriku --cover=cover-a --publish
//   옵션: --cover=<표지 카드 id>(기본 첫 cover) · --skip-render(기존 out/ 재사용) · --stamp=YYYYMMDD
//         --stage-only(PUBLIC_DIR에 JPEG·캡션·manifest만 준비) · --validate-live(실게시 안전조건만 검사)
//   (클라우드/CI 프록시 환경에서는 NODE_USE_ENV_PROXY=1 접두)

import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');            // marketing 리포 루트
const args = process.argv.slice(2);
const opt = (name, dflt) => args.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const flag = name => args.includes(`--${name}`);
const channels = opt('channels', 'ig').split(',');
const live = flag('publish');
const stageOnly = flag('stage-only');
const validateLive = flag('validate-live');
const experimentId = opt('experiment', '');
if ((live || validateLive) && !/^[a-z0-9-]+$/.test(experimentId)) {
  console.error('실게시 추적을 위해 유효한 --experiment=<id>가 필요합니다.');
  process.exit(1);
}

function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const m = readFileSync(join(REPO, '.env'), 'utf8').match(new RegExp(`^${name}=(.+)$`, 'm'));
    if (m) { process.env[name] = m[1].trim(); return process.env[name]; }  // 자식 프로세스에도 전파되도록 process.env에 반영
  } catch { /* 아래에서 안내 */ }
  return '';
}

// ── 설정 로드 ────────────────────────────────────────────────
const seriesDir = resolve(REPO, opt('series', env('SERIES')));
if (!opt('series', env('SERIES')) || !existsSync(join(seriesDir, 'cards.mjs'))) {
  console.error('시리즈 폴더가 없습니다 — --series=cardnews/series/<이름> (cards.mjs 포함) 지정');
  process.exit(1);
}
const publicDir = env('PUBLIC_DIR');
const publicBase = (env('PUBLIC_BASE_URL') || '').replace(/\/$/, '');
const stamp = opt('stamp', new Date().toISOString().slice(0, 10).replace(/-/g, ''));
const seriesName = basename(seriesDir);
const outDir = join(REPO, 'cardnews', 'out', seriesName);

// ── 1) 발행 카드 순서 결정(표지 1장 + 내지 전부, 최대 10장) ──
const { default: series } = await import(pathToFileURL(join(seriesDir, 'cards.mjs')));
if ((live || validateLive) && series.meta?.photoStatus !== 'verified') {
  console.error(`실게시 차단: 사진 상태가 '${series.meta?.photoStatus || '미표기'}'입니다.`);
  console.error(series.meta?.photoNote || '현지 실사진과 출처를 확인한 뒤 meta.photoStatus를 verified로 바꾸세요.');
  process.exit(1);
}
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

if (validateLive) {
  console.log('✓ 실게시 안전조건 검사 통과');
  process.exit(0);
}

// 실게시엔 공개 호스팅 설정이 필수. stage-only는 공개 배포 전 로컬 스테이징이라 PUBLIC_DIR만 필요.
if (live && (!publicDir || !publicBase)) {
  console.error('실게시(--publish)에는 PUBLIC_DIR·PUBLIC_BASE_URL이 필요합니다(변환 JPEG를 공개 URL로 올려야 함).');
  process.exit(1);
}
if (stageOnly && !publicDir) {
  console.error('스테이징(--stage-only)에는 PUBLIC_DIR이 필요합니다.');
  process.exit(1);
}

// ── 2) 렌더(PNG). --skip-render면 기존 out/ 재사용 ──
if (!flag('skip-render')) {
  console.log('· 렌더링(render.mjs) …');
  const r = spawnSync('node', [join(REPO, 'cardnews', 'tools', 'render.mjs'), seriesDir],
    { stdio: 'inherit', env: process.env });
  if (r.status !== 0) { console.error('render.mjs 실패 — 위 로그 확인(Chromium 필요).'); process.exit(1); }
}

// ── 3) PNG → JPEG 변환(API가 JPEG만 받음) ──
// 변환기 우선순위: sharp(권장·CI에 npm i) → magick → convert → ffmpeg → python3 Pillow.
async function toJpeg(srcPng, destJpg) {
  try { rmSync(destJpg, { force: true }); } catch { /* 이전 시도의 깨진 잔여 파일 제거 — existsSync 오탐 방지 */ }
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

const stageDir = (live || stageOnly) ? publicDir : join(REPO, 'cardnews', 'out', '_publish', stamp);
mkdirSync(stageDir, { recursive: true });
const urls = [];
const files = [];
let converter = null;
for (const card of order) {
  const src = join(outDir, `${card.id}.png`);
  if (!existsSync(src)) { console.error(`렌더 PNG 없음: ${src} (--skip-render 없이 다시 실행하거나 render 확인)`); process.exit(1); }
  const fname = `${stamp}-${seriesName}-${card.id}.jpg`;
  const dst = join(stageDir, fname);
  const how = await toJpeg(src, dst);
  if (!how) {
    if (live || stageOnly) { console.error('JPEG 변환기가 없습니다 — CI/서버에 `npm i sharp`(권장) 또는 ImageMagick/ffmpeg 설치 필요.'); process.exit(1); }
    console.warn(`⚠ [드라이런] 변환기 없음 → ${fname} 변환 건너뜀(흐름만 표시). 실게시 전 sharp 설치 필요.`);
  } else { converter = how; }
  files.push(fname);
  urls.push(publicBase ? `${publicBase}/${fname}` : `<PUBLIC_BASE_URL>/${fname}`);
}
if (converter) console.log(`· JPEG 변환 완료(${converter}) → ${stageDir}`);

// ── 4) 캡션 로드(시리즈 폴더의 캡션.md 또는 caption.txt) ──
let caption = '';
for (const cand of ['캡션.md', 'caption.txt', 'caption.md']) {
  const p = join(seriesDir, cand);
  if (existsSync(p)) {
    const raw = readFileSync(p, 'utf8').trim();
    const sections = raw.split(/\r?\n---\r?\n/);
    caption = (sections.length >= 3 ? sections[1] : raw).trim();
    console.log(`· 캡션: ${cand} (게시 본문만 추출)`);
    break;
  }
}
if (!caption) console.warn('⚠ 캡션 파일(캡션.md/caption.txt)이 없어 빈 캡션으로 진행합니다.');
const fingerprintHash = createHash('sha256').update(caption);
for (const file of files) fingerprintHash.update(readFileSync(join(stageDir, file)));
const contentFingerprint = fingerprintHash.digest('hex');
const capFile = join(stageDir, `_caption-${seriesName}.txt`);
writeFileSync(capFile, caption);
const manifestFile = join(stageDir, `_manifest-${seriesName}.json`);
const publishResultFile = join(stageDir, `_publish-result-${seriesName}.json`);
writeFileSync(manifestFile, JSON.stringify({
  series: seriesName,
  experiment: experimentId || null,
  stamp,
  photoStatus: series.meta?.photoStatus || 'unmarked',
  files,
  captionFile: basename(capFile),
  contentFingerprint,
}, null, 2));

if (stageOnly) {
  console.log(`\n✓ 공개 배포용 스테이징 완료: ${stageDir}`);
  console.log(`· manifest: ${manifestFile}`);
  process.exit(0);
}

// ── 5) 다채널 발행 위임 ──
const results = { ig: 'skipped', cafe: 'skipped', band: 'skipped' };
let failed = false;

if (channels.includes('ig')) {
  console.log(`\n· 발행 위임 → instagram-publish.mjs carousel (${live ? '실게시' : '드라이런'})`);
  const pubArgs = [
    'carousel',
    `--images=${urls.join(',')}`,
    `--caption-file=${capFile}`,
    `--fingerprint=${contentFingerprint}`,
  ];
  if (live) pubArgs.push('--publish', `--result-file=${publishResultFile}`);
  const pub = spawnSync('node', [join(REPO, 'tools', 'instagram-publish.mjs'), ...pubArgs],
    { stdio: 'inherit', env: process.env });
  if (pub.status !== 0) {
    console.error('인스타그램 발행 단계 실패 — 위 로그 확인.');
    results.ig = 'failed';
    failed = true;
  } else {
    results.ig = live ? 'published' : 'dry-run';
    if (live && experimentId) {
      const ingest = spawnSync('node', [
        join(REPO, 'tools', 'ingest-instagram-publish-result.mjs'),
        `--experiment=${experimentId}`,
        `--result-file=${publishResultFile}`,
      ], { stdio: 'inherit', env: process.env });
      if (ingest.status !== 0) {
        console.error('Instagram 게시 결과 활성화 체크포인트 기록 실패.');
        results.ig = 'failed';
        failed = true;
      }
    }
  }
}

if (channels.includes('cafe')) {
  console.log('\n· 카페용 게시글 생성 → cafe-publish.mjs');
  const cafeArgs = [`--series=${seriesDir}`];
  const pub = spawnSync('node', [join(REPO, 'tools', 'cafe-publish.mjs'), ...cafeArgs],
    { stdio: 'inherit', env: process.env });
  if (pub.status !== 0) {
    console.error('다음 카페 발행 실패 — 위 로그 확인.');
    results.cafe = 'failed';
    failed = true;
  } else {
    results.cafe = 'generated';
  }
}

if (channels.includes('band')) {
  console.log('\n· 밴드용 게시글 생성 → band-publish.mjs');
  const dayStr = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
  const bandArgs = [`--series=${seriesDir}`, `--day=${dayStr}`];
  const pub = spawnSync('node', [join(REPO, 'tools', 'band-publish.mjs'), ...bandArgs],
    { stdio: 'inherit', env: process.env });
  if (pub.status !== 0) {
    console.error('네이버 밴드 발행 실패 — 위 로그 확인.');
    results.band = 'failed';
    failed = true;
  } else {
    results.band = 'generated';
  }
}

// 루프 상태 저장 (Phase 4 학습 데이터용)
if (live) {
  const stateDir = join(REPO, 'data', 'loop-state');
  mkdirSync(stateDir, { recursive: true });
  const stateFile = join(stateDir, `${stamp}-${seriesName}.json`);
  const publishResult = existsSync(publishResultFile)
    ? JSON.parse(readFileSync(publishResultFile, 'utf8'))
    : null;
  writeFileSync(stateFile, JSON.stringify({
    series: seriesName,
    stamp,
    channels: results,
    live,
    publishResult,
  }, null, 2));
  console.log(`\n· 발행 상태 저장 완료: ${stateFile}`);
}

console.log(`\n✓ 완료(${live ? '실게시' : '드라이런'}). 공개 URL ${urls.length}건:`);
urls.forEach(u => console.log('   ' + u));
console.log('채널별 처리 결과:', results);
if (!live) console.log('※ 실게시하려면: 호스팅(PUBLIC_DIR/BASE) 연결 + JPEG 배포 라이브 확인 후 --publish');
if (live && channels.some(channel => channel !== 'ig')) {
  console.warn('※ 카페·밴드는 게시글 파일만 생성합니다. 외부 채널 자동 게시는 수행하지 않습니다.');
}
if (failed) process.exit(1);
