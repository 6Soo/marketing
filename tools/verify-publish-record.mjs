// 게시 실행 기록(publish record) 계약 검증 (2026-07-28).
//
// 배경: 완료 게이트 3 "JPEG·manifest·지문·캡션·permalink가 하나의 실행 기록을 공유한다"가
// 미충족이었다. permalink는 data/activation/에, 지문은 manifest·LOG.md에 흩어져 있었고
// `_publish-result-*.json`은 스테이징 디렉터리(gitignore) 안에서만 만들어져 리포에 0건이었다.
//
// data/publish-records/<experiment>.json이 그 단일 기록이다. 핵심 설계 원칙:
//   · 모르는 값은 지어내지 않는다. null로 두되 gaps[]에 사유를 남겨야 통과한다.
//   · 지문은 하나로 합치지 않는다. 같은 카드에서 나온 서로 다른 스테이징이 서로 다른 지문을
//     갖는 것이 정상이므로, 셋 다 보존하되 "무엇의 해시인지"(covers)를 반드시 붙인다.
//   · 재계산 가능한 지문은 recompute 명세를 갖고, 테스트가 실제로 다시 계산해 대조한다.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const PERMALINK_RE = /^https:\/\/www\.instagram\.com\/p\/[A-Za-z0-9_-]+\/$/;
export const SHA256_RE = /^[a-f0-9]{64}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

// 지문 상태 — 지어낸 값을 막기 위해 출처 강도를 명시적으로 분류한다.
export const FINGERPRINT_STATUSES = new Set([
  'verified-recomputable',      // 리포에 남은 파일로 다시 계산해 일치를 확인함
  'attested-not-recomputable',  // 실행 로그에 기록됐으나 원본 스테이징이 미보존이라 재계산 불가
  'verified-external-artifact', // 리포 밖(공개 자산 브랜치·CI 아티팩트)의 파일로 재계산 가능
]);

function fail(id, message) {
  throw new Error(`[${id}] 실행 기록 계약 위반 — ${message}`);
}

/**
 * 구조 검증. 위반 시 예외.
 * @param {object} record
 * @returns {{experiment: string, fingerprints: number, gaps: number}}
 */
