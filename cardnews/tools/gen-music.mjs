// 플레이스홀더 배경음악 생성기 — 코드로 직접 합성하므로 저작권이 원천적으로 깨끗하다.
// (실게시용은 Meta Sound Collection 등 라이선스 확보 트랙으로 교체 권장 — 이 트랙은
//  "음악이 실제로 입혀져 나가는지"를 검증하고, 교체 전까지 쓸 수 있는 안전한 기본값.)
//
// 원리: 잔잔한 필드노트 톤의 앰비언트 — Am7→Fmaj7→Cmaj7→G 진행의 패드(느린 어택 사인파 화음)
// 위에 펜타토닉 플럭(지수 감쇠 사인 + 2배음)을 얹고, 멜로디에 300ms 딜레이 에코를 준다.
// 결과는 16bit 스테레오 WAV — 영상 빌더가 AAC로 인코딩해 굽는다.
//
// 사용: node cardnews/tools/gen-music.mjs [출력.wav] [길이초=36]

import { writeFileSync } from 'node:fs';

const OUT = process.argv[2] || 'cardnews/assets/music/placeholder-ambient.wav';
const DUR = Number(process.argv[3]) || 36;
const SR = 44100;

const n = Math.floor(SR * DUR);
const L = new Float64Array(n), R = new Float64Array(n);

const f = midi => 440 * 2 ** ((midi - 69) / 12); // MIDI 노트 → 주파수
// 코드 진행 (MIDI): Am7, Fmaj7, Cmaj7, G — 2마디(72bpm, 4/4 = 6.67s)씩 순환
const CHORDS = [
  [45, 48, 52, 55], // A2 C3 E3 G3
  [41, 45, 48, 52], // F2 A2 C3 E3
  [48, 52, 55, 59], // C3 E3 G3 B3
  [43, 47, 50, 55], // G2 B2 D3 G3
];
const CHORD_LEN = 60 / 72 * 8; // 2마디 = 6.667s

// ── 패드: 각 코드 톤을 느린 어택(1.2s)·릴리즈(1.5s) 사인파로, 살짝 디튠해 온기 추가
for (let ci = 0; ci * CHORD_LEN < DUR; ci++) {
  const chord = CHORDS[ci % CHORDS.length];
  const t0 = ci * CHORD_LEN, t1 = Math.min(t0 + CHORD_LEN, DUR);
  for (const note of chord) {
    const freq = f(note);
    for (let i = Math.floor(t0 * SR); i < Math.floor(t1 * SR); i++) {
      const t = i / SR - t0;
      const env = Math.min(t / 1.2, 1) * Math.min((t1 - t0 - t) / 1.5, 1);
      if (env <= 0) continue;
      const s = (Math.sin(2 * Math.PI * freq * (i / SR)) + Math.sin(2 * Math.PI * freq * 1.0012 * (i / SR))) * 0.5;
      const v = s * env * 0.045;
      L[i] += v * 1.1; R[i] += v * 0.9; // 패드는 살짝 왼쪽
    }
  }
}

// ── 플럭 멜로디: A 마이너 펜타토닉(A3 C4 D4 E4 G4 A4)에서 결정적(비난수) 패턴으로
const PENTA = [57, 60, 62, 64, 67, 69];
const PATTERN = [0, 2, 4, 3, 5, 4, 2, 1, 3, 2, 0, 4]; // 12스텝 순환 — 잔잔한 상행·하행
const STEP = 60 / 72 * 2; // 2박마다 한 음 (1.667s)
for (let k = 0; k * STEP < DUR - 2; k++) {
  const note = PENTA[PATTERN[k % PATTERN.length]];
  const freq = f(note);
  const t0 = k * STEP + 0.4;
  for (let i = Math.floor(t0 * SR); i < Math.min(Math.floor((t0 + 1.4) * SR), n); i++) {
    const t = i / SR - t0;
    const env = Math.exp(-t * 3.2) * Math.min(t / 0.008, 1);
    const s = Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(2 * Math.PI * freq * 2 * t);
    const v = s * env * 0.075;
    L[i] += v * 0.85; R[i] += v * 1.1; // 멜로디는 살짝 오른쪽
    // 300ms 딜레이 에코 1회
    const j = i + Math.floor(0.3 * SR);
    if (j < n) { L[j] += v * 0.3 * 1.1; R[j] += v * 0.3 * 0.85; }
  }
}

// ── 마스터: 페이드 인/아웃 + 소프트 클립 + 16bit 변환
const fadeIn = SR * 1, fadeOut = SR * 2.5;
for (let i = 0; i < n; i++) {
  let g = 1;
  if (i < fadeIn) g = i / fadeIn;
  if (i > n - fadeOut) g = (n - i) / fadeOut;
  L[i] = Math.tanh(L[i]) * g; R[i] = Math.tanh(R[i]) * g;
}
const pcm = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767 * 0.9))), i * 4);
  pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767 * 0.9))), i * 4 + 2);
}
// WAV 헤더 (PCM 16bit 스테레오)
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVEfmt ', 8);
hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 4, 28); hdr.writeUInt16LE(4, 32);
hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.concat([hdr, pcm]));
console.log(`✓ ${OUT} (${DUR}s, 합성 앰비언트 — 저작권 청정)`);
