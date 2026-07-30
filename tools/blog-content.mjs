#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_PUBLISHED_PATH = 'blog/published/stories.json';
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_WITH_TIMEZONE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;
const FORBIDDEN_CHANNEL_COPY_RE = /Instagram|인스타그램/i;
const IMAGE_RIGHTS_RE = /CC BY|CC0|Public Domain|퍼블릭 도메인/i;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function stringArray(value, minimum = 1) {
  return Array.isArray(value)
    && value.length >= minimum
    && value.every(nonEmptyString);
}

function validateDate(value, label, errors) {
  if (!nonEmptyString(value) || !ISO_WITH_TIMEZONE_RE.test(value) || Number.isNaN(Date.parse(value))) {
    errors.push(`${label}: 시간대가 포함된 ISO 8601 날짜여야 합니다.`);
  }
}

function validateImage(image, label, photoStatus, slug, errors) {
  if (!isPlainObject(image)) {
    errors.push(`${label}: 이미지 객체가 없습니다.`);
    return;
  }

  for (const key of ['src', 'alt', 'credit', 'notice']) {
    if (!nonEmptyString(image[key])) errors.push(`${label}.${key}: 필수 문자열입니다.`);
  }

  if (nonEmptyString(image.src)) {
    const isLocal = image.src.startsWith(`/stories/${slug}/`);
    const isPexels = image.src.startsWith('https://images.pexels.com/');
    if (!isLocal && !isPexels) {
      errors.push(`${label}.src: /stories/${slug}/ 또는 images.pexels.com만 허용합니다.`);
    }
    if (isPexels && photoStatus !== 'placeholder') {
      errors.push(`${label}.src: Pexels 이미지는 placeholder 글에만 허용합니다.`);
    }
  }

  if (nonEmptyString(image.pageUrl) && !image.pageUrl.startsWith('https://')) {
    errors.push(`${label}.pageUrl: https URL이어야 합니다.`);
  }

  if (photoStatus === 'verified') {
    if (!String(image.notice ?? '').includes('현지 촬영')) {
      errors.push(`${label}.notice: verified 사진은 '현지 촬영'을 명시해야 합니다.`);
    }
    if (!IMAGE_RIGHTS_RE.test(String(image.credit ?? ''))) {
      errors.push(`${label}.credit: verified 사진은 재사용 라이선스를 명시해야 합니다.`);
    }
    if (!String(image.pageUrl ?? '').startsWith('https://')) {
      errors.push(`${label}.pageUrl: verified 사진은 원문 URL이 필수입니다.`);
    }
  } else if (!/실제 .*사진 아님/.test(String(image.notice ?? ''))) {
    errors.push(`${label}.notice: placeholder 이미지는 실제 현지 사진이 아님을 밝혀야 합니다.`);
  }
}

