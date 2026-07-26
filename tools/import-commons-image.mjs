// Wikimedia Commons의 원본 사진과 재사용 근거를 함께 저장한다.
//
// 사용:
//   node tools/import-commons-image.mjs \
//     --title="File:Sado Shukunegi.jpg" \
//     --output=cardnews/photos/sado/05-shukunegi.jpg \
//     --width=2400
//
// 결과:
//   <output>              원본 이미지
//   <output>.source.json  Commons 원문·저작자·라이선스·다운로드 시각·SHA-256

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name) =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

const title = opt('title');
const outputArg = opt('output');
const requestedWidth = Number(opt('width') || 2400);

if (!title || !outputArg) {
  console.error('사용법: node tools/import-commons-image.mjs --title="File:..." --output=<jpg 경로> [--width=2400]');
  process.exit(1);
}
if (!Number.isInteger(requestedWidth) || requestedWidth < 1080 || requestedWidth > 4096) {
  throw new Error('--width는 1080~4096 정수여야 합니다.');
}

const api = new URL('https://commons.wikimedia.org/w/api.php');
api.searchParams.set('action', 'query');
api.searchParams.set('format', 'json');
api.searchParams.set('formatversion', '2');
api.searchParams.set('prop', 'imageinfo|revisions|categories');
api.searchParams.set('iiprop', 'url|size|mime|sha1|extmetadata');
api.searchParams.set('iiurlwidth', String(requestedWidth));
api.searchParams.set('rvprop', 'ids|timestamp');
api.searchParams.set('rvlimit', '1');
api.searchParams.set('cllimit', 'max');
api.searchParams.set('titles', title);

const response = await fetch(api, {
  headers: { 'User-Agent': 'ForestTourMarketing/1.0 (content provenance importer)' },
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok) throw new Error(`Commons API HTTP ${response.status}`);

const payload = await response.json();
const page = payload.query?.pages?.[0];
const info = page?.imageinfo?.[0];
if (!page || page.missing || !info?.url) throw new Error(`Commons 파일을 찾지 못했습니다: ${title}`);

const metadata = info.extmetadata || {};
const license = metadata.LicenseShortName?.value || '';
const allowed = /^(Public domain|CC0|CC BY(?: \d(?:\.\d)?)?)$/i.test(license);
if (!allowed) {
  throw new Error(`자동 허용 목록에 없는 라이선스입니다: ${license || '미표기'}`);
}
if (!/^image\/(jpeg|png|webp)$/i.test(info.mime || '')) {
  throw new Error(`지원하지 않는 이미지 형식입니다: ${info.mime || '미표기'}`);
}

const downloadUrl = info.thumburl || info.url;
let imageResponse;
for (let attempt = 0; attempt < 5; attempt += 1) {
  imageResponse = await fetch(downloadUrl, {
    headers: { 'User-Agent': 'ForestTourMarketing/1.0 (content provenance importer)' },
    signal: AbortSignal.timeout(45_000),
  });
  if (imageResponse.ok) break;
  if (imageResponse.status !== 429 && imageResponse.status < 500) break;
  const retryAfter = Number(imageResponse.headers.get('retry-after')) || (attempt + 1) * 3;
  await new Promise((resolveDelay) => setTimeout(resolveDelay, retryAfter * 1000));
}
if (!imageResponse?.ok) throw new Error(`원본 이미지 HTTP ${imageResponse?.status || '응답 없음'}`);
const bytes = Buffer.from(await imageResponse.arrayBuffer());
const sha256 = createHash('sha256').update(bytes).digest('hex');

const stripHtml = (value = '') =>
  String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const output = resolve(outputArg);
const revision = page.revisions?.[0];
const revisionUrl = revision?.revid
  ? `https://commons.wikimedia.org/w/index.php?title=${encodeURIComponent(page.title)}&oldid=${revision.revid}`
  : null;
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, bytes);
writeFileSync(`${output}.source.json`, `${JSON.stringify({
  commonsTitle: page.title,
  descriptionPage: info.descriptionurl,
  revisionId: revision?.revid || null,
  revisionTimestamp: revision?.timestamp || null,
  revisionUrl,
  originalUrl: info.url,
  downloadUrl,
  description: stripHtml(
    metadata.ImageDescription?.value
    || metadata.ObjectName?.value
    || metadata.Categories?.value,
  ),
  categories: (page.categories || []).map((category) =>
    String(category.title || '').replace(/^Category:/, '')
  ),
  gps: {
    latitude: metadata.GPSLatitude?.value || null,
    longitude: metadata.GPSLongitude?.value || null,
  },
  author: stripHtml(metadata.Artist?.value),
  credit: stripHtml(metadata.Credit?.value),
  license,
  licenseUrl: metadata.LicenseUrl?.value || null,
  usageTerms: stripHtml(metadata.UsageTerms?.value),
  dateCreated: stripHtml(metadata.DateTimeOriginal?.value || metadata.DateTime?.value),
  downloadedAt: new Date().toISOString(),
  mime: info.mime,
  originalWidth: info.width,
  originalHeight: info.height,
  width: info.thumbwidth || info.width,
  height: info.thumbheight || info.height,
  commonsSha1: info.sha1,
  sha256,
  importModification: info.thumburl
    ? `Wikimedia Commons가 원본을 ${info.thumbwidth}×${info.thumbheight} 썸네일로 축소`
    : '원본 바이트 그대로 저장',
}, null, 2)}\n`, 'utf8');

console.log(`✓ Commons 원본 저장: ${output}`);
console.log(`✓ 출처 메타데이터 저장: ${output}.source.json`);
console.log(`· ${license} · ${info.thumbwidth || info.width}×${info.thumbheight || info.height} · SHA-256 ${sha256.slice(0, 12)}…`);
