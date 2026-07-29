// 검증된 원본 사진으로 직접 만드는 풍경 릴스 빌더.
//
// 카드뉴스 PNG를 영상에 옮기지 않는다. 화면은 풍경이 주인공이고, 텍스트는 장소 라벨 하나만 쓴다.
// 기존 게시 증거(reel-cover-a.mp4)를 덮지 않고 reel-scenic-v2.mp4로 별도 출력한다.
//
// 사용:
//   node cardnews/tools/build-scenic-reel.mjs
//   node cardnews/tools/build-scenic-reel.mjs --out=/tmp/reel.mp4

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const args = process.argv.slice(2);
const opt = (name, fallback) =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;

function findFfmpeg() {
  const candidates = [process.env.FFMPEG_BIN];
  try { candidates.push(createRequire(import.meta.url)('ffmpeg-static')); } catch { /* optional */ }
  candidates.push('ffmpeg');
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      execFileSync(candidate, ['-version'], { stdio: 'pipe' });
      return candidate;
    } catch { /* try next */ }
  }
  throw new Error('ffmpeg을 찾지 못했습니다.');
}

const photoDir = join(REPO, 'cardnews', 'photos', 'northern-alps');
const music = opt(
  'music',
  join(REPO, 'cardnews', 'assets', 'music', 'reflected-light-sergepavkinmusic-147979.mp3'),
);
const output = opt(
  'out',
  join(REPO, 'cardnews', 'out', 'northern-alps', 'reel-scenic-v2.mp4'),
);
const font = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';

// 겨울 → 고산 호수 → 가을 능선 → 겨울 폭포. 마지막과 첫 장면의 색·계절을 맞춰 루프를 닫는다.
// focus는 세로 크롭의 가로 중심(0=왼쪽, 1=오른쪽), motion은 확대 방향이다.
const scenes = [
  { file: '00-murodo-snow.jpg', duration: 2.6, focus: 0.63, motion: 'in' },
  { file: '02-mikurigaike.jpg', duration: 2.6, focus: 0.50, motion: 'pan' },
  { file: '04-daikanbo-autumn.jpg', duration: 2.4, focus: 0.50, motion: 'out' },
  { file: '07-hirayu-falls.jpg', duration: 2.4, focus: 0.50, motion: 'in' },
];

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

for (const scene of scenes) {
  const photo = join(photoDir, scene.file);
  const source = `${photo}.source.json`;
  if (!existsSync(photo) || !existsSync(source)) {
    throw new Error(`검증 사진 또는 source JSON 없음: ${scene.file}`);
  }
  const metadata = JSON.parse(readFileSync(source, 'utf8'));
  if (!/^(?:CC0|CC BY(?: |$))/.test(metadata.license || '')) {
    throw new Error(`허용되지 않은 라이선스: ${scene.file} · ${metadata.license || '없음'}`);
  }
  if (sha256(photo) !== metadata.sha256) {
    throw new Error(`사진 SHA-256 불일치: ${scene.file}`);
  }
}
if (!existsSync(music)) throw new Error(`음원 없음: ${music}`);
if (!existsSync(font)) throw new Error(`한글 폰트 없음: ${font}`);

const fps = 30;
const total = scenes.reduce((sum, scene) => sum + scene.duration, 0);
const inputs = scenes.flatMap((scene) => [
  '-loop', '1',
  '-framerate', String(fps),
  '-t', scene.duration.toFixed(3),
  '-i', join(photoDir, scene.file),
]);
inputs.push('-i', music);

function sceneFilter(scene, index) {
  const frames = Math.round(scene.duration * fps);
  const cropX = `(iw-ow)*${scene.focus.toFixed(2)}`;
  const zoom = scene.motion === 'out'
    ? `max(1.065-0.065*on/${frames},1.0)`
    : `min(1+0.065*on/${frames},1.065)`;
  const pan = scene.motion === 'pan'
    ? `x='iw/2-(iw/zoom/2)+(iw-iw/zoom)*0.18*on/${frames}'`
    : `x='iw/2-(iw/zoom/2)'`;
  return `[${index}:v]`
    + `crop=w='ih*9/16':h=ih:x='${cropX}':y=0,`
    + 'scale=1296:2304,'
    + `zoompan=z='${zoom}':d=1:${pan}:y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps},`
    + 'setsar=1,format=yuv420p'
    + `[v${index}]`;
}

const filters = scenes.map(sceneFilter);
const streams = scenes.map((_, index) => `[v${index}]`).join('');
filters.push(`${streams}concat=n=${scenes.length}:v=1:a=0[base]`);

// ffmpeg-static에는 drawtext가 없으므로 libass 자막으로 장소 라벨을 합성한다.
// 질문·설명·CTA는 영상에 넣지 않는다.
const tempDir = mkdtempSync(join(tmpdir(), 'foresttour-scenic-reel-'));
const subtitle = join(tempDir, 'location.ass');
writeFileSync(subtitle, `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Location,Noto Sans CJK KR,60,&H00FFFFFF,&H00FFFFFF,&H38000000,&H28000000,0,0,0,0,100,100,0,0,1,1.2,0.8,2,60,60,540,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:02.80,0:00:04.60,Location,,0,0,0,,{\\fad(300,300)}북알프스
`, 'utf8');
filters.push(`[base]subtitles=${subtitle}:fontsdir=${dirname(font)}[video]`);
filters.push(
  `[${scenes.length}:a]atrim=0:${total.toFixed(3)},`
  + `afade=t=in:st=0:d=0.15,afade=t=out:st=${(total - 0.5).toFixed(3)}:d=0.5[audio]`,
);

const ffmpeg = findFfmpeg();
try {
  execFileSync(ffmpeg, [
    '-y',
    ...inputs,
    '-filter_complex', filters.join(';'),
    '-map', '[video]',
    '-map', '[audio]',
    '-c:v', 'libx264',
    '-profile:v', 'high',
    '-preset', 'medium',
    '-crf', '19',
    '-pix_fmt', 'yuv420p',
    '-r', String(fps),
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-t', total.toFixed(3),
    output,
  ], { stdio: 'pipe' });
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log(`✓ ${output}`);
console.log(`  1080×1920 · ${fps}fps · ${total.toFixed(1)}초 · 원본 사진 ${scenes.length}장`);
console.log(`  화면 텍스트: 북알프스 (1회, 1.8초)`);
console.log(`  장면: ${scenes.map((scene) => `${scene.file}:${scene.duration}s`).join(' → ')}`);
console.log(`  음악: ${basename(music)}`);