function validateStory(story, index, allSlugs, errors) {
  const label = `stories[${index}]`;
  if (!isPlainObject(story)) {
    errors.push(`${label}: 객체여야 합니다.`);
    return;
  }

  const requiredStrings = [
    'slug',
    'series',
    'episode',
    'discoveryHook',
    'title',
    'description',
    'canonical',
    'openingTitle',
    'jumpLabel',
    'jumpTarget',
  ];
  for (const key of requiredStrings) {
    if (!nonEmptyString(story[key])) errors.push(`${label}.${key}: 필수 문자열입니다.`);
  }

  if (!SLUG_RE.test(String(story.slug ?? ''))) {
    errors.push(`${label}.slug: 영문 소문자·숫자·하이픈만 허용합니다.`);
  }
  if (story.canonical !== `https://foresttour.kr/stories/${story.slug}`) {
    errors.push(`${label}.canonical: 공개 slug와 정확히 일치해야 합니다.`);
  }
  if (story.publicationStatus !== 'published') {
    errors.push(`${label}.publicationStatus: published 원고만 공개 파일에 둘 수 있습니다.`);
  }
  if (!['verified', 'placeholder'].includes(story.photoStatus)) {
    errors.push(`${label}.photoStatus: verified 또는 placeholder여야 합니다.`);
  }
  if (!Number.isInteger(story.featuredOrder) || story.featuredOrder < 1) {
    errors.push(`${label}.featuredOrder: 1 이상의 정수여야 합니다.`);
  }
  if (!stringArray(story.keywords, 3)) {
    errors.push(`${label}.keywords: 검색어를 3개 이상 적어야 합니다.`);
  }

  validateDate(story.publishedAt, `${label}.publishedAt`, errors);
  validateDate(story.updatedAt, `${label}.updatedAt`, errors);
  if (
    nonEmptyString(story.publishedAt)
    && nonEmptyString(story.updatedAt)
    && Date.parse(story.updatedAt) < Date.parse(story.publishedAt)
  ) {
    errors.push(`${label}.updatedAt: publishedAt보다 이를 수 없습니다.`);
  }

  validateImage(story.hero, `${label}.hero`, story.photoStatus, story.slug, errors);

  if (!stringArray(story.intro, 2)) errors.push(`${label}.intro: 문단이 2개 이상 필요합니다.`);
  if (!Array.isArray(story.sections) || story.sections.length < 3) {
    errors.push(`${label}.sections: 본문 구간이 3개 이상 필요합니다.`);
  } else {
    const sectionIds = new Set();
    story.sections.forEach((section, sectionIndex) => {
      const sectionLabel = `${label}.sections[${sectionIndex}]`;
      if (!isPlainObject(section)) {
        errors.push(`${sectionLabel}: 객체여야 합니다.`);
        return;
      }
      for (const key of ['id', 'eyebrow', 'title']) {
        if (!nonEmptyString(section[key])) errors.push(`${sectionLabel}.${key}: 필수 문자열입니다.`);
      }
      if (!stringArray(section.paragraphs, 1)) {
        errors.push(`${sectionLabel}.paragraphs: 본문 문단이 필요합니다.`);
      }
      if (sectionIds.has(section.id)) errors.push(`${sectionLabel}.id: 같은 글 안에서 중복입니다.`);
      sectionIds.add(section.id);
      if (section.image) {
        validateImage(
          section.image,
          `${sectionLabel}.image`,
          story.photoStatus,
          story.slug,
          errors,
        );
      }
    });
    if (!sectionIds.has(story.jumpTarget)) {
      errors.push(`${label}.jumpTarget: 실제 section id를 가리켜야 합니다.`);
    }
  }

  if (!stringArray(story.walkingNotes, 3)) {
    errors.push(`${label}.walkingNotes: 독자 적합성 메모가 3개 이상 필요합니다.`);
  }
  if (!stringArray(story.scheduleNotes, 1)) {
    errors.push(`${label}.scheduleNotes: 일정 상태 설명이 필요합니다.`);
  }
  if (!stringArray(story.relatedSlugs, 1)) {
    errors.push(`${label}.relatedSlugs: 관련 글이 1개 이상 필요합니다.`);
  } else {
    for (const relatedSlug of story.relatedSlugs) {
      if (relatedSlug === story.slug) errors.push(`${label}.relatedSlugs: 자기 자신을 연결할 수 없습니다.`);
      if (!allSlugs.has(relatedSlug)) errors.push(`${label}.relatedSlugs: 없는 slug '${relatedSlug}'입니다.`);
    }
  }

  if (!Array.isArray(story.sources) || story.sources.length < 3) {
    errors.push(`${label}.sources: 공식 자료가 3개 이상 필요합니다.`);
  } else {
    const sourceUrls = new Set();
    story.sources.forEach((source, sourceIndex) => {
      const sourceLabel = `${label}.sources[${sourceIndex}]`;
      if (!isPlainObject(source) || !nonEmptyString(source.label) || !nonEmptyString(source.url)) {
        errors.push(`${sourceLabel}: label과 url이 필요합니다.`);
        return;
      }
      if (!source.url.startsWith('https://')) errors.push(`${sourceLabel}.url: https URL이어야 합니다.`);
      if (sourceUrls.has(source.url)) errors.push(`${sourceLabel}.url: 같은 글 안에서 중복입니다.`);
      sourceUrls.add(source.url);
    });
  }

  if (story.connectedTour === undefined) {
    if (!story.scheduleNotes?.some((note) => /공개 (예약|모집) 일정/.test(note))) {
      errors.push(`${label}.scheduleNotes: 연결 상품이 없으면 공개 일정 없음 상태를 명시해야 합니다.`);
    }
  } else {
    const tour = story.connectedTour;
    if (
      !isPlainObject(tour)
      || !/^[A-Za-z0-9_-]{1,32}$/.test(String(tour.fldid ?? ''))
      || !stringArray(tour.requiredTitleTerms, 1)
      || !nonEmptyString(tour.ctaLabel)
    ) {
      errors.push(`${label}.connectedTour: fldid·requiredTitleTerms·ctaLabel 계약이 필요합니다.`);
    }
  }

  const searchableCopy = JSON.stringify(story);
  if (FORBIDDEN_CHANNEL_COPY_RE.test(searchableCopy)) {
    errors.push(`${label}: 자사 블로그 원고에 Instagram 의존 문구를 둘 수 없습니다.`);
  }
}

