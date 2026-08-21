#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { validateRegistry } from './naver-blog-content.mjs';

const CHANNEL = 'naver-blog';
const DEFAULT_PLAN_PATH = 'naver-blog/growth-plan.json';
const DEFAULT_OBSERVATIONS_PATH = 'naver-blog/observations.json';
const DEFAULT_STORIES_PATH = 'blog/published/stories.json';
const DEFAULT_GUIDES_PATH = 'naver-blog/travel-guides.json';
const DEFAULT_REGISTRY_PATH = 'naver-blog/published.json';
const REQUIRED_GUIDE_SECTIONS = new Set(['access', 'transport', 'plan', 'checklist', 'complexity']);
const REQUIRED_CHECKPOINTS = new Set(['D+3', 'D+7', 'D+28']);
const REQUIRED_METRICS = new Set([
  'publicUrlVerified',
  'targetQueryFound',
  'rankBand',
  'postViews',
  'searchInflows',
  'foresttourClicks',
]);
const SUPPORT_STATUSES = new Set(['research-required', 'draft-ready', 'ready', 'staged', 'published']);
const RANK_BANDS = new Set(['1-3', '4-10', '11-20', '21-30', '31-50', '50+', 'not-found']);
const PRODUCT_FIRST_RE = /(?:상품|패키지|가격|출발일|잔여석|모객|예약\s*(?:하기|상품))/;
const OBSERVATION_KEYS = new Set([
  'slug',
  'checkpoint',
  'observedAt',
  'publicUrlVerified',
  'targetQueryFound',
  'rankBand',
  'postViews',
  'searchInflows',
  'foresttourClicks',
]);
const OBSERVATION_ROOT_KEYS = new Set(['schemaVersion', 'channel', 'observations']);
const CHECKPOINT_DAYS = new Map([['D+3', 3], ['D+7', 7], ['D+28', 28]]);
const RIGHTS_RE = /CC BY|CC0|Public Domain|퍼블릭 도메인/i;

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

function hasSet(values, required) {
  const actual = new Set(values ?? []);
  return [...required].every((value) => actual.has(value));
}

function articleMap(plan) {
  return new Map(
    (plan.clusters ?? []).flatMap((cluster) => (
      (cluster.articles ?? []).map((article) => [article.slug, { cluster, article }])
    )),
  );
}

function destinationTerms(cluster, guide, pillar) {
  const generic = new Set([
    cluster.country,
    cluster.region,
    '여행',
    '가는',
    '법',
    '코스',
    '일정',
  ]);
  return [...new Set([
    ...(guide.searchIntent?.primaryQuery ?? '').split(/\s+/),
    ...(pillar?.primaryQuery ?? '').split(/\s+/),
  ].filter((term) => term && !generic.has(term) && !/^\d+박$/.test(term) && !/^\d+일$/.test(term)))];
}

function validateSupportEvidence(article, guardrails, label, errors) {
  if (article.status === 'research-required') return;
  const evidence = article.researchEvidence;
  if (!isPlainObject(evidence)) {
    errors.push(`${label}.researchEvidence가 있어야 지원 글을 ${article.status} 상태로 바꿀 수 있습니다.`);
    return;
  }
  const sources = evidence.officialSources;
  const sourceUrls = Array.isArray(sources)
    ? sources.map((source) => source?.url).filter(nonEmptyString)
    : [];
  if (sourceUrls.length < guardrails.minimumNewOfficialSourcesForSupportPost
    || new Set(sourceUrls).size !== sourceUrls.length
    || sourceUrls.some((url) => !url.startsWith('https://'))
    || sources?.some((source) => !nonEmptyString(source?.label))) {
    errors.push(`${label}.researchEvidence.officialSources에 서로 다른 신규 공식 HTTPS 출처가 ${guardrails.minimumNewOfficialSourcesForSupportPost}개 이상 필요합니다.`);
  }
  const images = evidence.verifiedImages;
  const imageSources = Array.isArray(images)
    ? images.map((image) => image?.sourcePageUrl).filter(nonEmptyString)
    : [];
  if (imageSources.length < guardrails.minimumDistinctVerifiedImagesForSupportPost
    || new Set(imageSources).size !== imageSources.length
    || images?.some((image) => image?.photoStatus !== 'verified'
      || !nonEmptyString(image?.sha256)
      || !RIGHTS_RE.test(String(image?.credit ?? '')))) {
    errors.push(`${label}.researchEvidence.verifiedImages에 서로 다른 검증 사진과 SHA-256이 ${guardrails.minimumDistinctVerifiedImagesForSupportPost}개 이상 필요합니다.`);
  }
  if (!Number.isFinite(evidence.bodyOverlapPercent)
    || evidence.bodyOverlapPercent < 0
    || evidence.bodyOverlapPercent > guardrails.maximumBodyOverlapPercent) {
    errors.push(`${label}.researchEvidence.bodyOverlapPercent는 0~${guardrails.maximumBodyOverlapPercent}여야 합니다.`);
  }
}

