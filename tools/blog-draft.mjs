#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function parseArgs(tokens) {
  const args = new Map();
  for (const token of tokens) {
    if (!token.startsWith('--')) continue;
    const separator = token.indexOf('=');
    if (separator === -1) args.set(token, true);
    else args.set(token.slice(0, separator), token.slice(separator + 1));
  }
  return args;
}

function plainText(value = '') {
  return String(value)
    .replaceAll(/<br\s*\/?>/gi, '\n')
    .replaceAll(/<[^>]+>/g, '')
    .replaceAll('&nbsp;', ' ')
    .trim();
}

function safeSectionId(value, fallback) {
  const normalized = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

function uniqueOfficialSources(markdown) {
  const matches = markdown.matchAll(/https:\/\/[^\s)|]+/g);
  const urls = [...new Set([...matches].map((match) => match[0].replace(/[.,]+$/, '')))];
  return urls.map((url, index) => ({
    label: `공식 사실 근거 ${String(index + 1).padStart(2, '0')} · 검수 시 구체적인 자료명을 적으세요`,
    url,
  }));
}

export function draftFromSeries(series, factMarkdown, slug) {
  const contentCards = series.cards.filter((card) => !['paper'].includes(card.kind));
  const cover = series.cards.find((card) => card.kind === 'cover') ?? contentCards[0];
  const sections = contentCards
    .filter((card) => card !== cover)
    .slice(0, 6)
    .map((card, index) => ({
      id: safeSectionId(card.id, `section-${index + 1}`),
      eyebrow: plainText(card.eye || `FIELD NOTE ${index + 1}`),
      title: plainText(card.title),
      paragraphs: [plainText(card.body || card.items?.join(' · ') || '')].filter(Boolean),
      fact: '',
    }));

  const seriesLabel = `${series.meta.series} · ${series.meta.number}`;
  const now = new Date().toISOString();
  return {
    slug,
    series: seriesLabel,
    episode: plainText(series.meta.episode),
    discoveryHook: plainText(cover?.title),
    title: plainText(cover?.sub || cover?.title),
    description: '',
    canonical: `https://foresttour.kr/stories/${slug}`,
    hero: {
      src: '',
      alt: '',
      credit: '',
      notice: '',
      pageUrl: '',
    },
    openingTitle: '',
    jumpLabel: '',
    jumpTarget: sections[0]?.id ?? '',
    intro: ['', ''],
    sections,
    walkingNotes: ['', '', ''],
    scheduleNotes: ['현재 이 이야기와 정확히 연결된 공개 모집 일정은 없습니다.'],
    relatedSlugs: [],
    sources: uniqueOfficialSources(factMarkdown),
    photoStatus: series.meta.photoStatus ?? 'placeholder',
    featuredOrder: 999,
    keywords: [],
    publicationStatus: 'draft',
    publishedAt: now,
    updatedAt: now,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const seriesName = args.get('--series');
  const slug = args.get('--slug') ?? seriesName;
  if (!seriesName || !slug) {
    throw new Error('사용법: node tools/blog-draft.mjs --series=<series-folder> [--slug=<slug>]');
  }

  const seriesDir = resolve('cardnews/series', seriesName);
  const cardsPath = resolve(seriesDir, 'cards.mjs');
  const factsPath = resolve(seriesDir, '사실-검증.md');
  const [seriesModule, factMarkdown] = await Promise.all([
    import(pathToFileURL(cardsPath).href),
    readFile(factsPath, 'utf8'),
  ]);
  const draft = draftFromSeries(seriesModule.default, factMarkdown, slug);
  const outputDir = resolve('blog/drafts');
  const outputPath = resolve(outputDir, `${slug}.json`);
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(draft, null, 2)}\n`, { flag: 'wx' });

  console.log(`✓ 블로그 초안 뼈대 생성 · ${outputPath}`);
  console.log('  카드 문구와 사실 검증 URL만 옮겼습니다. 본문·사진 권리·공식 출처명·관련 글을 사람이 검수해야 합니다.');
  console.log('  검수 뒤에만 blog:publish -- --draft=<파일> --publish를 사용하세요.');
}

const isCli = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isCli) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
