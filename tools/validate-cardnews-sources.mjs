// 카드에 실제로 쓰인 사진의 출처·라이선스·바이트 정합성을 검증한다.
//
// 사용:
//   node tools/validate-cardnews-sources.mjs cardnews/series/northern-alps

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const seriesArg = process.argv[2];
if (!seriesArg) {
  throw new Error('사용법: validate-cardnews-sources.mjs <시리즈 폴더>');
}

const seriesDir = resolve(seriesArg);
const repo = resolve(seriesDir, '..', '..', '..');
const { default: series } = await import(pathToFileURL(join(seriesDir, 'cards.mjs')));
const photos = series.cards.map((card) => card.photo).filter(Boolean);

if (series.meta?.photoStatus !== 'verified') {
  throw new Error(`photoStatus가 verified가 아닙니다: ${series.meta?.photoStatus || '없음'}`);
}
if (photos.length < 2 || photos.length > 10 || new Set(photos).size !== photos.length) {
  throw new Error(`게시 사진은 중복 없이 2~10장이어야 합니다: ${photos.length}장`);
}

const allowedLicense = /^(Public domain|CC0|CC BY(?: \d(?:\.\d)?)?)$/i;
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const isJpeg = (bytes) =>
  bytes.length >= 4
  && bytes[0] === 0xff
  && bytes[1] === 0xd8
  && bytes[bytes.length - 2] === 0xff
  && bytes[bytes.length - 1] === 0xd9;

for (const photo of photos) {
  const local = resolve(repo, photo);
  const sourceFile = `${local}.source.json`;
  if (!existsSync(local) || !existsSync(sourceFile)) {
    throw new Error(`사진 또는 출처 JSON이 없습니다: ${photo}`);
  }

  const bytes = readFileSync(local);
  const source = JSON.parse(readFileSync(sourceFile, 'utf8'));
  if (!isJpeg(bytes) || bytes.length < 10_000) {
    throw new Error(`유효한 JPEG가 아닙니다: ${photo}`);
  }
  if (!allowedLicense.test(source.license || '')) {
    throw new Error(`허용하지 않는 라이선스입니다: ${photo} · ${source.license || '없음'}`);
  }
  if (!source.author || !source.licenseUrl || !source.descriptionPage || !source.originalUrl) {
    throw new Error(`필수 출처 필드가 없습니다: ${photo}`);
  }
  if (!source.revisionId || !source.revisionUrl || !source.revisionTimestamp) {
    throw new Error(`고정 Commons 리비전이 없습니다: ${photo}`);
  }
  if (!source.description && !(source.categories || []).length) {
    throw new Error(`장소 근거가 없습니다: ${photo}`);
  }
  if (source.width < 1080 || source.height < 1067) {
    throw new Error(`게시 크기가 부족합니다: ${photo} · ${source.width}×${source.height}`);
  }
  if (digest(bytes) !== source.sha256) {
    throw new Error(`SHA-256이 출처 기록과 다릅니다: ${photo}`);
  }
}

const cardText = JSON.stringify(series.cards);
const forbidden = [
  /₩|원부터|만원/,
  /예약\s*(?:하기|하세요|마감|가능)/,
  /선착순|잔여\s*\d|모객|인솔자|대장님/,
  /\d+\s*박\s*\d+\s*일/,
];
for (const pattern of forbidden) {
  if (pattern.test(cardText)) throw new Error(`카드 상거래 금칙어가 발견됐습니다: ${pattern}`);
}

console.log(
  `✓ ${series.meta.series} ${series.meta.number} ${series.meta.episode}`
  + ` · 사진 ${photos.length}장 · CC BY/CC0/PD · 고정 리비전 · SHA-256 검증 완료`,
);