export function validateGrowthPlan(plan, { stories, guides, registry }) {
  const errors = [];
  if (!isPlainObject(plan)) return ['성장 계획 루트는 객체여야 합니다.'];
  if (plan.schemaVersion !== 1) errors.push('성장 계획 schemaVersion은 1이어야 합니다.');
  if (plan.channel !== CHANNEL) errors.push(`성장 계획 channel은 ${CHANNEL}이어야 합니다.`);
  const registryErrors = validateRegistry(registry);
  if (registryErrors.length) errors.push(...registryErrors.map((error) => `공개 기록: ${error}`));
  if (!nonEmptyString(plan.objective) || !plan.objective.includes('여행지')) {
    errors.push('성장 목표에 여행지 소개 목적이 명시되어야 합니다.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(plan.officialGuidanceCheckedAt ?? ''))) {
    errors.push('officialGuidanceCheckedAt은 YYYY-MM-DD 형식이어야 합니다.');
  }
  if (!Array.isArray(plan.officialGuidance) || plan.officialGuidance.length < 2) {
    errors.push('공식 가이드 원문이 2개 이상 필요합니다.');
  } else {
    plan.officialGuidance.forEach((source, index) => {
      if (!nonEmptyString(source?.label) || !String(source?.url ?? '').startsWith('https://')) {
        errors.push(`officialGuidance[${index}]에 label과 HTTPS URL이 필요합니다.`);
      }
    });
  }

  const guardrails = plan.guardrails;
  if (!isPlainObject(guardrails)) return [...errors, 'guardrails가 필요합니다.'];
  for (const key of [
    'maxPostsPerWeek',
    'minimumDaysBetweenPosts',
    'maxPostsPer24h',
    'maximumTitleLength',
    'maximumBodyOverlapPercent',
    'minimumNewOfficialSourcesForSupportPost',
    'minimumDistinctVerifiedImagesForSupportPost',
  ]) {
    if (!Number.isInteger(guardrails[key]) || guardrails[key] <= 0) {
      errors.push(`guardrails.${key}는 양의 정수여야 합니다.`);
    }
  }
  if (guardrails.maxPostsPerWeek > 7) errors.push('주 7편을 넘는 발행 계획은 자동 발행 상한을 초과합니다.');
  if (guardrails.minimumDaysBetweenPosts < 1) errors.push('글 사이에는 최소 1일을 두어야 합니다.');
  if (guardrails.maxPostsPer24h !== 1) errors.push('24시간 자동 발행 상한은 1편이어야 합니다.');
  if (guardrails.maximumTitleLength > 40) errors.push('제목 상한은 40자를 넘길 수 없습니다.');
  if (guardrails.maximumBodyOverlapPercent > 25) errors.push('지원 글 본문 중복률 상한은 25%를 넘길 수 없습니다.');
  if (!uniqueStrings(guardrails.rules) || guardrails.rules.length < 4) {
    errors.push('guardrails.rules에는 서로 다른 운영 규칙이 4개 이상 필요합니다.');
  }

  if (!Array.isArray(plan.clusters) || plan.clusters.length === 0) {
    return [...errors, 'clusters가 1개 이상 필요합니다.'];
  }
  const storySlugs = new Set(stories?.stories?.map((story) => story.slug) ?? []);
  const guideBySlug = new Map(guides?.guides?.map((guide) => [guide.slug, guide]) ?? []);
  const registrySlugs = new Set(registry?.posts?.map((post) => post.slug) ?? []);
  const seenClusterIds = new Set();
  const seenSlugs = new Set();
  const seenQueries = new Set();
  const queryOwners = new Map();
  const seenTitles = new Set();
  const seenQuestions = new Set();

  plan.clusters.forEach((cluster, clusterIndex) => {
    const clusterLabel = `clusters[${clusterIndex}]`;
    if (!isPlainObject(cluster)) {
      errors.push(`${clusterLabel}는 객체여야 합니다.`);
      return;
    }
    if (!nonEmptyString(cluster.id) || seenClusterIds.has(cluster.id)) errors.push(`${clusterLabel}.id가 없거나 중복되었습니다.`);
    seenClusterIds.add(cluster.id);
    if (!storySlugs.has(cluster.destinationSlug)) errors.push(`${clusterLabel}.destinationSlug의 공개 여행지 원고가 없습니다.`);
    const guide = guideBySlug.get(cluster.destinationSlug);
    if (!guide) errors.push(`${clusterLabel}.destinationSlug의 네이버 여행 정보가 없습니다.`);
    if (!nonEmptyString(cluster.country) || !nonEmptyString(cluster.region)) {
      errors.push(`${clusterLabel}.country와 region이 필요합니다.`);
    }
    if (!isPlainObject(cluster.searchEvidence)
      || !/^\d{4}-\d{2}-\d{2}$/.test(String(cluster.searchEvidence?.checkedAt ?? ''))
      || !uniqueStrings(cluster.searchEvidence?.findings)) {
      errors.push(`${clusterLabel}.searchEvidence에 확인일·방법·서로 다른 findings가 필요합니다.`);
    }
    if (!Array.isArray(cluster.articles) || cluster.articles.length === 0) {
      errors.push(`${clusterLabel}.articles가 필요합니다.`);
      return;
    }
    const pillars = cluster.articles.filter((article) => article.role === 'pillar');
    if (pillars.length !== 1) errors.push(`${clusterLabel}에는 pillar 글이 정확히 1개여야 합니다.`);
    const pillar = pillars[0];
    const needles = guide && pillar ? destinationTerms(cluster, guide, pillar) : [];

    cluster.articles.forEach((article, articleIndex) => {
      const label = `${clusterLabel}.articles[${articleIndex}]`;
      if (!isPlainObject(article)) {
        errors.push(`${label}는 객체여야 합니다.`);
        return;
      }
      if (!nonEmptyString(article.slug) || seenSlugs.has(article.slug)) errors.push(`${label}.slug가 없거나 중복되었습니다.`);
      seenSlugs.add(article.slug);
      if (!['pillar', 'support'].includes(article.role)) errors.push(`${label}.role은 pillar 또는 support여야 합니다.`);
      if (article.role === 'support' && !SUPPORT_STATUSES.has(article.status)) errors.push(`${label}.status가 올바르지 않습니다.`);
      if (article.role === 'pillar' && !['staged', 'published'].includes(article.status)) errors.push(`${label}.status는 staged 또는 published여야 합니다.`);
      if (!nonEmptyString(article.primaryQuery) || seenQueries.has(article.primaryQuery)) {
        errors.push(`${label}.primaryQuery가 없거나 다른 글과 중복되었습니다.`);
      }
      seenQueries.add(article.primaryQuery);
      if (!uniqueStrings(article.secondaryQueries) || article.secondaryQueries.length < 2) {
        errors.push(`${label}.secondaryQueries는 서로 다른 검색어 2개 이상이어야 합니다.`);
      }
      for (const query of [article.primaryQuery, ...(article.secondaryQueries ?? [])].filter(nonEmptyString)) {
        const owner = queryOwners.get(query);
        if (owner && owner !== article.slug) {
          errors.push(`${label}의 검색어 '${query}'는 '${owner}' 글이 이미 소유합니다.`);
        } else {
          queryOwners.set(query, article.slug);
        }
      }
      if (!nonEmptyString(article.title)
        || [...String(article.title ?? '')].length > guardrails.maximumTitleLength
        || seenTitles.has(article.title)) {
        errors.push(`${label}.title이 없거나 중복되었거나 ${guardrails.maximumTitleLength}자를 넘었습니다.`);
      }
      seenTitles.add(article.title);
      if (!nonEmptyString(article.question) || seenQuestions.has(article.question)) {
        errors.push(`${label}.question이 없거나 다른 글과 중복되었습니다.`);
      }
      seenQuestions.add(article.question);
      if (PRODUCT_FIRST_RE.test(`${article.title ?? ''}\n${article.question ?? ''}`)) {
        errors.push(`${label}의 제목·질문이 여행지 정보보다 상품·예약을 앞세웁니다.`);
      }
      if (needles.length > 0 && !needles.some((term) => article.primaryQuery.includes(term))) {
        errors.push(`${label}.primaryQuery가 여행지 한정어(${needles.join(', ')})와 연결되지 않습니다.`);
      }
      if (!uniqueStrings(article.sourceGuideSections)
        || article.sourceGuideSections.some((section) => !guide?.sections?.some((candidate) => candidate.id === section))) {
        errors.push(`${label}.sourceGuideSections가 여행 정보 원본과 맞지 않습니다.`);
      }
      if (article.status === 'published' && !registrySlugs.has(article.slug)) {
        errors.push(`${label}는 published지만 공개 URL 검증 기록이 없습니다.`);
      }
      if (article.role === 'support' && registrySlugs.has(article.slug) && article.status !== 'published') {
        errors.push(`${label}는 공개 URL이 기록됐지만 status가 published가 아닙니다.`);
      }
      if (article.role === 'support') {
        if (!nonEmptyString(article.publishGate)) errors.push(`${label}.publishGate가 필요합니다.`);
        validateSupportEvidence(article, guardrails, label, errors);
      }
    });

    if (pillar && guide) {
      if (pillar.slug !== cluster.destinationSlug) errors.push(`${clusterLabel}의 pillar slug가 destinationSlug와 다릅니다.`);
      if (pillar.title !== guide.title) errors.push(`${clusterLabel}의 pillar title이 travel-guides.json과 다릅니다.`);
      if (pillar.primaryQuery !== guide.searchIntent?.primaryQuery) {
        errors.push(`${clusterLabel}의 pillar primaryQuery가 travel-guides.json과 다릅니다.`);
      }
      if (!hasSet(pillar.sourceGuideSections, REQUIRED_GUIDE_SECTIONS)) {
        errors.push(`${clusterLabel}의 pillar는 실용 여행 정보 5구간을 모두 포함해야 합니다.`);
      }
      for (const term of guide.searchIntent?.disambiguationTerms ?? []) {
        if (!pillar.title.includes(term) || !pillar.primaryQuery.includes(term)) {
          errors.push(`${clusterLabel}의 pillar 제목·대표 검색어에 동명 여행지 구분어 '${term}'이 필요합니다.`);
        }
      }
    }
  });

  const measurement = plan.measurement;
  if (!isPlainObject(measurement)) {
    errors.push('measurement가 필요합니다.');
  } else {
    if (!hasSet(measurement.checkpoints, REQUIRED_CHECKPOINTS)) errors.push('measurement.checkpoints에 D+3·D+7·D+28이 필요합니다.');
    if (!hasSet(measurement.metrics, REQUIRED_METRICS)) errors.push('measurement.metrics에 공개·검색·유입·클릭 지표가 모두 필요합니다.');
    if (!uniqueStrings(measurement.rules)
      || !measurement.rules.some((rule) => rule.includes('집계'))
      || !measurement.rules.some((rule) => rule.includes('개인정보'))
      || !measurement.rules.some((rule) => rule.includes('발행량'))) {
      errors.push('measurement.rules에 집계 전용·개인정보 금지·미노출 시 발행량 유지 원칙이 필요합니다.');
    }
  }
  return errors;
}

export function validateObservations(payload, { plan, registry }) {
  const errors = [];
  if (!isPlainObject(payload)) return ['관측 기록 루트는 객체여야 합니다.'];
  const rootExtraKeys = Object.keys(payload).filter((key) => !OBSERVATION_ROOT_KEYS.has(key));
  if (rootExtraKeys.length > 0) errors.push(`관측 기록 루트에 허용되지 않은 필드가 있습니다: ${rootExtraKeys.join(', ')}`);
  if (payload.schemaVersion !== 1) errors.push('관측 기록 schemaVersion은 1이어야 합니다.');
  if (payload.channel !== CHANNEL) errors.push(`관측 기록 channel은 ${CHANNEL}이어야 합니다.`);
  if (!Array.isArray(payload.observations)) return [...errors, 'observations는 배열이어야 합니다.'];
  const registryErrors = validateRegistry(registry);
  if (registryErrors.length) errors.push(...registryErrors.map((error) => `공개 기록: ${error}`));
  const articles = articleMap(plan);
  const registryBySlug = new Map(registry?.posts?.map((post) => [post.slug, post]) ?? []);
  const seen = new Set();
  payload.observations.forEach((observation, index) => {
    const label = `observations[${index}]`;
    if (!isPlainObject(observation)) {
      errors.push(`${label}는 객체여야 합니다.`);
      return;
    }
    const extraKeys = Object.keys(observation).filter((key) => !OBSERVATION_KEYS.has(key));
    if (extraKeys.length > 0) errors.push(`${label}에 허용되지 않은 필드가 있습니다: ${extraKeys.join(', ')}`);
    if (!articles.has(observation.slug)) errors.push(`${label}.slug가 성장 계획에 없습니다.`);
    const published = registryBySlug.get(observation.slug);
    if (!published) errors.push(`${label}.slug의 공개 URL 검증 기록이 없습니다.`);
    if (!REQUIRED_CHECKPOINTS.has(observation.checkpoint)) errors.push(`${label}.checkpoint가 올바르지 않습니다.`);
    if (!nonEmptyString(observation.observedAt)
      || !observation.observedAt.includes('T')
      || !/(?:Z|[+-]\d{2}:\d{2})$/.test(observation.observedAt)
      || Number.isNaN(Date.parse(observation.observedAt))) {
      errors.push(`${label}.observedAt은 시간대가 포함된 ISO 시각이어야 합니다.`);
    }
    const checkpointDays = CHECKPOINT_DAYS.get(observation.checkpoint);
    const publishedAt = Date.parse(published?.verifiedAt ?? '');
    const observedAt = Date.parse(observation.observedAt ?? '');
    if (published && checkpointDays !== undefined && Number.isFinite(publishedAt) && Number.isFinite(observedAt)
      && observedAt < publishedAt + checkpointDays * 24 * 60 * 60 * 1000) {
      errors.push(`${label}는 공개 검증 뒤 ${checkpointDays}일이 지나기 전에 ${observation.checkpoint}로 기록할 수 없습니다.`);
    }
    if (observation.publicUrlVerified !== true) errors.push(`${label}.publicUrlVerified는 true여야 합니다.`);
    if (typeof observation.targetQueryFound !== 'boolean') errors.push(`${label}.targetQueryFound는 boolean이어야 합니다.`);
    if (observation.rankBand !== undefined && !RANK_BANDS.has(observation.rankBand)) {
      errors.push(`${label}.rankBand가 올바르지 않습니다.`);
    }
    if (observation.targetQueryFound === false && observation.rankBand && observation.rankBand !== 'not-found') {
      errors.push(`${label}.targetQueryFound=false일 때 rankBand는 not-found여야 합니다.`);
    }
    if (observation.targetQueryFound === true && observation.rankBand === 'not-found') {
      errors.push(`${label}.targetQueryFound=true일 때 rankBand는 not-found일 수 없습니다.`);
    }
    for (const metric of ['postViews', 'searchInflows', 'foresttourClicks']) {
      if (observation[metric] !== undefined
        && (!Number.isInteger(observation[metric]) || observation[metric] < 0)) {
        errors.push(`${label}.${metric}는 0 이상의 정수여야 합니다.`);
      }
    }
    const key = `${observation.slug}:${observation.checkpoint}`;
    if (seen.has(key)) errors.push(`${label}의 slug+checkpoint가 중복되었습니다.`);
    seen.add(key);
  });
  return errors;
}

export function createObservation(input, { plan, registry }) {
  const targetQueryFound = input.targetQueryFound;
  const observation = {
    slug: input.slug,
    checkpoint: input.checkpoint,
    observedAt: input.observedAt,
    publicUrlVerified: true,
    targetQueryFound,
    ...(input.rankBand ? { rankBand: input.rankBand } : {}),
    ...(input.postViews !== undefined ? { postViews: input.postViews } : {}),
    ...(input.searchInflows !== undefined ? { searchInflows: input.searchInflows } : {}),
    ...(input.foresttourClicks !== undefined ? { foresttourClicks: input.foresttourClicks } : {}),
  };
  const probe = { schemaVersion: 1, channel: CHANNEL, observations: [observation] };
  const errors = validateObservations(probe, { plan, registry });
  if (errors.length) throw new Error(`검색 관측값 검증 실패:\n- ${errors.join('\n- ')}`);
  return observation;
}

export function renderGrowthReport(plan, observations, registry) {
  const lines = ['네이버 검색 유입 운영 보고'];
  for (const cluster of plan.clusters) {
    const pillar = cluster.articles.find((article) => article.role === 'pillar');
    const publicPost = registry.posts.find((post) => post.slug === pillar.slug);
    const supports = cluster.articles.filter((article) => article.role === 'support');
    lines.push(`- ${cluster.id}: 대표 검색어 '${pillar.primaryQuery}'`);
    lines.push(`  기둥 글: ${publicPost ? '공개 URL 검증 완료' : `${pillar.status} · 공개 미확인`}`);
    lines.push(`  상대 검색량: ${cluster.searchEvidence.demandStatus === 'relative-volume-unverified' ? '미확인' : cluster.searchEvidence.demandStatus}`);
    lines.push(`  지원 글: ${supports.filter((article) => article.status === 'research-required').length}/${supports.length}편 추가 조사 필요`);
    const draftReady = supports.filter((article) => article.status === 'draft-ready').length;
    if (draftReady > 0) lines.push(`  로컬 초안: ${draftReady}편 준비 완료 · 기둥 글 공개 전 발행 차단`);
  }
  if (observations.observations.length === 0) lines.push('- 성과 관측: 공개 전이라 기록 없음');
  for (const observation of observations.observations) {
    lines.push(`- ${observation.slug} ${observation.checkpoint}: 목표 검색어 ${observation.targetQueryFound ? '발견' : '미발견'}${observation.rankBand ? ` · ${observation.rankBand}` : ''}`);
    if (observation.checkpoint === 'D+7' && observation.targetQueryFound === false) {
      lines.push('  조치: 발행량을 늘리지 않고 제목·첫 문단·블로그 주제 설정을 먼저 진단');
    }
  }
  const unpublishedPillar = plan.clusters.some((cluster) => {
    const pillar = cluster.articles.find((article) => article.role === 'pillar');
    return !registry.posts.some((post) => post.slug === pillar.slug);
  });
  lines.push(unpublishedPillar
    ? '- 다음 우선순위: 기둥 글을 사람 검수로 공개한 뒤 URL을 검증하고 D+3·D+7·D+28을 기록'
    : '- 다음 우선순위: 예정된 체크포인트를 기록하고 성과가 확인된 질문만 확장');
  return lines.join('\n');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(resolve(filePath), 'utf8'));
}

