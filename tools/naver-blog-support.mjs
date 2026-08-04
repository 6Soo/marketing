#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  buildNaverPackage,
  validateRegistry,
} from './naver-blog-content.mjs';

const CHANNEL = 'naver-blog';
const DEFAULT_DRAFTS_PATH = 'naver-blog/support-drafts.json';
const DEFAULT_PLAN_PATH = 'naver-blog/growth-plan.json';
const DEFAULT_STORIES_PATH = 'blog/published/stories.json';
const DEFAULT_GUIDES_PATH = 'naver-blog/travel-guides.json';
const DEFAULT_REGISTRY_PATH = 'naver-blog/published.json';
const ALLOWED_OFFICIAL_HOSTS = new Set([
  'www.sadokisen.co.jp',
  'www.niigata-airport.gr.jp',
  'www.niigata-kotsu.co.jp',
  'www.visitsado.com',
]);
const RIGHTS_RE = /^(?:CC BY(?: \d(?:\.\d)?)?|CC0|Public domain)$/i;
const PRESSURE_RE = /혼자(?:서는)?\s*(?:절대|불가능|못)|우리와\s*가야|패키지가\s*답/i;
const PRODUCT_FIRST_RE = /(?:상품|패키지|가격|출발일|잔여석|모객)/;
const SUPPORT_PACKAGE_SCHEMA_VERSION = 2;

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

function uniqueStrings(values) {
  return Array.isArray(values)
    && values.length > 0
    && values.every(nonEmptyString)
    && new Set(values).size === values.length;
}

function normalizeSpace(value = '') {
  return String(value).replaceAll(/\s+/g, ' ').trim();
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');
}

