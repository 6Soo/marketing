#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, extname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const DEFAULT_SOURCE_PATH = 'blog/published/stories.json';
const DEFAULT_GUIDES_PATH = 'naver-blog/travel-guides.json';
const DEFAULT_REGISTRY_PATH = 'naver-blog/published.json';
const CHANNEL = 'naver-blog';
const SCHEMA_VERSION = 2;
const RIGHTS_RE = /CC BY|CC0|Public Domain|퍼블릭 도메인/i;
const FORBIDDEN_RE = /Instagram|인스타그램/i;
const PRESSURE_RE = /혼자(?:서는)?\s*(?:절대|불가능|못)|우리와\s*가야|패키지가\s*답/i;
const NAVER_BLOG_ORIGIN = 'https://blog.naver.com';
const NAVER_PUBLIC_HOSTS = new Set(['blog.naver.com', 'm.blog.naver.com']);
const REQUIRED_GUIDE_SECTIONS = new Set(['access', 'transport', 'plan', 'checklist', 'complexity']);

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

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeSpace(value = '') {
  return String(value)
    .replaceAll(/<br\s*\/?>/gi, '\n')
    .replaceAll(/<[^>]+>/g, '')
    .replaceAll('&nbsp;', ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])]),
  );
}

function digest(value) {
  return createHash('sha256')
    .update(JSON.stringify(stableValue(value)))
    .digest('hex');
}

function imageUrl(src) {
  if (String(src).startsWith('/')) return `https://foresttour.kr${src}`;
  return String(src);
}

function imageCaption(image) {
  return `사진 출처: ${normalizeSpace(image.credit)} · ${normalizeSpace(image.notice)}`;
}