async function loadState(args) {
  const paths = {
    plan: args.get('--plan') || DEFAULT_PLAN_PATH,
    observations: args.get('--observations') || DEFAULT_OBSERVATIONS_PATH,
    stories: args.get('--stories') || DEFAULT_STORIES_PATH,
    guides: args.get('--guides') || DEFAULT_GUIDES_PATH,
    registry: args.get('--registry') || DEFAULT_REGISTRY_PATH,
  };
  const [plan, observations, stories, guides, registry] = await Promise.all([
    readJson(paths.plan),
    readJson(paths.observations),
    readJson(paths.stories),
    readJson(paths.guides),
    readJson(paths.registry),
  ]);
  return { paths, plan, observations, stories, guides, registry };
}

function assertValidState(state) {
  const planErrors = validateGrowthPlan(state.plan, state);
  if (planErrors.length) throw new Error(`네이버 성장 계획 검증 실패:\n- ${planErrors.join('\n- ')}`);
  const observationErrors = validateObservations(state.observations, state);
  if (observationErrors.length) throw new Error(`네이버 검색 관측 기록 검증 실패:\n- ${observationErrors.join('\n- ')}`);
}

function requiredArg(args, key) {
  const value = args.get(key);
  if (!nonEmptyString(value)) throw new Error(`${key}=... 값이 필요합니다.`);
  return value;
}