function arraysEqual(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function sourceLine(source) {
  return `- ${normalizeSpace(source.label)}: ${source.url}`;
}

function imageCaption(image) {
  return `사진 출처: ${normalizeSpace(image.credit)} · ${normalizeSpace(image.notice)}`;
}

export function resolveSupportLinks(draft, registry) {
  const parentPost = registry.posts.find((post) => post.slug === draft.parentSlug);
  return draft.internalLinks.map((link) => {
    if (link.kind !== 'parent-naver-post') return link;
    return parentPost
      ? { ...link, status: 'verified', url: parentPost.url }
      : link;
  });
}

export function renderSupportBody(draft, registry) {
  const sourceById = new Map(draft.sourceCatalog.map((source) => [source.id, source]));
  const imagesAfterSection = new Map(draft.images.map((image) => [image.afterSectionId, image]));
  const links = resolveSupportLinks(draft, registry);
  const blocks = [
    normalizeSpace(draft.searchDescription),
    '',
    `정보 확인일: ${draft.checkedAt}`,
    normalizeSpace(draft.freshnessNotice),
    '',
  ];
  for (const section of draft.sections) {
    blocks.push(normalizeSpace(section.title), '');
    section.paragraphs.forEach((paragraph) => blocks.push(normalizeSpace(paragraph), ''));
    section.bullets.forEach((bullet) => blocks.push(`- ${normalizeSpace(bullet)}`));
    blocks.push('', '이 구간의 공식 확인 링크');
    section.sources.forEach((sourceId) => blocks.push(sourceLine(sourceById.get(sourceId))));
    blocks.push('');
    const image = imagesAfterSection.get(section.id);
    if (image) {
      blocks.push(`[사진 ${image.order}] ${normalizeSpace(image.alt)}`);
      blocks.push(imageCaption(image));
      blocks.push(`사진 원문: ${image.sourcePageUrl}`, '');
    }
  }
  blocks.push('함께 읽을 사도 여행 정보', '');
  for (const link of links) {
    if (link.status === 'verified' && nonEmptyString(link.url)) {
      blocks.push(`- ${normalizeSpace(link.anchor)}: ${link.url}`);
    } else {
      blocks.push(`- ${normalizeSpace(link.anchor)}: 기둥 글 공개 URL 검증 뒤 연결`);
    }
  }
  blocks.push('', '숲길여행 일정 연결', '', normalizeSpace(draft.productConnection.note));
  return blocks.join('\n').replaceAll(/\n{3,}/g, '\n\n').trim();
}

function normalizeTag(value) {
  return normalizeSpace(value).replace(/^#+/, '').replaceAll(/\s+/g, '');
}

function supportPackageContentInput(pkg) {
  return {
    title: pkg.title,
    body: pkg.body,
    tags: pkg.tags,
    images: pkg.images,
    sourceCatalog: pkg.sourceCatalog,
    internalLinks: pkg.internalLinks,
    productConnection: pkg.productConnection,
    verificationAnchors: pkg.verificationAnchors,
    source: pkg.source,
  };
}

function createSupportPackage(draft, state) {
  const parentPost = state.registry.posts.find((post) => post.slug === draft.parentSlug);
  if (!parentPost) throw new Error(`기둥 글 '${draft.parentSlug}'의 검증된 공개 URL이 없습니다.`);
  const body = renderSupportBody(draft, state.registry);
  const internalLinks = resolveSupportLinks(draft, state.registry);
  const images = draft.images.map((image) => ({
    ...image,
    section: draft.sections.find((section) => section.id === image.afterSectionId)?.title,
    caption: imageCaption(image),
  }));
  const tags = [...new Set([
    draft.searchIntent.primaryQuery,
    ...draft.searchIntent.secondaryQueries,
  ].map(normalizeTag).filter(Boolean))].slice(0, 10);
  const draftDigest = digest(draft);
  const pkg = {
    schemaVersion: SUPPORT_PACKAGE_SCHEMA_VERSION,
    channel: CHANNEL,
    status: 'prepared',
    editorialMode: 'search-support-guide',
    source: {
      slug: draft.slug,
      parentSlug: draft.parentSlug,
      parentUrl: parentPost.url,
      parentContentDigest: parentPost.contentDigest,
      checkedAt: draft.checkedAt,
      draftDigest,
    },
    title: draft.title,
    body,
    tags,
    images,
    sourceCatalog: draft.sourceCatalog,
    internalLinks,
    productConnection: draft.productConnection,
    verificationAnchors: [...new Set([
      draft.title,
      parentPost.url,
      ...internalLinks.filter((link) => link.status === 'verified').map((link) => link.url),
      ...draft.sections.map((section) => section.title),
      ...draft.sourceCatalog.map((source) => source.url),
      ...images.flatMap((image) => [image.caption, image.sourcePageUrl]),
    ])],
    contentDigest: '',
    idempotencyKey: '',
  };
  pkg.contentDigest = digest(supportPackageContentInput(pkg));
  pkg.idempotencyKey = `${draft.slug}:${draftDigest.slice(0, 12)}:${parentPost.contentDigest.slice(0, 12)}:${pkg.contentDigest.slice(0, 12)}`;
  return pkg;
}

export async function buildSupportPackage(slug, state) {
  const result = await validateSupportWorkspace(state);
  if (result.errors.length) throw new Error(`지원 글 계약 검증 실패:\n- ${result.errors.join('\n- ')}`);
  const draft = state.drafts.drafts.find((candidate) => candidate.slug === slug);
  if (!draft) throw new Error(`지원 글 '${slug}'를 찾지 못했습니다.`);
  const metric = result.metrics.get(slug);
  if (!metric?.publishReady) {
    throw new Error(`기둥 글 '${draft.parentSlug}'의 검증된 공개 URL이 없어 지원 글 발행 패키지를 만들 수 없습니다.`);
  }
  return createSupportPackage(draft, state);
}

export async function validateSupportPackage(pkg, state) {
  const errors = [];
  if (!isPlainObject(pkg)) return ['지원 패키지 루트는 객체여야 합니다.'];
  const slug = pkg.source?.slug;
  const draft = state.drafts.drafts?.find((candidate) => candidate.slug === slug);
  if (!draft) return [`지원 글 '${slug ?? 'unknown'}'의 정본 초안이 없습니다.`];
  const result = await validateSupportWorkspace(state);
  if (result.errors.length) return result.errors;
  if (!result.metrics.get(slug)?.publishReady) {
    return [`기둥 글 '${draft.parentSlug}'의 검증된 공개 URL이 없어 지원 패키지를 검증할 수 없습니다.`];
  }
  const expected = createSupportPackage(draft, state);
  if (JSON.stringify(stableValue(pkg)) !== JSON.stringify(stableValue(expected))) {
    errors.push('지원 패키지가 현재 초안·공개 기둥 글·사진·공식 출처로 재생성한 값과 다릅니다.');
  }
  return errors;
}

function wordNgrams(value, size = 5) {
  const words = String(value)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const grams = [];
  for (let index = 0; index <= words.length - size; index += 1) {
    grams.push(words.slice(index, index + size).join(' '));
  }
  return new Set(grams);
}

export function supportBodyOverlapPercent(supportBody, pillarBody, ngramSize = 5) {
  const support = wordNgrams(supportBody, ngramSize);
  const pillar = wordNgrams(pillarBody, ngramSize);
  if (support.size === 0) return 0;
  const overlap = [...support].filter((gram) => pillar.has(gram)).length;
  return Math.round((overlap / support.size) * 1000) / 10;
}

function findArticle(plan, slug) {
  for (const cluster of plan.clusters ?? []) {
    const article = cluster.articles?.find((candidate) => candidate.slug === slug);
    if (article) return { cluster, article };
  }
  return {};
}

function collectStoryImagePages(story) {
  return new Set([
    story?.hero?.pageUrl,
    ...(story?.sections ?? []).map((section) => section.image?.pageUrl),
  ].filter(nonEmptyString));
}

function officialSourceErrors(draft, parentGuide, minimumNewSources) {
  const errors = [];
  const ids = new Set();
  const urls = new Set();
  const parentUrls = new Set(
    (parentGuide.sections ?? []).flatMap((section) => section.sources ?? []).map((source) => source.url),
  );
  for (const [index, source] of draft.sourceCatalog.entries()) {
    const label = `sourceCatalog[${index}]`;
    if (!isPlainObject(source) || !nonEmptyString(source.id) || !nonEmptyString(source.label)) {
      errors.push(`${label}에 id와 label이 필요합니다.`);
      continue;
    }
    if (ids.has(source.id)) errors.push(`${label}.id가 중복되었습니다.`);
    ids.add(source.id);
    try {
      const url = new URL(source.url);
      if (url.protocol !== 'https:' || !ALLOWED_OFFICIAL_HOSTS.has(url.hostname) || source.official !== true) {
        errors.push(`${label}는 허용된 공식 기관 HTTPS 출처여야 합니다.`);
      }
    } catch {
      errors.push(`${label}.url이 올바르지 않습니다.`);
    }
    if (urls.has(source.url)) errors.push(`${label}.url이 중복되었습니다.`);
    urls.add(source.url);
  }
  for (const [index, section] of draft.sections.entries()) {
    if (!uniqueStrings(section.sources)) errors.push(`sections[${index}].sources가 필요합니다.`);
    for (const sourceId of section.sources ?? []) {
      if (!ids.has(sourceId)) errors.push(`sections[${index}]가 없는 출처 '${sourceId}'를 참조합니다.`);
    }
  }
  const newOfficial = draft.sourceCatalog.filter((source) => !parentUrls.has(source.url));
  if (newOfficial.length < minimumNewSources) {
    errors.push(`기둥 글과 다른 신규 공식 출처가 ${minimumNewSources}개 이상 필요합니다.`);
  }
  return { errors, newOfficial };
}

async function imageErrors(draft, parentStory, minimumImages, rootDir) {
  const errors = [];
  const parentImagePages = collectStoryImagePages(parentStory);
  const pageUrls = new Set();
  if (!Array.isArray(draft.images) || draft.images.length < minimumImages) {
    return { errors: [`독립 검증 사진이 ${minimumImages}장 이상 필요합니다.`], verifiedImages: [] };
  }
  for (const [index, image] of draft.images.entries()) {
    const label = `images[${index}]`;
    if (!isPlainObject(image)) {
      errors.push(`${label}는 객체여야 합니다.`);
      continue;
    }
    if (image.order !== index + 1) errors.push(`${label}.order가 연속되지 않습니다.`);
    if (!draft.sections.some((section) => section.id === image.afterSectionId)) {
      errors.push(`${label}.afterSectionId가 본문 구간과 다릅니다.`);
    }
    for (const key of ['localPath', 'alt', 'credit', 'notice', 'sourcePageUrl', 'revisionUrl', 'sha256']) {
      if (!nonEmptyString(image[key])) errors.push(`${label}.${key}가 필요합니다.`);
    }
    if (image.photoStatus !== 'verified') errors.push(`${label}.photoStatus는 verified여야 합니다.`);
    if (!RIGHTS_RE.test(String(image.license ?? ''))) errors.push(`${label}.license는 CC BY·CC0·Public Domain만 허용합니다.`);
    if (Math.max(image.width ?? 0, image.height ?? 0) < 2700) errors.push(`${label}의 장변은 2700px 이상이어야 합니다.`);
    if (pageUrls.has(image.sourcePageUrl)) errors.push(`${label}.sourcePageUrl이 다른 사진과 중복되었습니다.`);
    if (parentImagePages.has(image.sourcePageUrl)) errors.push(`${label}가 기둥 글 사진을 재사용합니다.`);
    pageUrls.add(image.sourcePageUrl);
    const normalizedPath = String(image.localPath ?? '').replaceAll('\\', '/');
    if (!normalizedPath.startsWith(`naver-blog/photos/${draft.slug}/`) || normalizedPath.includes('../')) {
      errors.push(`${label}.localPath는 해당 지원 글 사진 폴더 안이어야 합니다.`);
      continue;
    }
    try {
      const absolute = resolve(rootDir, normalizedPath);
      const [bytes, metadataText] = await Promise.all([
        readFile(absolute),
        readFile(`${absolute}.source.json`, 'utf8'),
      ]);
      const metadata = JSON.parse(metadataText);
      const actualSha256 = createHash('sha256').update(bytes).digest('hex');
      if (actualSha256 !== image.sha256 || metadata.sha256 !== image.sha256) errors.push(`${label}.sha256이 실제 파일·출처 기록과 다릅니다.`);
      if (metadata.descriptionPage !== image.sourcePageUrl) errors.push(`${label}.sourcePageUrl이 출처 기록과 다릅니다.`);
      if (metadata.revisionUrl !== image.revisionUrl || !Number.isInteger(metadata.revisionId)) errors.push(`${label}.revisionUrl 또는 고정 리비전이 다릅니다.`);
      if (metadata.license !== image.license || !RIGHTS_RE.test(String(metadata.license ?? ''))) errors.push(`${label}.license가 출처 기록과 다릅니다.`);
      if (metadata.width !== image.width || metadata.height !== image.height) errors.push(`${label}.width/height가 출처 기록과 다릅니다.`);
      if (!image.credit.includes(metadata.author) || !image.credit.includes(metadata.license)) errors.push(`${label}.credit에 저작자와 라이선스가 필요합니다.`);
    } catch (error) {
      errors.push(`${label} 파일·출처 기록을 읽지 못했습니다: ${error.message}`);
    }
  }
  return { errors, verifiedImages: draft.images };
}

function planEvidenceErrors(article, newOfficial, images, overlapPercent, requirePlanEvidence) {
  if (!requirePlanEvidence) return [];
  const errors = [];
  const evidence = article.researchEvidence;
  if (!isPlainObject(evidence)) return ['growth-plan의 researchEvidence가 필요합니다.'];
  const actualSourceUrls = new Set(newOfficial.map((source) => source.url));
  const evidenceSourceUrls = new Set((evidence.officialSources ?? []).map((source) => source.url));
  if (actualSourceUrls.size !== evidenceSourceUrls.size
    || [...actualSourceUrls].some((url) => !evidenceSourceUrls.has(url))) {
    errors.push('growth-plan의 신규 공식 출처가 지원 글 실제 출처와 다릅니다.');
  }
  const actualImagePages = new Set(images.map((image) => image.sourcePageUrl));
  const evidenceImagePages = new Set((evidence.verifiedImages ?? []).map((image) => image.sourcePageUrl));
  if (actualImagePages.size !== evidenceImagePages.size
    || [...actualImagePages].some((url) => !evidenceImagePages.has(url))) {
    errors.push('growth-plan의 검증 사진이 지원 글 실제 사진과 다릅니다.');
  }
  if (evidence.bodyOverlapPercent !== overlapPercent) {
    errors.push(`growth-plan 본문 중복률 ${evidence.bodyOverlapPercent}가 실측 ${overlapPercent}와 다릅니다.`);
  }
  return errors;
}

export async function validateSupportWorkspace(state, { requirePlanEvidence = true } = {}) {
  const errors = [];
  const metrics = new Map();
  const rootDir = state.rootDir || process.cwd();
  if (!isPlainObject(state.drafts) || state.drafts.schemaVersion !== 1 || state.drafts.channel !== CHANNEL) {
    return { errors: ['지원 글 파일의 schemaVersion 또는 channel이 올바르지 않습니다.'], metrics };
  }
  if (!Array.isArray(state.drafts.drafts) || state.drafts.drafts.length === 0) {
    return { errors: ['지원 글 drafts가 1개 이상 필요합니다.'], metrics };
  }
  const registryErrors = validateRegistry(state.registry);
  if (registryErrors.length) errors.push(...registryErrors.map((error) => `공개 기록: ${error}`));
  const registrySlugs = new Set(state.registry.posts?.map((post) => post.slug) ?? []);
  const slugs = new Set();
  const imageOwners = new Map();
  for (const [draftIndex, draft] of state.drafts.drafts.entries()) {
    const prefix = `drafts[${draftIndex}]`;
    const draftErrors = [];
    if (!isPlainObject(draft)) {
      errors.push(`${prefix}는 객체여야 합니다.`);
      continue;
    }
    if (!nonEmptyString(draft.slug) || slugs.has(draft.slug)) draftErrors.push('slug가 없거나 중복되었습니다.');
    slugs.add(draft.slug);
    if (draft.status !== 'draft-ready') draftErrors.push('status는 draft-ready여야 합니다.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(draft.checkedAt ?? ''))) draftErrors.push('checkedAt은 YYYY-MM-DD여야 합니다.');
    if (!nonEmptyString(draft.freshnessNotice)) draftErrors.push('freshnessNotice가 필요합니다.');
    if (!nonEmptyString(draft.title) || [...String(draft.title ?? '')].length > 40) draftErrors.push('title은 1~40자여야 합니다.');
    if (!nonEmptyString(draft.searchDescription) || [...String(draft.searchDescription ?? '')].length > 160) draftErrors.push('searchDescription은 1~160자여야 합니다.');
    const { cluster, article } = findArticle(state.plan, draft.slug);
    if (!article || article.role !== 'support') {
      draftErrors.push('growth-plan의 support 글과 연결되지 않습니다.');
    } else {
      const expectedArticleStatus = registrySlugs.has(draft.slug) ? 'published' : draft.status;
      if (requirePlanEvidence && article.status !== expectedArticleStatus) {
        draftErrors.push(`growth-plan status는 공개 기록에 따라 '${expectedArticleStatus}'여야 합니다.`);
      }
      if (draft.parentSlug !== cluster.destinationSlug) draftErrors.push('parentSlug가 클러스터 여행지와 다릅니다.');
      if (draft.title !== article.title || draft.question !== article.question) draftErrors.push('title 또는 question이 growth-plan과 다릅니다.');
      if (draft.searchIntent?.primaryQuery !== article.primaryQuery
        || !arraysEqual(draft.searchIntent?.secondaryQueries, article.secondaryQueries)) {
        draftErrors.push('searchIntent가 growth-plan과 다릅니다.');
      }
    }
    for (const term of draft.searchIntent?.disambiguationTerms ?? []) {
      if (!draft.title.includes(term) || !draft.searchDescription.includes(term)) draftErrors.push(`동명 여행지 구분어 '${term}'이 제목·첫 문단에 필요합니다.`);
    }
    if (PRODUCT_FIRST_RE.test(`${draft.title ?? ''}\n${draft.question ?? ''}`)) draftErrors.push('제목·질문이 여행지보다 상품을 앞세웁니다.');
    if (PRESSURE_RE.test(JSON.stringify(draft))) draftErrors.push('혼자 가기 불안을 과장하는 문구가 있습니다.');
    if (!Array.isArray(draft.sections) || draft.sections.length < 5) {
      draftErrors.push('서로 다른 실용 정보 구간이 5개 이상 필요합니다.');
    } else {
      const sectionIds = draft.sections.map((section) => section.id);
      if (!uniqueStrings(sectionIds)) draftErrors.push('section.id가 없거나 중복되었습니다.');
      draft.sections.forEach((section, index) => {
        if (!nonEmptyString(section.title)
          || !Array.isArray(section.paragraphs)
          || section.paragraphs.length < 2
          || !section.paragraphs.every(nonEmptyString)
          || !Array.isArray(section.bullets)
          || section.bullets.length < 3
          || !section.bullets.every(nonEmptyString)) {
          draftErrors.push(`sections[${index}]에 제목·문단 2개·항목 3개 이상이 필요합니다.`);
        }
      });
    }
    const parentStory = state.stories.stories?.find((story) => story.slug === draft.parentSlug);
    const parentGuide = state.guides.guides?.find((guide) => guide.slug === draft.parentSlug);
    if (!parentStory || !parentGuide) {
      draftErrors.push('기둥 글 원본 또는 여행 정보가 없습니다.');
      errors.push(...draftErrors.map((error) => `${prefix}: ${error}`));
      continue;
    }
    const sourceResult = officialSourceErrors(
      draft,
      parentGuide,
      state.plan.guardrails.minimumNewOfficialSourcesForSupportPost,
    );
    draftErrors.push(...sourceResult.errors);
    const imageResult = await imageErrors(
      draft,
      parentStory,
      state.plan.guardrails.minimumDistinctVerifiedImagesForSupportPost,
      rootDir,
    );
    draftErrors.push(...imageResult.errors);
    for (const image of imageResult.verifiedImages) {
      const owner = imageOwners.get(image.sourcePageUrl);
      if (owner && owner !== draft.slug) {
        draftErrors.push(`사진 '${image.sourcePageUrl}'는 '${owner}' 지원 글이 이미 사용합니다.`);
      } else {
        imageOwners.set(image.sourcePageUrl, draft.slug);
      }
    }
    const parentLinks = draft.internalLinks?.filter((link) => link.kind === 'parent-naver-post') ?? [];
    const foresttourLinks = draft.internalLinks?.filter((link) => link.kind === 'foresttour-record') ?? [];
    if (parentLinks.length !== 1 || parentLinks[0].targetSlug !== draft.parentSlug) draftErrors.push('기둥 네이버 글 내부 링크가 정확히 1개 필요합니다.');
    if (foresttourLinks.length !== 1 || foresttourLinks[0].url !== parentStory.canonical || foresttourLinks[0].status !== 'verified') {
      draftErrors.push('같은 여행지의 foresttour.kr 기록 링크가 필요합니다.');
    }
    if (draft.productConnection?.status !== 'unavailable' || !nonEmptyString(draft.productConnection?.note)) {
      draftErrors.push('정확한 공개 상품이 없으므로 productConnection은 unavailable이어야 합니다.');
    }
    let overlapPercent = null;
    try {
      const supportBody = renderSupportBody(draft, state.registry);
      const pillarBody = buildNaverPackage(parentStory, parentGuide).body;
      if (supportBody.length < 2500) draftErrors.push('지원 글 본문은 2500자 이상이어야 합니다.');
      overlapPercent = supportBodyOverlapPercent(supportBody, pillarBody);
      if (overlapPercent > state.plan.guardrails.maximumBodyOverlapPercent) {
        draftErrors.push(`기둥 글과 본문 중복률 ${overlapPercent}%가 상한 ${state.plan.guardrails.maximumBodyOverlapPercent}%를 넘습니다.`);
      }
      if (article) {
        draftErrors.push(...planEvidenceErrors(
          article,
          sourceResult.newOfficial,
          imageResult.verifiedImages,
          overlapPercent,
          requirePlanEvidence,
        ));
      }
      const links = resolveSupportLinks(draft, state.registry);
      const parentLinkResolved = links.some((link) => link.kind === 'parent-naver-post' && link.status === 'verified' && nonEmptyString(link.url));
      const publishedPost = state.registry.posts.find((post) => post.slug === draft.slug);
      if (publishedPost && parentLinkResolved) {
        const expectedPackage = createSupportPackage(draft, state);
        if (publishedPost.idempotencyKey !== expectedPackage.idempotencyKey
          || publishedPost.contentDigest !== expectedPackage.contentDigest) {
          draftErrors.push('공개 지원 글 기록의 멱등 키·contentDigest가 현재 초안과 다릅니다.');
        }
      }
      metrics.set(draft.slug, {
        bodyLength: [...supportBody].length,
        overlapPercent,
        officialSourceCount: draft.sourceCatalog.length,
        newOfficialSourceCount: sourceResult.newOfficial.length,
        verifiedImageCount: imageResult.verifiedImages.length,
        parentLinkResolved,
        publishReady: draftErrors.length === 0 && parentLinkResolved,
        contentDigest: digest({ title: draft.title, body: supportBody, images: draft.images, links }),
      });
    } catch (error) {
      draftErrors.push(`본문 생성·중복률 계산 실패: ${error.message}`);
    }
    errors.push(...draftErrors.map((error) => `${prefix}: ${error}`));
  }
  return { errors, metrics };
}

export function renderSupportReport(state, result) {
  const lines = ['네이버 검색 지원 글 보고'];
  for (const draft of state.drafts.drafts) {
    const metric = result.metrics.get(draft.slug);
    lines.push(`- ${draft.slug}: ${draft.title}`);
    if (!metric) {
      lines.push('  분석값 없음');
      continue;
    }
    lines.push(`  본문 ${metric.bodyLength}자 · 기둥 글 5어절 중복률 ${metric.overlapPercent}%`);
    lines.push(`  공식 출처 ${metric.officialSourceCount}개(신규 ${metric.newOfficialSourceCount}) · 검증 사진 ${metric.verifiedImageCount}장`);
    lines.push(metric.parentLinkResolved
      ? '  기둥 글 공개 URL 연결 완료 · 발행 패키지 준비 가능'
      : '  기둥 글 공개 URL 미확인 · 로컬 초안만 준비, 발행 차단');
  }
  return lines.join('\n');
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(path), 'utf8'));
}

export async function loadSupportState(args = new Map()) {
  const paths = {
    drafts: args.get('--drafts') || args.get('--support-drafts') || DEFAULT_DRAFTS_PATH,
    plan: args.get('--plan') || DEFAULT_PLAN_PATH,
    stories: args.get('--stories') || args.get('--source') || DEFAULT_STORIES_PATH,
    guides: args.get('--guides') || DEFAULT_GUIDES_PATH,
    registry: args.get('--registry') || DEFAULT_REGISTRY_PATH,
  };
  const [drafts, plan, stories, guides, registry] = await Promise.all([
    readJson(paths.drafts),
    readJson(paths.plan),
    readJson(paths.stories),
    readJson(paths.guides),
    readJson(paths.registry),
  ]);
  return { paths, drafts, plan, stories, guides, registry, rootDir: process.cwd() };
}

async function writeIdempotent(path, content, allowReplace) {
  const absolute = resolve(path);
  await mkdir(dirname(absolute), { recursive: true });
  try {
    const existing = await readFile(absolute);
    const next = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    if (existing.equals(next)) return 'unchanged';
    if (!allowReplace) throw new Error(`${path}가 이미 있고 내용이 다릅니다. 교체하려면 --replace를 명시하세요.`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await writeFile(absolute, content);
  return 'written';
}

function renderSupportText(pkg) {
  return [
    pkg.title,
    '',
    pkg.body,
    '',
    pkg.tags.map((tag) => `#${tag}`).join(' '),
    '',
  ].join('\n');
}

async function writeSupportAssets(pkg, draft, outputDir, allowReplace, rootDir) {
  const manifestImages = [];
  for (const image of draft.images) {
    const filename = basename(image.localPath);
    const relativePath = `images/${filename}`;
    const bytes = await readFile(resolve(rootDir, image.localPath));
    await writeIdempotent(resolve(outputDir, relativePath), bytes, allowReplace);
    manifestImages.push({
      order: image.order,
      localPath: relativePath,
      sourcePageUrl: image.sourcePageUrl,
      sha256: image.sha256,
      byteLength: bytes.length,
      contentType: 'image/jpeg',
      alt: image.alt,
      caption: imageCaption(image),
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

async function analyzeCommand(args) {
  const state = await loadSupportState(args);
  const result = await validateSupportWorkspace(state, { requirePlanEvidence: false });
  if (result.errors.length) throw new Error(`지원 글 조사·초안 검증 실패:\n- ${result.errors.join('\n- ')}`);
  console.log(renderSupportReport(state, result));
}

async function validateCommand(args) {
  const state = await loadSupportState(args);
  const result = await validateSupportWorkspace(state);
  if (result.errors.length) throw new Error(`지원 글 계약 검증 실패:\n- ${result.errors.join('\n- ')}`);
  console.log(`✓ 네이버 검색 지원 글 계약 통과 · ${state.drafts.drafts.length}편`);
  console.log(renderSupportReport(state, result));
}

async function previewCommand(args) {
  const state = await loadSupportState(args);
  const slug = args.get('--slug');
  if (!nonEmptyString(slug)) throw new Error('preview에는 --slug=<지원 글 slug>가 필요합니다.');
  const draft = state.drafts.drafts.find((candidate) => candidate.slug === slug);
  if (!draft) throw new Error(`지원 글 '${slug}'를 찾지 못했습니다.`);
  const result = await validateSupportWorkspace(state);
  if (result.errors.length) throw new Error(`지원 글 계약 검증 실패:\n- ${result.errors.join('\n- ')}`);
  const output = args.get('--output') || `_stage/naver-blog/${slug}/draft.txt`;
  await mkdir(dirname(resolve(output)), { recursive: true });
  const rendered = [draft.title, '', renderSupportBody(draft, state.registry), ''].join('\n');
  await writeFile(resolve(output), rendered, 'utf8');
  console.log(`✓ 지원 글 로컬 미리보기 생성 · ${resolve(output)}`);
  if (!result.metrics.get(slug).parentLinkResolved) {
    console.log('  기둥 글 공개 URL이 없어 발행 패키지는 만들지 않았습니다. 브라우저도 열지 않았습니다.');
  }
}

export async function prepareSupportPackage(slug, state, outputDir, allowReplace = false) {
  const draft = state.drafts.drafts.find((candidate) => candidate.slug === slug);
  if (!draft) throw new Error(`지원 글 '${slug}'를 찾지 못했습니다.`);
  const pkg = await buildSupportPackage(slug, state);
  const [packageState, textState, manifest] = await Promise.all([
    writeIdempotent(
      resolve(outputDir, 'package.json'),
      `${JSON.stringify(pkg, null, 2)}\n`,
      allowReplace,
    ),
    writeIdempotent(resolve(outputDir, 'post.txt'), renderSupportText(pkg), allowReplace),
    writeSupportAssets(pkg, draft, outputDir, allowReplace, state.rootDir),
  ]);
  return { pkg, packageState, textState, manifest, outputDir: resolve(outputDir) };
}

async function prepareCommand(args) {
  const state = await loadSupportState(args);
  const slug = args.get('--slug');
  if (!nonEmptyString(slug)) throw new Error('prepare에는 --slug=<지원 글 slug>가 필요합니다.');
  const outputDir = args.get('--output-dir') || `_stage/naver-blog/${slug}`;
  const result = await prepareSupportPackage(slug, state, outputDir, args.has('--replace'));
  const { packageState, textState, manifest } = result;
  console.log(`✓ 네이버 검색 지원 패키지 ${packageState === 'unchanged' && textState === 'unchanged' ? '동일' : '준비 완료'}`);
  console.log(`  JSON: ${resolve(result.outputDir, 'package.json')}`);
  console.log(`  복사용 원고: ${resolve(result.outputDir, 'post.txt')}`);
  console.log(`  업로드 이미지: ${manifest.images.length}개 · ${resolve(result.outputDir, 'upload-manifest.json')}`);
  console.log('  브라우저·저장·공개 동작은 하지 않았습니다.');
}

async function main() {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));
  if (command === 'analyze') return analyzeCommand(args);
  if (command === 'validate') return validateCommand(args);
  if (command === 'preview') return previewCommand(args);
  if (command === 'prepare') return prepareCommand(args);
  throw new Error(
    '사용법:\n'
    + '  node tools/naver-blog-support.mjs analyze\n'
    + '  node tools/naver-blog-support.mjs validate\n'
    + '  node tools/naver-blog-support.mjs preview --slug=sado-access\n'
    + '  node tools/naver-blog-support.mjs prepare --slug=sado-access [--replace]',
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