function normalizeTag(value) {
  return normalizeSpace(value)
    .replace(/^#+/, '')
    .replaceAll(/\s+/g, '');
}

function contentDigestInput(pkg) {
  return {
    title: pkg.title,
    body: pkg.body,
    tags: pkg.tags,
    images: pkg.images,
    source: pkg.source,
    verificationAnchors: pkg.verificationAnchors,
    productConnection: pkg.productConnection,
  };
}

function collectStoryImages(story) {
  return [
    { sectionId: 'hero', section: '표지', image: story.hero },
    ...story.sections
      .filter((section) => section.image)
      .map((section) => ({
        sectionId: section.id,
        section: normalizeSpace(section.title),
        image: section.image,
      })),
  ].map(({ sectionId, section, image }, index) => ({
    order: index + 1,
    sectionId,
    section,
    url: imageUrl(image.src),
    alt: normalizeSpace(image.alt),
    credit: normalizeSpace(image.credit),
    notice: normalizeSpace(image.notice),
    sourcePageUrl: image.pageUrl,
    caption: imageCaption(image),
  }));
}

function renderImageBlock(image) {
  if (!image) return [];
  return [
    `[사진 ${image.order}] ${image.alt}`,
    image.caption,
    `사진 원문: ${image.sourcePageUrl}`,
    '',
  ];
}

function renderGuideSection(section) {
  const blocks = [normalizeSpace(section.title), ''];
  section.paragraphs.forEach((paragraph) => blocks.push(normalizeSpace(paragraph), ''));
  section.bullets.forEach((bullet) => blocks.push(`- ${normalizeSpace(bullet)}`));
  blocks.push('', '공식 확인 링크');
  section.sources.forEach((source) => blocks.push(`- ${normalizeSpace(source.label)}: ${source.url}`));
  blocks.push('');
  return blocks;
}

function renderProductConnection(story, guide) {
  const connection = guide.productConnection;
  if (connection.status === 'available') {
    return [
      '숲길여행으로 같은 길을 가는 방법',
      '',
      normalizeSpace(connection.note),
      connection.url,
      '',
    ];
  }
  return [
    '숲길여행 일정 연결',
    '',
    normalizeSpace(connection.note || story.scheduleNotes.join(' ')),
    '',
  ];
}

function renderSummaryBody(story, guide, images) {
  const hero = images[0];
  const imagesBySectionId = new Map(images.map((image) => [image.sectionId, image]));
  const blocks = [
    normalizeSpace(story.description),
    '',
    ...story.intro.flatMap((paragraph) => [normalizeSpace(paragraph), '']),
  ];
  blocks.push(...renderImageBlock(hero));

  story.sections.forEach((section) => {
    const image = imagesBySectionId.get(section.id);
    blocks.push(normalizeSpace(section.title), '');
    blocks.push(...renderImageBlock(image));
    section.paragraphs.forEach((paragraph) => blocks.push(normalizeSpace(paragraph), ''));
    if (nonEmptyString(section.fact)) blocks.push(`확인 메모: ${normalizeSpace(section.fact)}`, '');
  });

  blocks.push('직접 찾아가는 여행 정보', '', `정보 확인일: ${guide.checkedAt}`, '');
  blocks.push(normalizeSpace(guide.freshnessNotice), '');
  guide.sections.forEach((section) => blocks.push(...renderGuideSection(section)));

  blocks.push('이런 분께 어울립니다', '');
  story.walkingNotes.forEach((note) => blocks.push(`- ${normalizeSpace(note)}`));
  blocks.push('', ...renderProductConnection(story, guide));
  blocks.push('전체 기록과 공식 자료', '', story.canonical, '');
  blocks.push('확인한 공식 자료', '');
  story.sources.forEach((source) => {
    blocks.push(`- ${normalizeSpace(source.label)}: ${source.url}`);
  });
  blocks.push('', '※ 사진의 촬영지·저작자·라이선스는 각 이미지 아래에 표시했습니다.');

  return blocks.join('\n').replaceAll(/\n{3,}/g, '\n\n').trim();
}

export function buildNaverPackage(story, guide) {
  if (!isPlainObject(story)) throw new Error('여행지 원고 객체가 필요합니다.');
  if (story.photoStatus !== 'verified') {
    throw new Error(`${story.slug ?? 'unknown'}: verified 현지 사진 원고만 네이버 패키지로 만들 수 있습니다.`);
  }
  const guideErrors = validateTravelGuide(guide, story);
  if (guideErrors.length) throw new Error(`여행 정보 계약 실패:\n- ${guideErrors.join('\n- ')}`);

  const images = collectStoryImages(story);
  const title = guide.title || `${normalizeSpace(story.episode)} 여행 | ${normalizeSpace(story.title)}`;
  const sourceDigest = digest(story);
  const guideDigest = digest(guide);
  const tags = [...new Set([...story.keywords, ...guide.keywords].map(normalizeTag).filter(Boolean))].slice(0, 10);
  const body = renderSummaryBody(story, guide, images);
  const verificationAnchors = [
    title,
    story.canonical,
    ...story.sections.slice(0, 2).map((section) => normalizeSpace(section.title)),
    ...guide.sections.map((section) => normalizeSpace(section.title)),
    ...guide.sections.flatMap((section) => section.sources.map((source) => source.url)),
    ...images.flatMap((image) => [image.caption, image.sourcePageUrl]),
  ];

  const pkg = {
    schemaVersion: SCHEMA_VERSION,
    channel: CHANNEL,
    status: 'prepared',
    editorialMode: 'destination-guide-with-practical-access',
    source: {
      slug: story.slug,
      canonical: story.canonical,
      updatedAt: story.updatedAt,
      digest: sourceDigest,
      guideCheckedAt: guide.checkedAt,
      guideDigest,
    },
    title,
    body,
    tags,
    images,
    productConnection: guide.productConnection,
    verificationAnchors,
    contentDigest: '',
    idempotencyKey: '',
  };
  pkg.contentDigest = digest(contentDigestInput(pkg));
  pkg.idempotencyKey = `${story.slug}:${sourceDigest.slice(0, 12)}:${guideDigest.slice(0, 12)}:${pkg.contentDigest.slice(0, 12)}`;

  const errors = validateNaverPackage(pkg, story, guide);
  if (errors.length) throw new Error(`네이버 블로그 패키지 생성 실패:\n- ${errors.join('\n- ')}`);
  return pkg;
}

export function validateTravelGuide(guide, story) {
  const errors = [];
  if (!isPlainObject(guide)) return ['여행 정보 객체가 필요합니다.'];
  if (guide.slug !== story?.slug) errors.push('guide.slug가 원본 여행지와 다릅니다.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(guide.checkedAt ?? ''))) {
    errors.push('guide.checkedAt은 YYYY-MM-DD 형식이어야 합니다.');
  }
  if (!nonEmptyString(guide.freshnessNotice)) errors.push('guide.freshnessNotice가 필요합니다.');
  if (!Array.isArray(guide.keywords) || guide.keywords.length < 3) errors.push('guide.keywords는 3개 이상이어야 합니다.');
  if (!Array.isArray(guide.sections)) return [...errors, 'guide.sections가 필요합니다.'];
  const ids = new Set();
  guide.sections.forEach((section, index) => {
    const label = `guide.sections[${index}]`;
    if (!isPlainObject(section)) {
      errors.push(`${label}는 객체여야 합니다.`);
      return;
    }
    if (!nonEmptyString(section.id) || !nonEmptyString(section.title)) errors.push(`${label}.id와 title이 필요합니다.`);
    if (ids.has(section.id)) errors.push(`${label}.id가 중복되었습니다.`);
    ids.add(section.id);
    if (!Array.isArray(section.paragraphs) || section.paragraphs.length === 0 || !section.paragraphs.every(nonEmptyString)) {
      errors.push(`${label}.paragraphs가 필요합니다.`);
    }
    if (!Array.isArray(section.bullets) || section.bullets.length < 2 || !section.bullets.every(nonEmptyString)) {
      errors.push(`${label}.bullets는 2개 이상이어야 합니다.`);
    }
    if (!Array.isArray(section.sources) || section.sources.length === 0) {
      errors.push(`${label}.sources가 필요합니다.`);
    } else {
      section.sources.forEach((source, sourceIndex) => {
        if (!nonEmptyString(source?.label) || !String(source?.url ?? '').startsWith('https://')) {
          errors.push(`${label}.sources[${sourceIndex}]에 label과 https URL이 필요합니다.`);
        }
      });
    }
  });
  for (const id of REQUIRED_GUIDE_SECTIONS) {
    if (!ids.has(id)) errors.push(`guide.sections에 '${id}' 구간이 필요합니다.`);
  }
  const connection = guide.productConnection;
  if (!isPlainObject(connection) || !['available', 'unavailable'].includes(connection.status)) {
    errors.push('guide.productConnection.status는 available 또는 unavailable이어야 합니다.');
  } else if (!nonEmptyString(connection.note)) {
    errors.push('guide.productConnection.note가 필요합니다.');
  } else if (connection.status === 'available') {
    if (!story?.connectedTour) errors.push('원본에 connectedTour가 없으면 상품을 연결할 수 없습니다.');
    const expectedUrl = `https://reserve.foresttour.kr/tour/${story?.connectedTour?.fldid}?from=naver-blog`;
    if (connection.url !== expectedUrl) errors.push('상품 URL이 원본 connectedTour와 다릅니다.');
    if (!/^\d{4}-\d{2}-\d{2}T/.test(String(connection.verifiedAt ?? ''))) {
      errors.push('공개 상품 연결에는 verifiedAt이 필요합니다.');
    }
    if (!nonEmptyString(connection.verifiedTitle)) {
      errors.push('공개 상품 연결에는 실제 예약 화면에서 확인한 verifiedTitle이 필요합니다.');
    } else if (story?.connectedTour?.requiredTitleTerms?.some(
      (term) => !connection.verifiedTitle.includes(term),
    )) {
      errors.push('verifiedTitle이 원본 connectedTour의 필수 여행지 조건과 다릅니다.');
    }
  }
  if (PRESSURE_RE.test(JSON.stringify(guide))) errors.push('여행 정보에 혼자 가기 불안을 과장하는 문구가 있습니다.');
  return errors;
}

export function validateNaverPackage(pkg, sourceStory, guide) {
  const errors = [];
  if (!isPlainObject(pkg)) return ['루트는 객체여야 합니다.'];
  if (pkg.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion은 ${SCHEMA_VERSION}이어야 합니다.`);
  if (pkg.channel !== CHANNEL) errors.push(`channel은 ${CHANNEL}여야 합니다.`);
  if (pkg.status !== 'prepared') errors.push('status는 prepared여야 합니다.');
  if (pkg.editorialMode !== 'destination-guide-with-practical-access') {
    errors.push('editorialMode은 destination-guide-with-practical-access여야 합니다.');
  }

  if (!isPlainObject(pkg.source)) {
    errors.push('source 객체가 필요합니다.');
  } else {
    for (const key of ['slug', 'canonical', 'updatedAt', 'digest', 'guideCheckedAt', 'guideDigest']) {
      if (!nonEmptyString(pkg.source[key])) errors.push(`source.${key}가 필요합니다.`);
    }
    if (!String(pkg.source.canonical ?? '').startsWith('https://foresttour.kr/stories/')) {
      errors.push('source.canonical은 foresttour.kr 공개 글이어야 합니다.');
    }
  }

  if (!nonEmptyString(pkg.title) || pkg.title.length > 70) {
    errors.push('title은 1~70자 편집 규칙을 지켜야 합니다.');
  }
  if (!nonEmptyString(pkg.body) || pkg.body.length < 600) {
    errors.push('body는 600자 이상의 네이버용 요약 원고여야 합니다.');
  }
  if (/<[a-z][\s\S]*>/i.test(String(pkg.body ?? ''))) {
    errors.push('body에는 HTML을 넣을 수 없습니다.');
  }
  if (FORBIDDEN_RE.test(`${pkg.title ?? ''}\n${pkg.body ?? ''}`)) {
    errors.push('네이버 원고에 Instagram 의존 문구를 둘 수 없습니다.');
  }
  if (PRESSURE_RE.test(`${pkg.title ?? ''}\n${pkg.body ?? ''}`)) {
    errors.push('네이버 원고에 혼자 가기 불안을 과장하는 문구를 둘 수 없습니다.');
  }
  if (nonEmptyString(pkg.source?.canonical) && !String(pkg.body).includes(pkg.source.canonical)) {
    errors.push('body에 foresttour.kr 전체 기록 링크가 필요합니다.');
  }

  if (!Array.isArray(pkg.tags) || pkg.tags.length < 3 || pkg.tags.length > 10) {
    errors.push('tags는 3~10개여야 합니다.');
  } else {
    const normalized = pkg.tags.map(normalizeTag);
    if (normalized.some((tag) => !tag || tag.length > 30 || tag.includes('#'))) {
      errors.push('각 tag는 # 없이 1~30자여야 합니다.');
    }
    if (new Set(normalized).size !== normalized.length) errors.push('tags가 중복되었습니다.');
  }

  if (!Array.isArray(pkg.images) || pkg.images.length < 2) {
    errors.push('images는 표지와 본문 이미지를 합쳐 2개 이상이어야 합니다.');
  } else {
    pkg.images.forEach((image, index) => {
      const label = `images[${index}]`;
      if (!isPlainObject(image)) {
        errors.push(`${label}는 객체여야 합니다.`);
        return;
      }
      if (image.order !== index + 1) errors.push(`${label}.order가 업로드 순서와 다릅니다.`);
      for (const key of ['section', 'url', 'alt', 'credit', 'notice', 'sourcePageUrl', 'caption']) {
        if (!nonEmptyString(image[key])) errors.push(`${label}.${key}가 필요합니다.`);
      }
      if (!String(image.url ?? '').startsWith('https://')) errors.push(`${label}.url은 https URL이어야 합니다.`);
      if (!String(image.sourcePageUrl ?? '').startsWith('https://')) {
        errors.push(`${label}.sourcePageUrl은 https 원문 URL이어야 합니다.`);
      }
      if (!RIGHTS_RE.test(String(image.credit ?? ''))) {
        errors.push(`${label}.credit에 재사용 라이선스가 필요합니다.`);
      }
      if (!String(image.notice ?? '').includes('현지 촬영')) {
        errors.push(`${label}.notice에 현지 촬영을 명시해야 합니다.`);
      }
      if (nonEmptyString(image.caption) && !String(pkg.body ?? '').includes(image.caption)) {
        errors.push(`${label}.caption이 body에서 누락되었습니다.`);
      }
      if (nonEmptyString(image.sourcePageUrl) && !String(pkg.body ?? '').includes(image.sourcePageUrl)) {
        errors.push(`${label}.sourcePageUrl이 body에서 누락되었습니다.`);
      }
    });
  }

  if (!Array.isArray(pkg.verificationAnchors) || pkg.verificationAnchors.length < 4) {
    errors.push('verificationAnchors는 4개 이상이어야 합니다.');
  } else if (!pkg.verificationAnchors.every(nonEmptyString)) {
    errors.push('verificationAnchors는 빈 문자열을 포함할 수 없습니다.');
  }

  if (!isPlainObject(pkg.productConnection) || !['available', 'unavailable'].includes(pkg.productConnection.status)) {
    errors.push('productConnection 계약이 필요합니다.');
  }

  const expectedContentDigest = digest(contentDigestInput(pkg));
  if (pkg.contentDigest !== expectedContentDigest) errors.push('contentDigest가 패키지 내용과 다릅니다.');
  const expectedKey = `${pkg.source?.slug}:${String(pkg.source?.digest ?? '').slice(0, 12)}:${String(pkg.source?.guideDigest ?? '').slice(0, 12)}:${expectedContentDigest.slice(0, 12)}`;
  if (pkg.idempotencyKey !== expectedKey) errors.push('idempotencyKey가 원고·패키지 digest와 다릅니다.');

  if (sourceStory) {
    if (pkg.source?.slug !== sourceStory.slug) errors.push('source.slug가 원본 원고와 다릅니다.');
    if (pkg.source?.canonical !== sourceStory.canonical) errors.push('source.canonical이 원본 원고와 다릅니다.');
    if (pkg.source?.digest !== digest(sourceStory)) errors.push('source.digest가 현재 원본 원고와 다릅니다.');
    if (sourceStory.photoStatus !== 'verified') errors.push('원본 원고의 photoStatus가 verified가 아닙니다.');
  }
  if (guide) {
    errors.push(...validateTravelGuide(guide, sourceStory));
    if (pkg.source?.guideDigest !== digest(guide)) errors.push('source.guideDigest가 현재 여행 정보와 다릅니다.');
    if (pkg.source?.guideCheckedAt !== guide.checkedAt) errors.push('source.guideCheckedAt이 현재 여행 정보와 다릅니다.');
    for (const section of guide.sections ?? []) {
      if (!String(pkg.body ?? '').includes(normalizeSpace(section.title))) {
        errors.push(`여행 정보 구간 '${section.title}'이 body에서 누락되었습니다.`);
      }
      for (const source of section.sources ?? []) {
        if (!String(pkg.body ?? '').includes(source.url)) errors.push(`여행 정보 공식 출처가 body에서 누락되었습니다: ${source.url}`);
      }
    }
  }
  return errors;
}

export function renderNaverText(pkg) {
  return [
    pkg.title,
    '',
    pkg.body,
    '',
    pkg.tags.map((tag) => `#${tag}`).join(' '),
    '',
  ].join('\n');
}

export function parseNaverPublicUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new Error('네이버 블로그 공개 URL은 인증정보 없는 HTTPS여야 합니다.');
  }
  if (!NAVER_PUBLIC_HOSTS.has(url.hostname)) throw new Error('네이버 블로그 공개 URL만 허용합니다.');

  const pathParts = url.pathname.split('/').filter(Boolean);
  let blogId;
  let logNo;
  if (url.pathname === '/PostView.naver') {
    blogId = url.searchParams.get('blogId');
    logNo = url.searchParams.get('logNo');
    const allowed = new Set(['blogId', 'logNo']);
    if ([...url.searchParams.keys()].some((key) => !allowed.has(key))) {
      throw new Error('PostView 공개 URL에는 blogId와 logNo만 허용합니다.');
    }
    if (url.searchParams.getAll('blogId').length !== 1 || url.searchParams.getAll('logNo').length !== 1) {
      throw new Error('PostView 공개 URL의 blogId와 logNo는 하나씩만 허용합니다.');
    }
  } else if (pathParts.length === 2 && !url.search && !url.hash) {
    [blogId, logNo] = pathParts;
  } else {
    throw new Error('네이버 공개 글의 정확한 경로만 허용합니다.');
  }
  if (!/^[A-Za-z0-9._-]+$/.test(String(blogId ?? '')) || !/^\d+$/.test(String(logNo ?? ''))) {
    throw new Error('공개 URL에서 blogId와 숫자 logNo를 확인할 수 없습니다.');
  }
  return { url: url.toString(), blogId, logNo };
}

