// 카드뉴스 → 릴스 영상 빌더 (1080×1920, H.264+AAC — 인스타 릴스 규격).
//
// 왜 릴스인가: 인스타 게시 API에는 캐러셀/사진에 음악을 붙이는 파라미터가 없다(음악 라이브러리는
// 앱 전용). 유일하게 API 게시에서 음악이 살아남는 경로는 **오디오를 영상 파일에 미리 구워 넣은
// 릴스** — 그래서 카드 장면들을 슬라이드 영상으로 만들고 음악을 트랙으로 굽는다.
//
// 화면 구성: 9:16 캔버스에 카드(4:5)를 중앙 배치, 배경은 같은 카드를 확대·블러·감광한 면.
// 장면당 3.2초, 전체 페이드 인/아웃. 컷 전환(v1 — xfade는 이 ffmpeg 빌드(4.1)에 없음).
//
// 사용: node cardnews/tools/build-reel.mjs cardnews/series/sanriku --cover=cover-a \
//         [--music=경로.wav] [--out=경로.mp4] [--per=3.2]
// ffmpeg: FFMPEG_BIN 환경변수 → /root/bin/ffmpeg → PATH 순서로 찾는다.

import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

function findFfmpeg() {
  for (const p of [process.env.FFMPEG_BIN, '/root/bin/ffmpeg', 'ffmpeg']) {
    if (!p) continue;
    try { execFileSync(p, ['-version'], { stdio: 'pipe' }); return p; } catch { /* 다음 후보 */ }
  }
  throw new Error('ffmpeg을 찾지 못했습니다 — 설치: npm pack @ffmpeg-installer/linux-x64 후 압축 해제, FFMPEG_BIN 지정.');
}

const args = process.argv.slice(2);
const seriesDir = args.find(a => !a.startsWith('--'));
const opt = (name, dflt) => args.find(a => a.startsWith(`--${name}=`))?.split('=')[1] ?? dflt;
if (!seriesDir) {
  console.error('사용법: node build-reel.mjs <시리즈 폴더> --cover=cover-a [--music=..] [--out=..]');
  process.exit(1);
}

const dir = resolve(seriesDir);
const repoRoot = resolve(dir, '..', '..', '..');
const { default: series } = await import(pathToFileURL(join(dir, 'cards.mjs')).href);
const outDir = join(repoRoot, 'cardnews', 'out', basename(dir));
const coverId = opt('cover', 'cover-a');
const per = Number(opt('per', '3.2'));
const music = opt('music', join(repoRoot, 'cardnews', 'assets', 'music', 'placeholder-ambient.wav'));
const out = opt('out', join(outDir, `reel-${coverId}.mp4`));

// 게시 순서: 선택한 표지 1장 + 내지 전체
const cover = series.cards.find(c => c.id === coverId);
if (!cover) throw new Error(`표지 ${coverId}를 cards.mjs에서 찾지 못했습니다.`);
const seq = [cover, ...series.cards.filter(c => c.kind !== 'cover')];
const pngs = seq.map(c => {
  const p = join(outDir, `${c.id}.png`);
  if (!existsSync(p)) throw new Error(`${p} 없음 — 먼저 render.mjs로 PNG를 뽑으세요.`);
  return p;
});
if (!existsSync(music)) throw new Error(`음악 파일 없음: ${music} — gen-music.mjs로 만들거나 --music 지정.`);

const total = pngs.length * per;
// 입력: 카드 PNG들(각각 정지화면 per초) + 음악
const inputs = pngs.flatMap(p => ['-loop', '1', '-t', String(per), '-i', p]);
inputs.push('-i', music);

// 필터: 카드마다 [배경(확대+블러+감광)][전경(중앙)] 합성 → concat → 전체 페이드
const perCard = pngs.map((_, i) => `
  [${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:2,eq=brightness=-0.15[bg${i}];
  [${i}:v]scale=1000:-2[fg${i}];
  [bg${i}][fg${i}]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30,format=yuv420p[v${i}]`).join(';');
const concat = pngs.map((_, i) => `[v${i}]`).join('') + `concat=n=${pngs.length}:v=1:a=0[vc]`;
const filter = `${perCard};${concat};[vc]fade=t=in:st=0:d=0.6,fade=t=out:st=${(total - 0.8).toFixed(2)}:d=0.8[v];` +
  `[${pngs.length}:a]atrim=0:${total.toFixed(2)},afade=t=out:st=${(total - 2).toFixed(2)}:d=2[a]`;

const ffmpeg = findFfmpeg();
execFileSync(ffmpeg, [
  '-y', ...inputs, '-filter_complex', filter, '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'medium', '-crf', '20',
  '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
  '-t', total.toFixed(2), out,
], { stdio: 'pipe' });
console.log(`✓ ${out} (${pngs.length}장 × ${per}s = ${total.toFixed(1)}s, 음악: ${basename(music)})`);
