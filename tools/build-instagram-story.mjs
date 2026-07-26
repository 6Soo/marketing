import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function option(args, name) {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function storyManifest(series, seriesPath, outputFile) {
  const slug = basename(seriesPath);
  const source = series.meta?.landing?.sources?.story;
  const storyPath = series.meta?.landing?.storyPath;
  if (series.meta?.photoStatus !== 'verified') {
    throw new Error(`Story 게시 차단: ${slug} photoStatus가 verified가 아닙니다.`);
  }
  if (!source || !/^[a-z0-9-]{1,24}$/.test(source)) {
    throw new Error(`Story 게시 차단: ${slug}의 landing.sources.story가 유효하지 않습니다.`);
  }
  if (!storyPath?.startsWith('/stories/')) {
    throw new Error(`Story 게시 차단: ${slug}의 landing.storyPath가 유효하지 않습니다.`);
  }
  return {
    schemaVersion: 1,
    series: slug,
    destination: series.meta.episode,
    format: 'instagram-story',
    dimensions: { width: 1080, height: 1920 },
    asset: basename(outputFile),
    linkSticker: {
      label: series.meta.story.stickerLabel,
      url: `https://foresttour.kr${storyPath}?from=${source}`,
    },
    publishGate: '24h-checkpoint-recorded',
    measurement: {
      expectedEvent: `story_${slug}_visit`,
      environment: 'instagram-app',
      source,
    },
  };
}

export async function buildStory({ seriesPath, outputDir }) {
  const absoluteSeriesPath = resolve(seriesPath);
  const { default: series } = await import(
    `${pathToFileURL(join(absoluteSeriesPath, 'cards.mjs')).href}?v=${Date.now()}`
  );
  const slug = basename(absoluteSeriesPath);
  const cover = series.cards.find((card) => card.kind === 'cover' && card.photo);
  if (!cover) throw new Error(`Story 게시 차단: ${slug}에 검증 가능한 사진 표지가 없습니다.`);
  for (const field of ['eyebrow', 'subtitle', 'title', 'detail', 'stickerLabel']) {
    if (!series.meta?.story?.[field]) {
      throw new Error(`Story 게시 차단: ${slug}의 meta.story.${field}가 없습니다.`);
    }
  }

  const sourceImage = resolve(REPO, cover.photo);
  const targetDir = resolve(outputDir || join(REPO, 'cardnews', 'out', slug, 'story'));
  mkdirSync(targetDir, { recursive: true });
  const outputFile = join(targetDir, '01-discovery-link.jpg');

  const background = await sharp(sourceImage)
    .resize(1080, 1920, { fit: 'cover' })
    .blur(24)
    .modulate({ brightness: 0.48, saturation: 0.78 })
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
    .toBuffer();
  const foreground = await sharp(sourceImage)
    .resize(920, 1150, { fit: 'cover' })
    .jpeg({ quality: 94, chromaSubsampling: '4:4:4' })
    .toBuffer();

  const overlay = Buffer.from(`
    <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#000" stop-opacity=".12"/>
          <stop offset=".63" stop-color="#000" stop-opacity=".08"/>
          <stop offset="1" stop-color="#000" stop-opacity=".72"/>
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#shade)"/>
      <text x="80" y="126" fill="#fff" font-size="30" font-weight="700"
        font-family="Malgun Gothic, Noto Sans KR, sans-serif" letter-spacing="4">${escapeXml(series.meta.story.eyebrow)}</text>
      <text x="80" y="176" fill="#fff" fill-opacity=".82" font-size="25"
        font-family="Malgun Gothic, Noto Sans KR, sans-serif">${escapeXml(series.meta.story.subtitle)}</text>
      <text x="80" y="1560" fill="#fff" font-size="58" font-weight="700"
        font-family="Malgun Gothic, Noto Sans KR, sans-serif">${escapeXml(series.meta.story.title)}</text>
      <text x="80" y="1630" fill="#fff" fill-opacity=".9" font-size="31"
        font-family="Malgun Gothic, Noto Sans KR, sans-serif">${escapeXml(series.meta.story.detail)}</text>
      <rect x="80" y="1700" width="920" height="118" rx="59"
        fill="#fff" fill-opacity=".12" stroke="#fff" stroke-opacity=".72" stroke-width="2"/>
      <text x="540" y="1774" text-anchor="middle" fill="#fff" font-size="31" font-weight="700"
        font-family="Malgun Gothic, Noto Sans KR, sans-serif">여기에 링크 스티커 배치</text>
      <text x="80" y="1860" fill="#fff" fill-opacity=".72" font-size="22"
        font-family="Malgun Gothic, Noto Sans KR, sans-serif">${escapeXml(series.meta.watermark)}</text>
    </svg>
  `);

  await sharp(background)
    .composite([
      { input: foreground, left: 80, top: 260 },
      { input: overlay, left: 0, top: 0 },
    ])
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toFile(outputFile);

  const manifest = storyManifest(series, absoluteSeriesPath, outputFile);
  const manifestPath = join(targetDir, 'manifest.json');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { outputFile, manifestPath, manifest };
}

async function main() {
  const args = process.argv.slice(2);
  const seriesPath = option(args, 'series');
  const outputDir = option(args, 'output');
  if (!seriesPath) throw new Error('--series=<cardnews/series/...>가 필요합니다.');
  const result = await buildStory({ seriesPath, outputDir });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
