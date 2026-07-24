// AI 생성 이미지 파이프라인 모듈 (나노바나나 / Imagen 3 / Gemini Visual Generator).
// 스톡 사진 대신 카드뉴스 카드의 주제, 분위기, 타이틀에 기반하여 4:5 고화질 맞춤 배경 이미지를 생성합니다.

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function getApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    const m = readFileSync(join(REPO, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  } catch {}
  return '';
}

export async function generateCardPhoto(card, repoRoot, seriesName) {
  const targetDir = join(repoRoot, 'cardnews', 'photos', seriesName);
  mkdirSync(targetDir, { recursive: true });
  const targetFile = join(targetDir, `${card.id}.jpg`);

  const titleText = (card.title || card.eye || '').replace(/<br>/g, ' ');
  const prompt = `A breathtaking, cinematic 4:5 vertical portrait photograph of ${seriesName} Japan, ${titleText}. Traditional Japanese atmosphere, soft natural lighting, peaceful and moody travel photography, no text, no words, no watermark, 8k resolution.`;

  console.log(`· [AI 나노바나나 이미지 생성] ${card.id} 카드 전용 배경 이미지 생성 중…`);
  console.log(`  프롬프트: "${prompt.slice(0, 80)}…"`);

  const apiKey = getApiKey();
  if (apiKey) {
    try {
      // Gemini / Imagen API를 통한 생성 시도
      const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
      const body = {
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: "4:5", outputMimeType: "image/jpeg" }
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (json.predictions && json.predictions[0]?.bytesBase64Encoded) {
        const buf = Buffer.from(json.predictions[0].bytesBase64Encoded, 'base64');
        writeFileSync(targetFile, buf);
        console.log(`  ✓ AI 나노바나나 이미지 생성 완료: cardnews/photos/${seriesName}/${card.id}.jpg`);
        return targetFile;
      }
    } catch (err) {
      console.warn(`  ⚠ AI Imagen API 생성 폴백: ${err.message}`);
    }
  }

  return null;
}
