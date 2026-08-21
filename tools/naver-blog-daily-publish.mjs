#!/usr/bin/env node

// 큐에 승인된 글만 하루 최대 1편 발행하는 네이버 블로그 루틴입니다.
// 기본 동작은 드라이런이며, 실제 브라우저 조작은 --publish가 있을 때만 합니다.

import { appendFile, access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const DEFAULT_QUEUE = resolve(REPO_ROOT, 'naver-blog/publish-queue.json');
const DEFAULT_REGISTRY = resolve(REPO_ROOT, 'naver-blog/published.json');
const DEFAULT_LOG = resolve(REPO_ROOT, '_stage/naver-blog/daily-publish.log');
const DEFAULT_LOCK = resolve(REPO_ROOT, '_stage/naver-blog/daily-publish.lock');
const BLOG_ORIGIN = 'https://blog.naver.com';
const TIMEZONE = 'Asia/Seoul';
const MAX_POSTS_PER_24H = 1;
const FORBIDDEN_META_RE = /작성자가\s*새로\s*다녀온\s*후기|실제\s*여행\s*장면을\s*다시\s*엮은\s*기록|메모가\s*남아\s*있어요|공식\s*자료로\s*정리합니다|카페\s*모객글\s*:/i;
// 제목·본문이 모두 해요체여야 합니다. `갑니다`, `입니다`, `됩니다`처럼
// `습니다/합니다`만으로 잡히지 않는 대표적인 합쇼체 종결도 포함합니다.
const FORMAL_RE = /(?:습니다|합니다|입니다|됩니다|갑니다|ㅂ니다)(?=\s|[.!?,]|$)/m;

export function containsFormalEnding(value) {
  return FORMAL_RE.test(String(value ?? ''));
}

export function containsForbiddenMeta(value) {
  return FORBIDDEN_META_RE.test(String(value ?? ''));
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
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

export async function readJson(filePath) {
  return JSON.parse(await readFile(resolve(filePath), 'utf8'));
}

export function parseIso(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function validateQueue(queue) {
  const errors = [];
  if (!isObject(queue)) return ['큐 루트는 객체여야 합니다.'];
  if (queue.schemaVersion !== 1) errors.push('queue.schemaVersion은 1이어야 합니다.');
  if (queue.channel !== 'naver-blog') errors.push('queue.channel은 naver-blog여야 합니다.');
  if (queue.timezone !== TIMEZONE) errors.push(`queue.timezone은 ${TIMEZONE}이어야 합니다.`);
  if (!isObject(queue.schedule)) errors.push('queue.schedule이 필요합니다.');
  else {
    if (!/^\d{2}:\d{2}$/.test(String(queue.schedule.localTime ?? ''))) errors.push('schedule.localTime은 HH:MM이어야 합니다.');
    if (queue.schedule.maxPostsPer24h !== MAX_POSTS_PER_24H) errors.push('schedule.maxPostsPer24h는 1이어야 합니다.');
    if (queue.schedule.failClosed !== true) errors.push('schedule.failClosed는 true여야 합니다.');
  }
  if (!Array.isArray(queue.entries)) return [...errors, 'queue.entries는 배열이어야 합니다.'];
  const keys = new Set();
  queue.entries.forEach((entry, index) => {
    const label = `entries[${index}]`;
    if (!isObject(entry)) {
      errors.push(`${label}는 객체여야 합니다.`);
      return;
    }
    if (!nonEmptyString(entry.idempotencyKey)) errors.push(`${label}.idempotencyKey가 필요합니다.`);
    else if (keys.has(entry.idempotencyKey)) errors.push(`${label}.idempotencyKey가 중복됩니다.`);
    else keys.add(entry.idempotencyKey);
    if (!['approved', 'published', 'blocked', 'manual-review-required'].includes(entry.status)) {
      errors.push(`${label}.status가 올바르지 않습니다.`);
    }
    if (!nonEmptyString(entry.slug)) errors.push(`${label}.slug가 필요합니다.`);
    if (!nonEmptyString(entry.publishAfter) || parseIso(entry.publishAfter) === null) errors.push(`${label}.publishAfter가 ISO 날짜가 아닙니다.`);
    if (!nonEmptyString(entry.contentFile)) errors.push(`${label}.contentFile이 필요합니다.`);
    if (!/^[A-Za-z0-9._-]+$/.test(String(entry.blogId ?? ''))) errors.push(`${label}.blogId가 필요합니다.`);
    if (entry.status !== 'approved') return;
    if (!/^[a-f0-9]{64}$/.test(String(entry.contentDigest ?? ''))) errors.push(`${label}.contentDigest가 필요합니다.`);
    if (!/^[a-f0-9]{64}$/.test(String(entry.reviewedContentDigest ?? '')) || entry.reviewedContentDigest !== entry.contentDigest) {
      errors.push(`${label}.reviewedContentDigest가 contentDigest와 일치해야 합니다.`);
    }
    if (!Array.isArray(entry.imageSha256) || entry.imageSha256.length === 0 || entry.imageSha256.some((value) => !/^[a-f0-9]{64}$/.test(String(value)))) {
      errors.push(`${label}.imageSha256에 사진 SHA-256 목록이 필요합니다.`);
    }
    for (const reviewer of ['solHigh', 'terraHigh', 'lunaHigh']) {
      if (entry.reviewers?.[reviewer] !== 'PASS') errors.push(`${label}.reviewers.${reviewer}는 PASS여야 합니다.`);
    }
    const requiredGates = [
      'sourceAndPhotoRights',
      'factsAndDuplicate',
      'solHumanWriting',
      'terraContent',
      'lunaContent',
      'productRoute',
      'imageTextDomOrder',
    ];
    for (const gate of requiredGates) {
      if (entry.gates?.[gate] !== 'PASS') errors.push(`${label}.gates.${gate}는 PASS여야 합니다.`);
    }
  });
  return errors;
}

function registryHasRecentPublish(registry, now, hours = 24) {
  const cutoff = now - hours * 60 * 60 * 1000;
  return (registry?.posts ?? []).some((post) => {
    const timestamp = parseIso(post.verifiedAt || post.publishedAt);
    return timestamp !== null && timestamp > cutoff;
  });
}

export function selectDueEntry(queue, registry, now = Date.now()) {
  const publishedKeys = new Set((registry?.posts ?? []).map((post) => post.idempotencyKey));
  const due = queue.entries.find((entry) => (
    entry.status === 'approved'
    && parseIso(entry.publishAfter) <= now
    && !publishedKeys.has(entry.idempotencyKey)
  ));
  if (!due) return { entry: null, reason: '발행 시각이 된 승인 큐가 없습니다.' };
  if (registryHasRecentPublish(registry, now, 24)) {
    return { entry: null, reason: '24시간 발행 상한이 아직 지나지 않았습니다.' };
  }
  return { entry: due, reason: '' };
}

export async function assertReadable(filePath) {
  await access(filePath, constants.R_OK);
  return filePath;
}

function safeRepoPath(filePath) {
  const candidate = isAbsolute(filePath) ? resolve(filePath) : resolve(REPO_ROOT, filePath);
  const relativePath = relative(REPO_ROOT, candidate);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error(`콘텐츠 파일은 저장소 안에 있어야 합니다: ${filePath}`);
  }
  return candidate;
}

function canonicalContent(content) {
  return {
    title: content.title,
    tags: content.tags,
    images: content.images.map((image) => ({
      path: relative(REPO_ROOT, image.path).replaceAll('\\', '/'),
      alt: image.alt || '',
    })),
    texts: content.texts,
    endBlocks: content.endBlocks || [],
    ctaUrl: content.ctaUrl || '',
  };
}

export function contentDigest(content) {
  return createHash('sha256').update(JSON.stringify(canonicalContent(content))).digest('hex');
}

async function fileDigest(filePath) {
  return createHash('sha256').update(await readFile(filePath)).digest('hex');
}

export async function loadContent(entry) {
  const contentPath = safeRepoPath(entry.contentFile);
  await assertReadable(contentPath);
  const content = await readJson(contentPath);
  const errors = [];
  if (!nonEmptyString(content.title) || content.title.length > 40) errors.push('title은 1~40자여야 합니다.');
  if (!Array.isArray(content.images) || content.images.length === 0) errors.push('images가 필요합니다.');
  if (!Array.isArray(content.texts) || content.texts.length !== content.images?.length) errors.push('images와 texts는 같은 개수여야 합니다.');
  if (!Array.isArray(content.tags) || content.tags.length < 3 || content.tags.length > 10) errors.push('tags는 3~10개여야 합니다.');
  if (!Array.isArray(content.endBlocks || [])) errors.push('endBlocks는 배열이어야 합니다.');
  if (containsFormalEnding(JSON.stringify(content.texts ?? [])) || containsFormalEnding(JSON.stringify(content.endBlocks ?? [])) || containsForbiddenMeta(JSON.stringify(content))) {
    errors.push('해요체·메타 문장 게이트를 통과하지 못했습니다.');
  }
  if (content.publicUrl && !/^https:\/\/blog\.naver\.com\/[A-Za-z0-9._-]+\/\d+$/.test(content.publicUrl)) {
    errors.push('publicUrl 형식이 올바르지 않습니다.');
  }
  for (const [index, image] of (content.images ?? []).entries()) {
    const imagePath = safeRepoPath(typeof image === 'string' ? image : image?.path);
    try {
      await assertReadable(imagePath);
    } catch {
      errors.push(`images[${index}] 파일을 읽을 수 없습니다: ${imagePath}`);
    }
  }
  if (errors.length) throw new Error(`콘텐츠 게이트 실패:\n- ${errors.join('\n- ')}`);
  const normalized = {
    ...content,
    images: content.images.map((image) => ({
      path: safeRepoPath(typeof image === 'string' ? image : image.path),
      alt: typeof image === 'string' ? '' : String(image.alt ?? ''),
    })),
    texts: content.texts.map((text) => (typeof text === 'string' ? { text } : text)),
    endBlocks: (content.endBlocks || []).map((text) => (typeof text === 'string' ? { text } : text)),
  };
  if (entry.contentDigest !== contentDigest(normalized)) {
    throw new Error(`CONTENT_DIGEST_MISMATCH: expected ${entry.contentDigest}, got ${contentDigest(normalized)}`);
  }
  const actualImageDigests = await Promise.all(normalized.images.map((image) => fileDigest(image.path)));
  if (entry.imageSha256.length !== actualImageDigests.length || entry.imageSha256.some((expected, index) => expected !== actualImageDigests[index])) {
    throw new Error(`IMAGE_SHA256_MISMATCH: expected ${JSON.stringify(entry.imageSha256)}, got ${JSON.stringify(actualImageDigests)}`);
  }
  return normalized;
}

function browserPrefix(args, publicSession = false) {
  const session = publicSession
    ? (args.get('--public-session') || 'naver-blog-public-verify')
    : (args.get('--session') || process.env.NAVER_BLOG_DAILY_SESSION || 'naver-blog-wsl');
  const profile = publicSession
    ? (args.get('--public-profile') || resolve(homedir(), '.agent-browser/profiles/naver-blog-public'))
    : (args.get('--profile') || process.env.NAVER_BLOG_BROWSER_PROFILE || resolve(homedir(), '.agent-browser/profiles/naver-blog'));
  return ['--session', session, '--profile', profile, '--headed', 'false'];
}

function runBrowser(prefix, args, input) {
  const result = spawnSync('agent-browser', [...prefix, ...args], {
    encoding: 'utf8',
    input,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').trim();
    throw new Error(`agent-browser 실패: ${detail}`);
  }
  return String(result.stdout || '').trim();
}

function postwriteUrl(blogId) {
  return `${BLOG_ORIGIN}/${blogId}/postwrite`;
}

function loginError(url) {
  if (String(url).includes('nid.naver.com/nidlogin')) {
    return new Error('LOGIN_REQUIRED: 네이버 WSL headless 프로필의 세션이 만료되었습니다.');
  }
  return null;
}

function browserEval(prefix, source) {
  return JSON.parse(runBrowser(prefix, ['eval', '--stdin'], source));
}

function contentScript(content) {
  const payload = JSON.stringify({ title: content.title, texts: content.texts, endBlocks: content.endBlocks || [] });
  return `(() => {
    const payload = ${payload};
    const ds = window.SE?.launcher?._editors?.blogpc001?._documentService;
    if (!ds) throw new Error('SMARTEDITOR_SERVICE_NOT_FOUND');
    const data = ds.getDocumentData();
    const documentData = data.document || data;
    const components = Array.isArray(documentData.components) ? documentData.components : [];
    const typeOf = (component) => component?.['@ctype'] || component?.component?.['@ctype'] || '';
    const textNode = (value) => ({ id: 'SE-' + crypto.randomUUID(), value: String(value ?? ''), '@ctype': 'textNode' });
    const paragraph = (item) => {
      const value = typeof item === 'string' ? { text: item } : item || {};
      const nodes = [textNode(value.text)];
      if (value.link && value.link.url) nodes.push({ id: 'SE-' + crypto.randomUUID(), value: String(value.link.label || value.link.url), link: { url: String(value.link.url), '@ctype': 'urlLink' }, '@ctype': 'textNode' });
      return { nodes, '@ctype': 'paragraph' };
    };
    const makeText = (item) => ({ id: 'SE-' + crypto.randomUUID(), layout: 'default', value: [paragraph(item)], '@ctype': 'text' });
    const titleComponent = components.find((component) => typeOf(component) === 'documentTitle');
    const images = components.filter((component) => typeOf(component) === 'image');
    if (!titleComponent) throw new Error('DOCUMENT_TITLE_NOT_FOUND');
    if (images.length !== payload.texts.length) throw new Error('IMAGE_COUNT_MISMATCH:' + images.length + '/' + payload.texts.length);
    titleComponent.value = [{ nodes: [textNode(payload.title)], '@ctype': 'paragraph' }];
    documentData.components = [titleComponent, ...images.flatMap((image, index) => [image, makeText(payload.texts[index])]), ...payload.endBlocks.map(makeText)];
    ds.setDocumentData(data);
    return JSON.stringify({ title: payload.title, images: images.length, texts: payload.texts.length + payload.endBlocks.length, sequence: documentData.components.slice(1).map(typeOf) });
  })()`;
}

export function publicVerifyScript(expected) {
  const expectedTexts = [...expected.texts, ...(expected.endBlocks || [])];
  const payload = JSON.stringify({
    title: expected.title,
    texts: expectedTexts.map((item) => (typeof item === 'string' ? item : item.text)),
    imageCount: expected.images.length,
    textCount: expectedTexts.length,
    ctaUrl: expected.ctaUrl || '',
  });
  return `(() => {
    const expected = ${payload};
    const root = document.querySelector('#mainFrame')?.contentDocument || document;
    const components = [...root.querySelectorAll('.se-component')];
    const typeOf = (element) => element.classList.contains('se-image') ? 'image' : element.classList.contains('se-text') ? 'text' : element.classList.contains('se-documentTitle') ? 'documentTitle' : '';
    const sequence = components.map(typeOf).filter(Boolean);
    const body = root.body?.innerText || document.body?.innerText || '';
    const links = [...root.querySelectorAll('a[href]'), ...document.querySelectorAll('a[href]')].map((a) => a.href);
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const renderedTitle = normalize(root.querySelector('.se-documentTitle')?.innerText || document.title.split(' :')[0]);
    const renderedTexts = [...root.querySelectorAll('.se-component.se-text .se-text-paragraph')].map((node) => normalize(node.innerText));
    const titleMatches = renderedTitle === normalize(expected.title) || document.title.startsWith(expected.title);
    const textsMatch = renderedTexts.length === expected.texts.length && renderedTexts.every((value, index) => value === normalize(expected.texts[index]));
    const anonymous = Boolean([...root.querySelectorAll('a[href]'), ...document.querySelectorAll('a[href]')].find((a) => /nidlogin|login/i.test(a.href)));
    return JSON.stringify({
      title: renderedTitle,
      sequence,
      images: root.querySelectorAll('.se-component.se-image').length,
      texts: root.querySelectorAll('.se-component.se-text').length,
      titleMatches,
      textsMatch,
      anonymous,
      formal: /(?:습니다|합니다|입니다|됩니다|갑니다|ㅂ니다)(?=\\s|[.!?,]|$)/m.test(body),
      forbidden: /작성자가\\s*새로\\s*다녀온\\s*후기|실제\\s*여행\\s*장면을\\s*다시\\s*엮은\\s*기록|메모가\\s*남아\\s*있어요|공식\\s*자료로\\s*정리합니다/i.test(body),
      ctaFound: expected.ctaUrl ? links.includes(expected.ctaUrl) : true,
      expected
    });
  })()`;
}

export function expectedPublicUrl(entry, actualUrl) {
  const parsed = String(actualUrl).match(/^https:\/\/blog\.naver\.com\/([A-Za-z0-9._-]+)\/(\d+)$/);
  return parsed && parsed[1] === entry.blogId ? parsed[0] : '';
}

async function openAndStage(entry, content, args) {
  const prefix = browserPrefix(args);
  runBrowser(prefix, ['open', postwriteUrl(entry.blogId)]);
  runBrowser(prefix, ['wait', '1800']);
  const currentUrl = runBrowser(prefix, ['get', 'url']);
  const login = loginError(currentUrl);
  if (login) throw login;
  if (!currentUrl.includes('/postwrite')) throw new Error(`SMARTEDITOR_OPEN_FAILED: ${currentUrl}`);

  runBrowser(prefix, ['click', 'button[data-name="image"]']);
  runBrowser(prefix, ['wait', '#hidden-file']);
  runBrowser(prefix, ['upload', '#hidden-file', ...content.images.map((image) => image.path)]);
  runBrowser(prefix, ['wait', '1800']);
  try {
    runBrowser(prefix, ['find', 'text', '개별사진', 'click']);
  } catch {
    // UI가 한 장 업로드를 이미 개별 사진으로 처리한 경우에는 계속합니다.
  }
  runBrowser(prefix, ['wait', '1200']);
  const staged = browserEval(prefix, contentScript(content));
  const expectedSequence = [...content.images.flatMap(() => ['image', 'text']), ...(content.endBlocks || []).map(() => 'text')];
  if (staged.images !== content.images.length || staged.texts !== content.texts.length + (content.endBlocks || []).length
      || JSON.stringify(staged.sequence) !== JSON.stringify(expectedSequence)) {
    throw new Error(`IMAGE_TEXT_DOM_GATE_FAILED: ${JSON.stringify(staged)}`);
  }
  return { prefix, staged };
}

export function validatePublishSettingsSnapshot(snapshot) {
  const errors = [];
  if (!snapshot?.publicSelected) errors.push('전체공개 선택 상태를 확인하지 못했습니다.');
  if (!snapshot?.searchSelected) errors.push('검색허용 선택 상태를 확인하지 못했습니다.');
  return errors;
}

function clickPublishAndVerifySettings(prefix) {
  runBrowser(prefix, ['find', 'text', '발행', 'click']);
  runBrowser(prefix, ['wait', '1000']);
  const settings = browserEval(prefix, `(() => {
    const nodes = [...document.querySelectorAll('input,button,label,[role="radio"],[role="checkbox"],[aria-checked]')];
    const selected = (node) => Boolean(node.checked)
      || node.getAttribute('aria-checked') === 'true'
      || node.getAttribute('data-selected') === 'true'
      || /\\bon\\b|\\bselected\\b|\\bactive\\b/.test(node.className || '');
    const matching = (term) => nodes.filter((node) => (node.innerText || node.getAttribute('aria-label') || node.getAttribute('value') || '').includes(term));
    return JSON.stringify({
      body: document.body?.innerText || '',
      publicSelected: matching('전체공개').some(selected),
      searchSelected: matching('검색허용').some(selected),
      publicFound: matching('전체공개').length > 0,
      searchFound: matching('검색허용').length > 0
    });
  })()`);
  let errors = validatePublishSettingsSnapshot(settings);
  if (errors.length) {
    try { runBrowser(prefix, ['find', 'text', '전체공개', 'click']); } catch { /* fail closed below */ }
    try { runBrowser(prefix, ['find', 'text', '검색허용', 'click']); } catch { /* fail closed below */ }
    const afterClick = browserEval(prefix, `(() => {
      const nodes = [...document.querySelectorAll('input,button,label,[role="radio"],[role="checkbox"],[aria-checked]')];
      const selected = (node) => Boolean(node.checked) || node.getAttribute('aria-checked') === 'true' || node.getAttribute('data-selected') === 'true' || /\\bon\\b|\\bselected\\b|\\bactive\\b/.test(node.className || '');
      const matching = (term) => nodes.filter((node) => (node.innerText || node.getAttribute('aria-label') || node.getAttribute('value') || '').includes(term));
      return JSON.stringify({ publicSelected: matching('전체공개').some(selected), searchSelected: matching('검색허용').some(selected) });
    })()`);
    errors = validatePublishSettingsSnapshot(afterClick);
  }
  if (errors.length) throw new Error(`PUBLISH_SETTINGS_UNCONFIRMED: ${errors.join(' ')}`);
}

function addTags(prefix, tags) {
  if (!tags?.length) return;
  const selector = 'input[placeholder*="태그"], input[aria-label*="태그"], input[name*="tag"], input[id*="tag"]';
  const found = browserEval(prefix, `(() => JSON.stringify({count: document.querySelectorAll(${JSON.stringify(selector)}).length}))()`);
  if (found.count === 0) return;
  const input = selector.split(',')[0];
  for (const tag of tags) {
    try {
      runBrowser(prefix, ['fill', input, tag]);
      runBrowser(prefix, ['press', 'Enter']);
    } catch {
      // 태그 UI가 바뀌면 핵심 본문 게이트를 우회하지 않고 계속하되, 공개 검증에서 제목·본문을 확인합니다.
      break;
    }
  }
}

async function publishEntry(entry, content, args) {
  const { prefix } = await openAndStage(entry, content, args);
  let publishClicked = false;
  try {
    clickPublishAndVerifySettings(prefix);
    addTags(prefix, content.tags);
    runBrowser(prefix, ['find', 'text', '발행', 'click']);
    publishClicked = true;
    runBrowser(prefix, ['wait', '2500']);
    const currentUrl = runBrowser(prefix, ['get', 'url']);
    const publicUrl = expectedPublicUrl(entry, currentUrl);
    if (!publicUrl) throw new Error(`PUBLIC_URL_NOT_FOUND_AFTER_PUBLISH: ${currentUrl}`);
    return { publicUrl, publishClicked };
  } catch (error) {
    error.publishClicked = publishClicked;
    throw error;
  }
}

async function verifyPublic(entry, content, publicUrl, args) {
  const prefix = browserPrefix(args, true);
  runBrowser(prefix, ['open', publicUrl]);
  runBrowser(prefix, ['wait', '--load', 'networkidle']);
  const state = browserEval(prefix, publicVerifyScript(content));
  const expectedSequence = [...content.images.flatMap(() => ['image', 'text']), ...(content.endBlocks || []).map(() => 'text')];
  const ok = state.images === content.images.length
    && state.texts === content.texts.length + (content.endBlocks || []).length
    && state.sequence[0] === 'documentTitle'
    && JSON.stringify(state.sequence.slice(1, expectedSequence.length + 1)) === JSON.stringify(expectedSequence)
    && state.titleMatches === true
    && state.textsMatch === true
    && state.anonymous === true
    && state.formal === false
    && state.forbidden === false
    && state.ctaFound === true;
  if (!ok) throw new Error(`PUBLIC_VERIFY_FAILED: ${JSON.stringify(state)}`);
  return state;
}

async function writeQueue(queuePath, queue) {
  await writeFile(queuePath, `${JSON.stringify(queue, null, 2)}\n`, 'utf8');
}

export function markManualReview(queue, entry, error, attemptedAt = new Date().toISOString()) {
  const entryIndex = queue.entries.findIndex((candidate) => candidate.idempotencyKey === entry.idempotencyKey);
  if (entryIndex === -1) return queue;
  const entries = [...queue.entries];
  entries[entryIndex] = {
    ...entries[entryIndex],
    status: 'manual-review-required',
    lastError: String(error?.message || error),
    attemptedAt,
    ...(error?.publicUrl ? { publicUrl: error.publicUrl } : {}),
  };
  return { ...queue, entries };
}

async function logLine(logPath, line) {
  await mkdir(dirname(logPath), { recursive: true });
  await appendFile(logPath, `${new Date().toISOString()} ${line}\n`, 'utf8');
}

export async function acquireLock(lockPath) {
  await mkdir(dirname(lockPath), { recursive: true });
  try {
    await writeFile(lockPath, `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`, { flag: 'wx' });
  } catch (error) {
    if (error?.code === 'EEXIST') throw new Error(`PUBLISH_LOCKED: 이미 실행 중이거나 이전 실행이 비정상 종료되었습니다: ${lockPath}`);
    throw error;
  }
  return async () => {
    try { await unlink(lockPath); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  };
}

async function runDailyUnlocked({ queuePath = DEFAULT_QUEUE, registryPath = DEFAULT_REGISTRY, logPath = DEFAULT_LOG, publish = false, args = new Map(), now = Date.now() } = {}) {
  const queue = await readJson(queuePath);
  const queueErrors = validateQueue(queue);
  if (queueErrors.length) throw new Error(`발행 큐 검증 실패:\n- ${queueErrors.join('\n- ')}`);
  const registry = await readJson(registryPath);
  const selection = selectDueEntry(queue, registry, now);
  if (!selection.entry) {
    const message = `대기 없음 · ${selection.reason}`;
    console.log(message);
    await logLine(logPath, message);
    return { status: 'noop', reason: selection.reason };
  }
  const entry = selection.entry;
  const content = await loadContent(entry);
  console.log(`대상: ${entry.slug} · ${content.title}`);
  if (!publish) {
    console.log('드라이런: --publish 전에는 브라우저를 열지 않습니다.');
    return { status: 'dry-run', entry };
  }

  const existing = registry.posts.find((post) => post.idempotencyKey === entry.idempotencyKey);
  if (existing) return { status: 'noop', reason: '동일 멱등키가 이미 공개 기록에 있습니다.' };

  let publicPublishStarted = false;
  let publicUrl = '';
  let queueWritten = false;
  try {
    const published = await publishEntry(entry, content, args);
    publicPublishStarted = Boolean(published.publishClicked);
    publicUrl = published.publicUrl;
    try {
      await verifyPublic(entry, content, published.publicUrl, args);
    } catch (error) {
      error.publishClicked = published.publishClicked;
      error.publicUrl = published.publicUrl;
      throw error;
    }
    const parsed = published.publicUrl.match(/^https:\/\/blog\.naver\.com\/([A-Za-z0-9._-]+)\/(\d+)$/);
    const nextRegistry = {
      ...registry,
      posts: [...registry.posts, {
        slug: entry.slug,
        idempotencyKey: entry.idempotencyKey,
        contentDigest: contentDigest(content),
        url: published.publicUrl,
        blogId: parsed[1],
        logNo: parsed[2],
        verifiedAt: new Date().toISOString(),
      }],
    };
    // 공개 검증을 통과한 순간부터는 재발행보다 수동 검토가 안전합니다.
    // 먼저 manual-review 상태를 디스크에 남겨 두고, 두 저장소 갱신이 모두
    // 끝난 뒤 published로 승격해 중간 장애가 승인 상태를 남기지 않게 합니다.
    await writeQueue(queuePath, markManualReview(queue, entry, {
      message: `PUBLIC_VERIFIED_BEFORE_REGISTRY_WRITE: ${published.publicUrl}`,
      publicUrl: published.publicUrl,
    }));
    await writeFile(registryPath, `${JSON.stringify(nextRegistry, null, 2)}\n`, 'utf8');
    const entryIndex = queue.entries.findIndex((candidate) => candidate.idempotencyKey === entry.idempotencyKey);
    queue.entries[entryIndex] = { ...entry, status: 'published', publishedAt: new Date().toISOString(), publicUrl: published.publicUrl };
    await writeQueue(queuePath, queue);
    queueWritten = true;
    const message = `발행·비로그인 검증 완료 · ${published.publicUrl}`;
    console.log(message);
    await logLine(logPath, message);
    return { status: 'published', url: published.publicUrl };
  } catch (error) {
    const publishClicked = publicPublishStarted || Boolean(error.publishClicked);
    if (publishClicked && !queueWritten) {
      if (!error.publicUrl && publicUrl) error.publicUrl = publicUrl;
      try {
        await writeQueue(queuePath, markManualReview(queue, entry, error));
      } catch (queueError) {
        await logLine(logPath, `수동검토 상태 저장 실패 · ${entry.slug} · ${queueError.message}`);
      }
    }
    await logLine(logPath, `실패 · ${entry.slug} · ${error.message}`);
    throw error;
  }
}

export async function runDaily({ lockPath = DEFAULT_LOCK, publish = false, ...options } = {}) {
  const release = publish ? await acquireLock(lockPath) : async () => {};
  try {
    return await runDailyUnlocked({ ...options, publish });
  } finally {
    await release();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const queuePath = resolve(args.get('--queue') || DEFAULT_QUEUE);
  const registryPath = resolve(args.get('--registry') || DEFAULT_REGISTRY);
  const logPath = resolve(args.get('--log') || DEFAULT_LOG);
  const result = await runDaily({
    queuePath,
    registryPath,
    logPath,
    publish: args.has('--publish'),
    args,
  });
  if (result.status === 'published') process.exitCode = 0;
}

const isCli = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isCli) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
