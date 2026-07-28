// 카드뉴스 → 릴스 영상 빌더 (1080×1920, H.264+AAC — 인스타 릴스 규격).
//
// 왜 릴스인가: 인스타 게시 API에는 캐러셀/사진에 음악을 붙이는 파라미터가 없다(음악 라이브러리는
// 앱 전용). 유일하게 API 게시에서 음악이 살아남는 경로는 **오디오를 영상 파일에 미리 구워 넣은
// 릴스** — 그래서 카드 장면들을 슬라이드 영상으로 만들고 음악을 트랙으로 굽는다.
// 더 큰 이유가 하나 더 있다(2026-07-29 실측): 팔로워 5,000명 미만 계정이 **비팔로워에게 닿는
// 사실상 유일한 포맷이 릴스**다. 캐러셀 도달률은 '팔로워 대비'라 팔로워 0에서는 0이 곱해진다.
//
// 화면 구성: 9:16 캔버스에 카드(4:5)를 중앙 배치, 배경은 같은 카드를 확대·블러·감광한 면.
//
// ─── 프로파일 ────────────────────────────────────────────────────────────────
// `--profile=reach` (기본) — 도달 최적화. 아래 §훅 설계 참조. 약 9~11초.
// `--profile=full`         — 구버전 동작(전 카드 균등 노출). 아카이브·검토용.
//
// ─── §훅 설계 (2026 리텐션 자료 기준, 근거는 strategy/인스타-최초도달-확보-실행안-0729.md) ───
// 1. **페이드인을 쓰지 않는다.** 시청자는 1.7초 안에 계속/이탈을 정하고 알고리즘은 첫 0.5초의
//    반응을 본다. 구버전은 0.6초 페이드인이라 그 구간이 거의 검은 화면이었다(실측 첫 프레임
//    밝기 YAVG=16). 표지 질문이 **0프레임부터** 최대 밝기로 보여야 한다.
// 2. **표지에 펀치인 줌.** 정지 화면은 '멈춘 콘텐츠'로 읽혀 스크롤을 부른다. 아주 느린 확대로
//    화면이 살아 있게 한다. 카드 디자인 자체는 건드리지 않는다(비주얼 계약 유지).
// 3. **1.6초에 급속 컷 3연발 = 패턴 인터럽트.** 이탈 결정 시점(1.7초)과 리듬 변화를 정확히
//    겹친다. 패턴 인터럽트 계열 훅의 3초 유지율이 72~84%로 가장 높다.
// 4. **그 뒤 느린 켄번즈로 감속(페이오프).** 급속 컷으로 끌어온 주의를 본문에서 회수한다.
// 5. **오픈 루프**: 표지에서 던진 질문을 아웃트로에서 닫는다(카드 문안이 이미 그 구조다).
//
// 사용: node cardnews/tools/build-reel.mjs cardnews/series/northern-alps --cover=cover-a \
//         [--music=경로.wav] [--out=경로.mp4] [--profile=reach|full] [--per=3.2]
// ffmpeg: FFMPEG_BIN 환경변수 → ffmpeg-static 패키지 → /root/bin/ffmpeg → PATH 순서로 찾는다.

import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

function findFfmpeg() {
  const candidates = [process.env.FFMPEG_BIN];
  // ffmpeg-static은 플랫폼별 바이너리를 npm으로 가져온다. 이 워크스테이션(Windows)에는
  // 시스템 ffmpeg가 없어 빌더 자체가 실행 불가였다 — 그래서 후보에 넣는다.
  try { candidates.push(createRequire(import.meta.url)('ffmpeg-static')); } catch { /* 미설치 */ }
  candidates.push('/root/bin/ffmpeg', 'ffmpeg');
  for (const p of candidates) {
    if (!p) continue;
    try { execFileSync(p, ['-version'], { stdio: 'pipe' }); return p; } catch { /* 다음 후보 */ }
  }
  throw new Error('ffmpeg을 찾지 못했습니다 — `npm i -D ffmpeg-static` 또는 FFMPEG_BIN 지정.');
}

const args = process.argv.slice(2);
const seriesDir = args.find(a => !a.startsWith('--'));
const opt = (name, dflt) => args.find(a => a.startsWith(`--${name}=`))?.split('=')[1] ?? dflt;
if (!seriesDir) {
  console.error('사용법: node build-reel.mjs <시리즈 폴더> --cover=cover-a [--profile=reach|full]');
  process.exit(1);
}

const dir = resolve(seriesDir);
const repoRoot = resolve(dir, '..', '..', '..');
const { default: series } = await import(pathToFileURL(join(dir, 'cards.mjs')).href);
const outDir = join(repoRoot, 'cardnews', 'out', basename(dir));
const coverId = opt('cover', 'cover-a');
const profile = opt('profile', 'reach');
if (!['reach', 'full'].includes(profile)) throw new Error(`--profile은 reach 또는 full: ${profile}`);
const per = Number(opt('per', '3.2'));
const music = opt('music', join(repoRoot, 'cardnews', 'assets', 'music', 'placeholder-ambient.wav'));
const out = opt('out', join(outDir, `reel-${coverId}${profile === 'full' ? '-full' : ''}.mp4`));

// 게시 순서: 선택한 표지 1장 + 내지 전체
const cover = series.cards.find(c => c.id === coverId);
if (!cover) throw new Error(`표지 ${coverId}를 cards.mjs에서 찾지 못했습니다.`);
const seq = [cover, ...series.cards.filter(c => c.kind !== 'cover')];