export function verifyPublishRecord(record) {
  const id = record?.experiment || 'unknown';
  if (record?.schemaVersion !== 1) fail(id, 'schemaVersion은 1이어야 합니다.');
  for (const key of ['experiment', 'series', 'seriesPath', 'publishUnit']) {
    if (typeof record[key] !== 'string' || !record[key].trim()) fail(id, `${key}가 없습니다.`);
  }

  const gaps = record.gaps;
  if (!Array.isArray(gaps)) fail(id, 'gaps 배열이 없습니다(모르는 값은 반드시 사유와 함께 기록).');
  for (const gap of gaps) {
    if (typeof gap?.field !== 'string' || !gap.field.trim()) fail(id, 'gaps 항목에 field가 없습니다.');
    if (typeof gap?.reason !== 'string' || gap.reason.trim().length < 5) fail(id, `gaps.${gap?.field}에 사유가 없습니다.`);
  }
  const gapFields = new Set(gaps.map(g => g.field));
  const requireGap = path => { if (!gapFields.has(path)) fail(id, `${path}가 null인데 gaps에 사유가 없습니다.`); };

  // ── 게시 ──
  const publish = record.publish;
  if (!publish || typeof publish !== 'object') fail(id, 'publish 블록이 없습니다.');
  if (!PERMALINK_RE.test(publish.permalink || '')) fail(id, 'publish.permalink가 Instagram 게시물 형식이 아닙니다.');
  if (!ISO_RE.test(publish.observedAt || '')) fail(id, 'publish.observedAt이 ISO8601 UTC가 아닙니다.');
  if (publish.publishedAt === null) requireGap('publish.publishedAt');
  else if (!ISO_RE.test(publish.publishedAt || '')) fail(id, 'publish.publishedAt이 ISO8601 UTC가 아닙니다.');
  for (const key of ['channel', 'account', 'method']) {
    if (typeof publish[key] !== 'string' || !publish[key].trim()) fail(id, `publish.${key}가 없습니다.`);
  }

  // ── 캡션 ──
  const caption = record.caption;
  if (!caption || typeof caption !== 'object') fail(id, 'caption 블록이 없습니다.');
  if (typeof caption.sourcePath !== 'string' || !caption.sourcePath) fail(id, 'caption.sourcePath가 없습니다.');
  if (caption.publishedSha256 === null) requireGap('caption.publishedSha256');
  else if (!SHA256_RE.test(caption.publishedSha256 || '')) fail(id, 'caption.publishedSha256이 SHA-256 64자리가 아닙니다.');
  if (!SHA256_RE.test(caption.sourceSha256 || '')) fail(id, 'caption.sourceSha256이 SHA-256 64자리가 아닙니다.');
  if (typeof caption.sourceChars !== 'number' || caption.sourceChars <= 0) fail(id, 'caption.sourceChars가 없습니다.');

  // ── 자산 ──
  const assets = record.assets;
  if (!assets || typeof assets !== 'object') fail(id, 'assets 블록이 없습니다.');
  if (assets.publishedAssets === null) requireGap('assets.publishedAssets');
  const groups = Array.isArray(assets.groups) ? assets.groups : null;
  if (!groups) fail(id, 'assets.groups 배열이 없습니다.');
  for (const group of groups) {
    if (typeof group?.id !== 'string' || !group.id) fail(id, 'assets.groups 항목에 id가 없습니다.');
    if (typeof group?.role !== 'string' || !group.role) fail(id, `assets.groups.${group?.id}에 role이 없습니다.`);
    if (!Array.isArray(group.files) || group.files.length === 0) fail(id, `assets.groups.${group.id}에 files가 없습니다.`);
  }

  // ── 지문 ──
  const fingerprints = record.fingerprints;
  if (!Array.isArray(fingerprints)) fail(id, 'fingerprints 배열이 없습니다.');
  if (fingerprints.length === 0 && !gapFields.has('fingerprints')) {
    fail(id, '지문이 하나도 없는데 gaps에 사유가 없습니다.');
  }
  const seen = new Set();
  for (const fp of fingerprints) {
    if (typeof fp?.id !== 'string' || !fp.id) fail(id, 'fingerprints 항목에 id가 없습니다.');
    if (seen.has(fp.id)) fail(id, `지문 id '${fp.id}'가 중복됩니다.`);
    seen.add(fp.id);
    if (fp.algorithm !== 'sha256') fail(id, `지문 '${fp.id}'의 algorithm이 sha256이 아닙니다.`);
    if (!SHA256_RE.test(fp.value || '')) fail(id, `지문 '${fp.id}'의 value가 SHA-256 64자리가 아닙니다.`);
    // 셋 이상으로 갈라진 지문을 구분하려면 "무엇의 해시인지"가 반드시 있어야 한다.
    if (typeof fp.covers !== 'string' || fp.covers.trim().length < 5) fail(id, `지문 '${fp.id}'에 covers 라벨이 없습니다.`);
    if (typeof fp.producedBy !== 'string' || !fp.producedBy) fail(id, `지문 '${fp.id}'에 producedBy가 없습니다.`);
    if (!FINGERPRINT_STATUSES.has(fp.status)) fail(id, `지문 '${fp.id}'의 status '${fp.status}'가 허용 목록에 없습니다.`);
    if (fp.status === 'verified-recomputable' && !fp.recompute) {
      fail(id, `지문 '${fp.id}'는 재계산 가능으로 표기됐는데 recompute 명세가 없습니다.`);
    }
    if (fp.recompute) {
      const { dir, captionFile, files } = fp.recompute;
      if (typeof dir !== 'string' || typeof captionFile !== 'string' || !Array.isArray(files) || files.length === 0) {
        fail(id, `지문 '${fp.id}'의 recompute 명세가 불완전합니다(dir·captionFile·files).`);
      }
    }
  }

  return { experiment: id, fingerprints: fingerprints.length, gaps: gaps.length };
}

/**
 * daily-publish.mjs와 동일한 방식으로 지문을 다시 계산한다.
 * sha256(캡션 바이트 + 각 파일 바이트, files 순서대로).
 */
export function recomputeFingerprint(spec, root) {
  const dir = join(root, spec.dir);
  const hash = createHash('sha256').update(readFileSync(join(dir, spec.captionFile)));
  for (const file of spec.files) hash.update(readFileSync(join(dir, file)));
  return hash.digest('hex');
}