export function verifyRenderedText(pkg, renderedText) {
  const haystack = normalizeSpace(renderedText);
  const missing = pkg.verificationAnchors.filter(
    (anchor) => !haystack.includes(normalizeSpace(anchor)),
  );
  return { ok: missing.length === 0, missing };
}

export function validateRegistry(registry) {
  const errors = [];
  if (!isPlainObject(registry)) return ['공개 기록 루트는 객체여야 합니다.'];
  if (registry.schemaVersion !== 1) errors.push('공개 기록 schemaVersion은 1이어야 합니다.');
  if (registry.channel !== CHANNEL) errors.push(`공개 기록 channel은 ${CHANNEL}이어야 합니다.`);
  if (!Array.isArray(registry.posts)) return [...errors, '공개 기록 posts는 배열이어야 합니다.'];
  const slugs = new Set();
  const urls = new Set();
  registry.posts.forEach((post, index) => {
    const label = `posts[${index}]`;
    for (const key of ['slug', 'idempotencyKey', 'contentDigest', 'url', 'blogId', 'logNo', 'verifiedAt']) {
      if (!nonEmptyString(post?.[key])) errors.push(`${label}.${key}가 필요합니다.`);
    }
    try {
      const parsed = parseNaverPublicUrl(post?.url);
      if (parsed.blogId !== post.blogId || parsed.logNo !== post.logNo) {
        errors.push(`${label}의 URL·blogId·logNo가 일치하지 않습니다.`);
      }
    } catch (error) {
      errors.push(`${label}.url: ${error.message}`);
    }
    if (slugs.has(post?.slug)) errors.push(`${label}.slug가 중복되었습니다.`);
    if (urls.has(post?.url)) errors.push(`${label}.url이 중복되었습니다.`);
    slugs.add(post?.slug);
    urls.add(post?.url);
  });
  return errors;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(resolve(filePath), 'utf8'));
}