// 장면 구성 — {card, dur, motion}
// motion: 'punch'(빠른 확대) | 'in'(느린 확대) | 'out'(느린 축소) | 'none'(정지)
const HOOK_SEC = Number(opt('hook-sec', '1.6'));
const RAPID_SEC = Number(opt('rapid-sec', '0.5'));
const PAY_SEC = Number(opt('pay-sec', '1.5'));
const OUTRO_SEC = Number(opt('outro-sec', '1.8'));
const RAPID_N = Number(opt('rapid', '3'));
const PAY_N = Number(opt('pay', '3'));

function buildScenes() {
  if (profile === 'full') return seq.map(card => ({ card, dur: per, motion: 'none' }));
  const body = seq.slice(1, -1);
  const outro = seq.length > 1 ? seq.at(-1) : null;
  const rapid = body.slice(0, RAPID_N);
  // 페이오프는 급속 컷 다음 카드들. 본문이 짧으면 있는 만큼만 쓴다.
  const payoff = body.slice(RAPID_N, RAPID_N + PAY_N);
  const scenes = [{ card: seq[0], dur: HOOK_SEC, motion: 'punch' }];
  for (const card of rapid) scenes.push({ card, dur: RAPID_SEC, motion: 'none' });
  // 켄번즈 방향을 번갈아 줘 단조로움을 피한다.
  payoff.forEach((card, i) => scenes.push({ card, dur: PAY_SEC, motion: i % 2 ? 'out' : 'in' }));
  if (outro) scenes.push({ card: outro, dur: OUTRO_SEC, motion: 'in' });
  return scenes;
}

const scenes = buildScenes();
const pngs = scenes.map(({ card }) => {
  const p = join(outDir, `${card.id}.png`);
  if (!existsSync(p)) throw new Error(`${p} 없음 — 먼저 render.mjs로 PNG를 뽑으세요.`);
  return p;
});
if (!existsSync(music)) throw new Error(`음악 파일 없음: ${music} — gen-music.mjs로 만들거나 --music 지정.`);

const FPS = 30;
const total = scenes.reduce((sum, s) => sum + s.dur, 0);

// 입력: 장면마다 정지 PNG를 해당 길이만큼 반복. -framerate로 입력 프레임률을 고정해야
// zoompan의 프레임 계산(d=1, on)이 어긋나지 않는다.
const inputs = scenes.flatMap((s, i) =>
  ['-loop', '1', '-framerate', String(FPS), '-t', s.dur.toFixed(3), '-i', pngs[i]]);
inputs.push('-i', music);

// 켄번즈: zoompan을 d=1로 두면 입력 1프레임 → 출력 1프레임이라 `on`(출력 프레임 번호)으로
// 시간에 따른 확대율을 직접 계산할 수 있다. 합성은 1.5배 캔버스에서 하고 zoompan이
// 1080×1920으로 떨어뜨리므로, 확대해도 카드 글씨가 뭉개지지 않는다.
const CANVAS_W = 1620, CANVAS_H = 2880;
function zoomExpr(motion, dur) {
  const frames = Math.max(1, Math.round(dur * FPS));
  if (motion === 'punch') return `min(1+0.060*on/${frames},1.060)`;
  if (motion === 'in') return `min(1+0.045*on/${frames},1.045)`;
  if (motion === 'out') return `max(1.045-0.045*on/${frames},1.0)`;
  return null; // 'none' — 급속 컷은 정지가 더 선명하다. 리듬 자체가 모션이다.
}

const perScene = scenes.map((s, i) => {
  const z = zoomExpr(s.motion, s.dur);
  const zoompan = z
    ? `,zoompan=z='${z}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${FPS}`
    : `,scale=1080:1920`;
  return `
  [${i}:v]scale=${CANVAS_W}:${CANVAS_H}:force_original_aspect_ratio=increase,crop=${CANVAS_W}:${CANVAS_H},boxblur=60:2,eq=brightness=-0.15[bg${i}];
  [${i}:v]scale=1500:-2[fg${i}];
  [bg${i}][fg${i}]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=${FPS}${zoompan},format=yuv420p[v${i}]`;
}).join(';');

const concat = scenes.map((_, i) => `[v${i}]`).join('') + `concat=n=${scenes.length}:v=1:a=0[vc]`;

// ★ 페이드인 없음(reach). 첫 프레임부터 표지 질문이 최대 밝기로 보여야 한다.
//   full 프로파일만 기존처럼 페이드인을 유지한다.
const fadeIn = profile === 'full' ? 'fade=t=in:st=0:d=0.6,' : '';
const filter = `${perScene};${concat};[vc]${fadeIn}fade=t=out:st=${(total - 0.8).toFixed(2)}:d=0.8[v];`
  + `[${scenes.length}:a]atrim=0:${total.toFixed(2)},afade=t=out:st=${(total - 1.2).toFixed(2)}:d=1.2[a]`;

const ffmpeg = findFfmpeg();
execFileSync(ffmpeg, [
  '-y', ...inputs, '-filter_complex', filter, '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'medium', '-crf', '20',
  '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
  '-t', total.toFixed(2), out,
], { stdio: 'pipe' });

const layout = scenes.map(s => `${s.card.id}:${s.dur}s${s.motion === 'none' ? '' : `/${s.motion}`}`).join(' → ');
console.log(`✓ ${out}`);
console.log(`  프로파일 ${profile} · ${scenes.length}장 · ${total.toFixed(1)}초 · 음악 ${basename(music)}`);
console.log(`  구성: ${layout}`);
if (profile !== 'full') console.log('  훅: 페이드인 없음 + 표지 펀치인 + 1.6초 지점 급속 컷 3연발');
