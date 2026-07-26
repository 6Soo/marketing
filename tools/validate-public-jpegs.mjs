// Instagram 게시 전 공개 JPEG 전수 검증.
// 로컬 스테이징 파일과 공개 URL의 바이트가 모두 JPEG이며 동일한지 확인한다.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name) =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const dirArg = opt('dir');
const baseUrl = (opt('base-url') || '').replace(/\/$/, '');

if (!dirArg || !baseUrl) {
  throw new Error(
    '사용법: validate-public-jpegs.mjs --dir=<스테이징 폴더> --base-url=<공개 URL>',
  );
}

const directory = resolve(dirArg);
const files = readdirSync(directory)
  .filter((file) => /\.jpe?g$/i.test(file))
  .sort();

if (files.length < 2 || files.length > 10) {
  throw new Error(`공개 JPEG는 2~10장이어야 합니다. 현재 ${files.length}장`);
}

const isJpeg = (bytes) =>
  bytes.length >= 4
  && bytes[0] === 0xff
  && bytes[1] === 0xd8
  && bytes[bytes.length - 2] === 0xff
  && bytes[bytes.length - 1] === 0xd9;
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

for (const file of files) {
  const local = readFileSync(join(directory, file));
  if (local.length < 10_000 || !isJpeg(local)) {
    throw new Error(`로컬 JPEG가 유효하지 않습니다: ${file}`);
  }

  const publicUrl = `${baseUrl}/${encodeURIComponent(basename(file))}`;
  const response = await fetch(publicUrl, {
    signal: AbortSignal.timeout(30_000),
    headers: { Accept: 'image/jpeg' },
  });
  if (!response.ok) throw new Error(`공개 JPEG HTTP ${response.status}: ${file}`);

  const contentType = response.headers.get('content-type') || '';
  if (!/^image\/jpeg(?:;|$)/i.test(contentType)) {
    throw new Error(
      `공개 Content-Type이 image/jpeg가 아닙니다: ${file} · ${contentType || '없음'}`,
    );
  }

  const remote = Buffer.from(await response.arrayBuffer());
  if (remote.length < 10_000 || !isJpeg(remote)) {
    throw new Error(`공개 파일이 유효한 JPEG가 아닙니다: ${file}`);
  }
  if (digest(remote) !== digest(local)) {
    throw new Error(`공개 JPEG가 로컬 스테이징 바이트와 다릅니다: ${file}`);
  }
}

console.log(
  `✓ 공개 JPEG ${files.length}장 전수 검증 완료 · HTTP 200 · image/jpeg · SHA-256 일치`,
);