export function validateBlogPayload(payload) {
  const errors = [];
  if (!isPlainObject(payload)) return ['루트는 객체여야 합니다.'];
  if (payload.schemaVersion !== 1) errors.push('schemaVersion은 1이어야 합니다.');
  if (payload.site !== 'https://foresttour.kr') errors.push('site는 https://foresttour.kr이어야 합니다.');
  if (!Array.isArray(payload.stories) || payload.stories.length === 0) {
    errors.push('stories는 비어 있지 않은 배열이어야 합니다.');
    return errors;
  }
  if (payload.stories.length > 200) errors.push('stories는 한 파일에 최대 200편까지 허용합니다.');

  const slugs = payload.stories.map((story) => story?.slug);
  const uniqueSlugs = new Set(slugs);
  if (uniqueSlugs.size !== slugs.length) errors.push('story slug가 중복되었습니다.');

  const orders = payload.stories.map((story) => story?.featuredOrder);
  if (new Set(orders).size !== orders.length) errors.push('featuredOrder가 중복되었습니다.');

  payload.stories.forEach((story, index) => validateStory(story, index, uniqueSlugs, errors));
  return errors;
}

export async function readAndValidateBlogFile(filePath = DEFAULT_PUBLISHED_PATH) {
  const absolutePath = resolve(filePath);
  const payload = JSON.parse(await readFile(absolutePath, 'utf8'));
  const errors = validateBlogPayload(payload);
  if (errors.length) {
    throw new Error(`블로그 공개 게이트 실패:\n- ${errors.join('\n- ')}`);
  }
  return payload;
}

async function publishDraft(args) {
  const draftPath = args.get('--draft');
  const outputPath = args.get('--output') ?? DEFAULT_PUBLISHED_PATH;
  if (!draftPath) throw new Error('publish에는 --draft=<파일>이 필요합니다.');
  if (!args.has('--publish')) {
    throw new Error('실제 공개 파일을 바꾸려면 --publish를 명시해야 합니다.');
  }

  const [payload, draft] = await Promise.all([
    readAndValidateBlogFile(outputPath),
    readFile(resolve(draftPath), 'utf8').then(JSON.parse),
  ]);
  const nextStory = { ...draft, publicationStatus: 'published' };
  const stories = payload.stories.filter((story) => story.slug !== nextStory.slug);
  const nextPayload = { ...payload, stories: [...stories, nextStory] };
  const errors = validateBlogPayload(nextPayload);
  if (errors.length) {
    throw new Error(`초안 공개 게이트 실패:\n- ${errors.join('\n- ')}`);
  }

  await writeFile(resolve(outputPath), `${JSON.stringify(nextPayload, null, 2)}\n`);
  return nextStory.slug;
}

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

async function main() {
  const [command = 'validate', ...tokens] = process.argv.slice(2);
  const args = parseArgs(tokens);
  if (command === 'validate') {
    const filePath = args.get('--file') ?? tokens.find((token) => !token.startsWith('--'))
      ?? DEFAULT_PUBLISHED_PATH;
    const payload = await readAndValidateBlogFile(filePath);
    console.log(`✓ 블로그 공개 게이트 통과 · ${payload.stories.length}편 · ${resolve(filePath)}`);
    return;
  }
  if (command === 'publish') {
    const slug = await publishDraft(args);
    console.log(`✓ 공개 원고 반영 · ${slug}`);
    console.log('  자동 git add/commit/push는 하지 않았습니다.');
    return;
  }
  throw new Error(`알 수 없는 명령: ${command}`);
}

const isCli = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isCli) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