async function readStory(slug, sourcePath = DEFAULT_SOURCE_PATH) {
  const payload = await readJson(sourcePath);
  const story = payload.stories?.find((candidate) => candidate.slug === slug);
  if (!story) throw new Error(`원본 글에서 slug '${slug}'를 찾지 못했습니다.`);
  return story;
}

async function readGuide(slug, guidesPath = DEFAULT_GUIDES_PATH) {
  const payload = await readJson(guidesPath);
  if (payload.schemaVersion !== 1 || payload.channel !== CHANNEL || !Array.isArray(payload.guides)) {
    throw new Error('네이버 여행 정보 파일 계약이 올바르지 않습니다.');
  }
  const guide = payload.guides.find((candidate) => candidate.slug === slug);
  if (!guide) throw new Error(`네이버 여행 정보에서 slug '${slug}'를 찾지 못했습니다.`);
  return guide;
}

async function readPackage(packagePath, args = new Map()) {
  const pkg = await readJson(packagePath);
  const story = await readStory(pkg.source?.slug, args.get('--source') || DEFAULT_SOURCE_PATH);
  const guide = await readGuide(pkg.source?.slug, args.get('--guides') || DEFAULT_GUIDES_PATH);
  const errors = validateNaverPackage(pkg, story, guide);
  if (errors.length) throw new Error(`네이버 블로그 패키지 검증 실패:\n- ${errors.join('\n- ')}`);
  return pkg;
}