function parseBoolean(value, key) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${key}는 true 또는 false여야 합니다.`);
}

function parseOptionalCount(args, key) {
  if (!args.has(key)) return undefined;
  const value = Number(args.get(key));
  if (!Number.isInteger(value) || value < 0) throw new Error(`${key}는 0 이상의 정수여야 합니다.`);
  return value;
}

async function validateCommand(args) {
  const state = await loadState(args);
  assertValidState(state);
  console.log(`✓ 네이버 검색 유입 계획 검증 통과 · 클러스터 ${state.plan.clusters.length}개 · 관측 ${state.observations.observations.length}건`);
}

async function reportCommand(args) {
  const state = await loadState(args);
  assertValidState(state);
  console.log(renderGrowthReport(state.plan, state.observations, state.registry));
}

async function recordCommand(args) {
  const state = await loadState(args);
  assertValidState(state);
  const observation = createObservation({
    slug: requiredArg(args, '--slug'),
    checkpoint: requiredArg(args, '--checkpoint'),
    observedAt: requiredArg(args, '--observed-at'),
    targetQueryFound: parseBoolean(requiredArg(args, '--target-query-found'), '--target-query-found'),
    rankBand: args.get('--rank-band'),
    postViews: parseOptionalCount(args, '--post-views'),
    searchInflows: parseOptionalCount(args, '--search-inflows'),
    foresttourClicks: parseOptionalCount(args, '--foresttour-clicks'),
  }, state);
  const existing = state.observations.observations.find(
    (item) => item.slug === observation.slug && item.checkpoint === observation.checkpoint,
  );
  if (existing) {
    if (JSON.stringify(existing) === JSON.stringify(observation)) {
      console.log('✓ 동일한 검색 관측 기록이 이미 있습니다.');
      return;
    }
    throw new Error(`${observation.slug} ${observation.checkpoint}의 다른 관측 기록이 이미 있습니다. 자동 교체하지 않습니다.`);
  }
  if (!args.has('--record')) {
    console.log(JSON.stringify(observation, null, 2));
    console.log('기록 파일은 바꾸지 않았습니다. 저장하려면 --record를 명시하세요.');
    return;
  }
  const next = {
    ...state.observations,
    observations: [...state.observations.observations, observation],
  };
  const errors = validateObservations(next, state);
  if (errors.length) throw new Error(`새 검색 관측 기록 검증 실패:\n- ${errors.join('\n- ')}`);
  await writeFile(resolve(state.paths.observations), `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  console.log(`✓ 검색 관측 기록 저장 · ${observation.slug} ${observation.checkpoint}`);
}

async function main() {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));
  if (command === 'validate') return validateCommand(args);
  if (command === 'report') return reportCommand(args);
  if (command === 'record') return recordCommand(args);
  throw new Error(
    '사용법:\n'
    + '  node tools/naver-blog-growth.mjs validate\n'
    + '  node tools/naver-blog-growth.mjs report\n'
    + '  node tools/naver-blog-growth.mjs record --slug=sado --checkpoint=D+3 --observed-at=... --target-query-found=true|false [--rank-band=1-3] [--record]',
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