async function writeIdempotent(filePath, content, allowReplace) {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  try {
    const existing = await readFile(absolutePath, 'utf8');
    if (existing === content) return 'unchanged';
    if (!allowReplace) throw new Error(`${filePath}가 이미 있고 내용이 다릅니다. 교체하려면 --replace를 명시하세요.`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await writeFile(absolutePath, content, 'utf8');
  return 'written';
}

async function writeBinaryIdempotent(filePath, content, allowReplace) {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  try {
    const existing = await readFile(absolutePath);
    if (existing.equals(content)) return 'unchanged';
    if (!allowReplace) throw new Error(`${filePath}가 이미 있고 내용이 다릅니다. 교체하려면 --replace를 명시하세요.`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await writeFile(absolutePath, content);
  return 'written';
}

function safeImageFilename(image) {
  const url = new URL(image.url);
  const original = basename(url.pathname);
  const extension = extname(original).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
    throw new Error(`이미지 ${image.order}: 지원하지 않는 확장자입니다 (${extension || '없음'}).`);
  }
  const stem = original
    .slice(0, -extension.length)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `image-${image.order}`;
  return `${String(image.order).padStart(2, '0')}-${stem}${extension}`;
}

async function downloadImageAssets(pkg, outputDir, allowReplace) {
  const manifestImages = [];
  for (const image of pkg.images) {
    const response = await fetch(image.url, { redirect: 'follow' });
    if (!response.ok) throw new Error(`이미지 ${image.order} 다운로드 실패 (HTTP ${response.status}): ${image.url}`);
    const contentType = response.headers.get('content-type')?.split(';')[0] || '';
    if (!contentType.startsWith('image/')) {
      throw new Error(`이미지 ${image.order} 응답이 이미지가 아닙니다: ${contentType || 'unknown'}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 15 * 1024 * 1024) {
      throw new Error(`이미지 ${image.order} 크기는 1byte~15MB여야 합니다.`);
    }
    const filename = safeImageFilename(image);
    const relativePath = `images/${filename}`;
    await writeBinaryIdempotent(resolve(outputDir, relativePath), bytes, allowReplace);
    manifestImages.push({
      order: image.order,
      localPath: relativePath,
      sourceUrl: image.url,
      sourcePageUrl: image.sourcePageUrl,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      byteLength: bytes.length,
      contentType,
      alt: image.alt,
      caption: image.caption,
    });
  }
  const manifest = {
    schemaVersion: 1,
    channel: CHANNEL,
    idempotencyKey: pkg.idempotencyKey,
    uploadOrder: manifestImages.map((image) => image.localPath),
    images: manifestImages,
  };
  await writeIdempotent(
    resolve(outputDir, 'upload-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    allowReplace,
  );
  return manifest;
}

function runAgentBrowser(args) {
  const result = spawnSync('agent-browser', args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`agent-browser 실패:\n${result.stderr || result.stdout}`.trim());
  }
  return result.stdout.trim();
}

function browserPrefix(args) {
  const session = args.get('--session') || 'naver-blog-wsl';
  const profile = args.get('--profile')
    || process.env.NAVER_BLOG_BROWSER_PROFILE
    || resolve(homedir(), '.agent-browser/profiles/naver-blog');
  const headed = args.get('--headed') === 'false' ? 'false' : 'true';
  return ['--session', session, '--profile', profile, '--headed', headed];
}

function parseBlogId(args) {
  const blogId = args.get('--blog-id') || process.env.NAVER_BLOG_ID;
  if (!/^[A-Za-z0-9._-]+$/.test(String(blogId ?? ''))) {
    throw new Error('SmartEditor를 열려면 --blog-id 또는 NAVER_BLOG_ID가 필요합니다. 저장소에는 계정 ID를 기록하지 않습니다.');
  }
  return blogId;
}

function editorUrl(blogId) {
  return new URL(`/${blogId}/postwrite`, NAVER_BLOG_ORIGIN).toString();
}

async function prepareCommand(args) {
  const slug = args.get('--slug');
  if (!slug) throw new Error('prepare에는 --slug=<원본 slug>가 필요합니다.');
  const story = await readStory(slug, args.get('--source') || DEFAULT_SOURCE_PATH);
  const guide = await readGuide(slug, args.get('--guides') || DEFAULT_GUIDES_PATH);
  const pkg = buildNaverPackage(story, guide);
  const outputDir = args.get('--output-dir') || `_stage/naver-blog/${slug}`;
  const jsonPath = resolve(outputDir, 'package.json');
  const textPath = resolve(outputDir, 'post.txt');
  const allowReplace = args.has('--replace');
  const [jsonState, textState] = await Promise.all([
    writeIdempotent(jsonPath, `${JSON.stringify(pkg, null, 2)}\n`, allowReplace),
    writeIdempotent(textPath, renderNaverText(pkg), allowReplace),
  ]);
  const uploadManifest = args.has('--download-images')
    ? await downloadImageAssets(pkg, outputDir, allowReplace)
    : null;
  console.log(`✓ 네이버 블로그 패키지 ${jsonState === 'unchanged' && textState === 'unchanged' ? '동일' : '준비 완료'}`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  복사용 원고: ${textPath}`);
  if (uploadManifest) {
    console.log(`  업로드 이미지: ${uploadManifest.images.length}개 · ${resolve(outputDir, 'upload-manifest.json')}`);
  } else {
    console.log('  이미지 파일도 받으려면 --download-images를 추가하세요.');
  }
  console.log('  공개 동작은 하지 않았습니다.');
}

async function validateCommand(args) {
  const packagePath = args.get('--package');
  if (!packagePath) throw new Error('validate에는 --package=<package.json>이 필요합니다.');
  const pkg = await readPackage(packagePath, args);
  console.log(`✓ 네이버 블로그 패키지 검증 통과 · ${pkg.idempotencyKey}`);
}

async function listCommand(args) {
  const payload = await readJson(args.get('--source') || DEFAULT_SOURCE_PATH);
  const guides = await readJson(args.get('--guides') || DEFAULT_GUIDES_PATH);
  payload.stories.forEach((story) => {
    const guide = guides.guides?.find((candidate) => candidate.slug === story.slug);
    let state = '준비 가능';
    if (story.photoStatus !== 'verified') state = '차단 · 현지 사진 미검증';
    else if (!guide) state = '차단 · 상세 여행 정보 없음';
    else {
      const errors = validateTravelGuide(guide, story);
      if (errors.length) state = `차단 · 여행 정보 계약 오류 ${errors.length}건`;
    }
    console.log(`${story.slug.padEnd(20)} ${state}`);
  });
}

async function openCommand(args) {
  const packagePath = args.get('--package');
  if (!packagePath) throw new Error('open에는 --package=<package.json>이 필요합니다.');
  if (!args.has('--open')) throw new Error('WSL 브라우저를 열려면 --open을 명시하세요.');
  await readPackage(packagePath, args);
  const blogId = parseBlogId(args);
  const prefix = browserPrefix(args);
  runAgentBrowser([...prefix, 'open', editorUrl(blogId)]);
  runAgentBrowser([...prefix, 'wait', '1200']);
  const currentUrl = runAgentBrowser([...prefix, 'get', 'url']);
  if (currentUrl.includes('nid.naver.com/nidlogin')) {
    throw new Error('LOGIN_REQUIRED: WSL 네이버 전용 프로필에서 먼저 로그인해야 합니다.');
  }
  if (!currentUrl.includes('/postwrite')) {
    throw new Error(`SmartEditor 진입을 확인하지 못했습니다: ${currentUrl}`);
  }
  console.log(`✓ WSL의 네이버 SmartEditor 열기 완료 · ${currentUrl}`);
  console.log(`  본문 파일: ${resolve(dirname(packagePath), 'post.txt')}`);
  console.log('  자동 공개하지 않습니다. 원고·사진·출처를 확인한 뒤 네이버에서 임시저장하세요.');
}

async function stageCommand(args) {
  const packagePath = args.get('--package');
  const manifestPath = args.get('--manifest') || resolve(dirname(packagePath || ''), 'upload-manifest.json');
  if (!packagePath) throw new Error('stage에는 --package=<package.json>이 필요합니다.');
  if (!args.has('--stage')) throw new Error('SmartEditor에 초안을 넣으려면 --stage를 명시하세요. 공개는 하지 않습니다.');
  const pkg = await readPackage(packagePath, args);
  const manifest = await readJson(manifestPath);
  if (manifest.idempotencyKey !== pkg.idempotencyKey) {
    throw new Error('업로드 manifest와 패키지의 멱등 키가 다릅니다. prepare를 다시 실행하세요.');
  }
  if (!Array.isArray(manifest.uploadOrder) || manifest.uploadOrder.length !== pkg.images.length) {
    throw new Error('업로드 manifest의 이미지 수가 패키지와 다릅니다.');
  }

  const blogId = parseBlogId(args);
  const prefix = browserPrefix(args);
  runAgentBrowser([...prefix, 'tab', 'new', editorUrl(blogId)]);
  runAgentBrowser([...prefix, 'wait', '1500']);
  const currentUrl = runAgentBrowser([...prefix, 'get', 'url']);
  if (currentUrl.includes('nid.naver.com/nidlogin')) {
    throw new Error('LOGIN_REQUIRED: WSL 네이버 전용 프로필에서 먼저 로그인해야 합니다.');
  }
  if (!currentUrl.includes('/postwrite')) throw new Error(`SmartEditor 진입을 확인하지 못했습니다: ${currentUrl}`);

  runAgentBrowser([
    ...prefix,
    'eval',
    `document.querySelector('.se-documentTitle')?.scrollIntoView({block:'start'}); 'ok'`,
  ]);
  runAgentBrowser([...prefix, 'click', '.se-documentTitle .se-text-paragraph']);
  runAgentBrowser([...prefix, 'keyboard', 'type', pkg.title]);
  runAgentBrowser([...prefix, 'click', '.se-section-text .se-module-text']);
  // inserttext는 SmartEditor에서 줄바꿈을 지우므로 실제 키 입력으로 문단을 보존합니다.
  runAgentBrowser([...prefix, 'keyboard', 'type', pkg.body]);

  const imagePaths = manifest.uploadOrder.map((relativePath) => resolve(dirname(manifestPath), relativePath));
  runAgentBrowser([...prefix, 'click', 'button[data-name="image"]']);
  runAgentBrowser([...prefix, 'wait', '#hidden-file']);
  runAgentBrowser([...prefix, 'upload', '#hidden-file', ...imagePaths]);
  runAgentBrowser([...prefix, 'wait', '1200']);
  try {
    runAgentBrowser([...prefix, 'find', 'text', '개별사진', 'click']);
  } catch {
    // 한 장 업로드 또는 네이버 UI 변경으로 배치 선택창이 없을 수 있습니다.
  }
  runAgentBrowser([...prefix, 'wait', '1800']);

  const state = JSON.parse(runAgentBrowser([
    ...prefix,
    'eval',
    `JSON.stringify({title:document.querySelector('.se-documentTitle')?.innerText||'',body:document.querySelector('.se-section-text')?.innerText||'',paragraphs:document.querySelectorAll('.se-section-text .se-text-paragraph').length,images:document.querySelectorAll('.se-component.se-image').length})`,
  ]));
  const verification = verifyRenderedText(pkg, `${state.title}\n${state.body}`);
  if (!verification.ok || state.images !== pkg.images.length) {
    throw new Error(`SmartEditor 초안 검증 실패 · 누락 ${verification.missing.join(', ') || '없음'} · 사진 ${state.images}/${pkg.images.length}`);
  }
  if (state.paragraphs < 20) throw new Error(`SmartEditor 문단 구조가 사라졌습니다: ${state.paragraphs}개`);
  console.log(`✓ WSL SmartEditor 초안 배치 완료 · 문단 ${state.paragraphs}개 · 사진 ${state.images}장`);
  console.log('  저장·발행 버튼은 누르지 않았습니다. 화면에서 문단·사진·링크를 최종 확인하세요.');
}

async function verifyCommand(args) {
  const packagePath = args.get('--package');
  const publicUrl = args.get('--url');
  if (!packagePath || !publicUrl) {
    throw new Error('verify에는 --package=<package.json>과 --url=<공개 URL>이 필요합니다.');
  }
  const pkg = await readPackage(packagePath, args);
  const parsed = parseNaverPublicUrl(publicUrl);
  const expectedBlogId = args.get('--blog-id') || process.env.NAVER_BLOG_ID;
  if (expectedBlogId && parsed.blogId !== expectedBlogId) {
    throw new Error('공개 URL의 blogId가 지정한 네이버 블로그 계정과 다릅니다.');
  }
  const prefix = browserPrefix(args);
  runAgentBrowser([...prefix, 'open', parsed.url]);
  runAgentBrowser([...prefix, 'wait', '--load', 'networkidle']);
  const renderedText = runAgentBrowser([...prefix, 'get', 'text', 'body']);
  const verification = verifyRenderedText(pkg, renderedText);
  if (!verification.ok) {
    throw new Error(`공개 글 검증 실패. 누락 앵커:\n- ${verification.missing.join('\n- ')}`);
  }
  console.log(`✓ 네이버 공개 글 실측 통과 · ${parsed.url}`);
  if (!args.has('--record')) {
    console.log('  공개 기록 파일은 바꾸지 않았습니다. 기록하려면 --record를 명시하세요.');
    return;
  }

  const registryPath = args.get('--registry') || DEFAULT_REGISTRY_PATH;
  const registry = await readJson(registryPath);
  const registryErrors = validateRegistry(registry);
  if (registryErrors.length) throw new Error(`기존 공개 기록 검증 실패:\n- ${registryErrors.join('\n- ')}`);
  const existing = registry.posts.find((post) => post.slug === pkg.source.slug);
  if (existing) {
    if (existing.idempotencyKey === pkg.idempotencyKey && existing.url === parsed.url) {
      console.log('  동일한 공개 기록이 이미 있습니다.');
      return;
    }
    throw new Error(`slug '${pkg.source.slug}'의 다른 공개 기록이 이미 있습니다. 자동 교체하지 않습니다.`);
  }
  const next = {
    ...registry,
    posts: [
      ...registry.posts,
      {
        slug: pkg.source.slug,
        idempotencyKey: pkg.idempotencyKey,
        contentDigest: pkg.contentDigest,
        url: parsed.url,
        blogId: parsed.blogId,
        logNo: parsed.logNo,
        verifiedAt: new Date().toISOString(),
      },
    ],
  };
  const nextErrors = validateRegistry(next);
  if (nextErrors.length) throw new Error(`새 공개 기록 검증 실패:\n- ${nextErrors.join('\n- ')}`);
  await writeFile(resolve(registryPath), `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  console.log(`  공개 기록 저장: ${resolve(registryPath)}`);
}

async function main() {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));
  if (command === 'prepare') return prepareCommand(args);
  if (command === 'validate') return validateCommand(args);
  if (command === 'list') return listCommand(args);
  if (command === 'open') return openCommand(args);
  if (command === 'stage') return stageCommand(args);
  if (command === 'verify') return verifyCommand(args);
  throw new Error(
    '사용법:\n'
    + '  node tools/naver-blog-content.mjs list\n'
    + '  node tools/naver-blog-content.mjs prepare --slug=sado [--download-images]\n'
    + '  node tools/naver-blog-content.mjs validate --package=_stage/naver-blog/sado/package.json\n'
    + '  node tools/naver-blog-content.mjs open --package=... --blog-id=... --open\n'
    + '  node tools/naver-blog-content.mjs stage --package=... --blog-id=... --stage\n'
    + '  node tools/naver-blog-content.mjs verify --package=... --url=... [--record]',
  );
}

const isCli = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isCli) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
