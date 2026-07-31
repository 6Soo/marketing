import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildNaverPackage,
  parseNaverPublicUrl,
  validateNaverPackage,
  validateRegistry,
  validateTravelGuide,
  verifyRenderedText,
} from './naver-blog-content.mjs';

const payload = JSON.parse(
  await readFile(new URL('../blog/published/stories.json', import.meta.url), 'utf8'),
);
const guidePayload = JSON.parse(
  await readFile(new URL('../naver-blog/travel-guides.json', import.meta.url), 'utf8'),
);

function story(slug) {
  return structuredClone(payload.stories.find((candidate) => candidate.slug === slug));
}

function guide(slug) {
  return structuredClone(guidePayload.guides.find((candidate) => candidate.slug === slug));
}

test('verified 현지 사진 원고를 결정적 네이버 장문 패키지로 만든다', () => {
  const source = story('sado');
  const travelGuide = guide('sado');
  const first = buildNaverPackage(source, travelGuide);
  const second = buildNaverPackage(source, travelGuide);

  assert.deepEqual(first, second);
  assert.equal(validateNaverPackage(first, source, travelGuide).length, 0);
  assert.equal(first.editorialMode, 'destination-guide-with-practical-access');
  assert.ok(first.body.includes(source.canonical));
  assert.ok(first.images.every((image) => first.body.includes(image.caption)));
  assert.ok(first.images.every((image) => first.body.includes(image.sourcePageUrl)));
  assert.ok(travelGuide.sections.every((section) => first.body.includes(section.title)));
  assert.equal(first.productConnection.status, 'unavailable');
});

test('placeholder 사진 원고는 네이버 패키지 생성을 차단한다', () => {
  assert.throws(
    () => buildNaverPackage(story('sanriku'), guide('sado')),
    /verified 현지 사진 원고만/,
  );
});

test('패키지 본문을 바꾸면 digest와 이미지 출처 게이트가 실패한다', () => {
  const source = story('northern-alps');
  const travelGuide = guide('sado');
  travelGuide.slug = source.slug;
  const pkg = buildNaverPackage(source, travelGuide);
  pkg.body = pkg.body.replace(pkg.images[0].caption, '');
  pkg.images[0].credit = '출처 미상';

  const errors = validateNaverPackage(pkg, source, travelGuide);
  assert.ok(errors.some((error) => error.includes('credit에 재사용 라이선스')));
  assert.ok(errors.some((error) => error.includes('caption이 body에서 누락')));
  assert.ok(errors.some((error) => error.includes('contentDigest')));
});

test('공개 URL은 네이버 blogId와 숫자 logNo를 가져야 한다', () => {
  assert.deepEqual(
    parseNaverPublicUrl('https://blog.naver.com/foresttour/123456789'),
    {
      url: 'https://blog.naver.com/foresttour/123456789',
      blogId: 'foresttour',
      logNo: '123456789',
    },
  );
  assert.deepEqual(
    parseNaverPublicUrl('https://blog.naver.com/PostView.naver?blogId=foresttour&logNo=123456789'),
    {
      url: 'https://blog.naver.com/PostView.naver?blogId=foresttour&logNo=123456789',
      blogId: 'foresttour',
      logNo: '123456789',
    },
  );
  assert.throws(() => parseNaverPublicUrl('https://example.com/post/123'), /네이버 블로그 공개 URL/);
  assert.throws(() => parseNaverPublicUrl('http://blog.naver.com/foresttour/123'), /HTTPS/);
  assert.throws(() => parseNaverPublicUrl('https://blog.naver.com/foresttour/123/extra'), /정확한 경로/);
  assert.throws(() => parseNaverPublicUrl('https://blog.naver.com/foresttour/123?logNo=456'), /정확한 경로/);
  assert.throws(
    () => parseNaverPublicUrl('https://blog.naver.com/PostView.naver?blogId=a&blogId=b&logNo=123'),
    /하나씩만/,
  );
});

test('공개 본문은 패키지 앵커가 모두 있어야 통과한다', () => {
  const pkg = buildNaverPackage(story('sado'), guide('sado'));
  assert.equal(verifyRenderedText(pkg, pkg.body + '\n' + pkg.title).ok, true);
  const result = verifyRenderedText(pkg, pkg.body.replace(pkg.source.canonical, '') + '\n' + pkg.title);
  assert.equal(result.ok, false);
  assert.ok(result.missing.includes(pkg.source.canonical));
});

test('이미지가 없는 중간 절 뒤의 사진을 잘못 연결하지 않는다', () => {
  const source = story('sado');
  delete source.sections[1].image;
  const pkg = buildNaverPackage(source, guide('sado'));

  assert.equal(pkg.images.some((image) => image.sectionId === 'taraibune'), false);
  assert.equal(pkg.images.find((image) => image.sectionId === 'shukunegi').section, '배목수의 기술이 골목이 되었습니다');
  const taraibuneStart = pkg.body.indexOf('배가 둥근 데는 바다의 이유가 있습니다');
  const shukunegiStart = pkg.body.indexOf('배목수의 기술이 골목이 되었습니다');
  const shukunegiPhoto = pkg.body.indexOf('사도 슈쿠네기의 좁은 골목');
  assert.ok(shukunegiPhoto > shukunegiStart);
  assert.ok(shukunegiPhoto > taraibuneStart);
});

test('실용 여행 정보와 과장 없는 상품 연결을 강제한다', () => {
  const source = story('sado');
  const missingAccess = guide('sado');
  missingAccess.sections = missingAccess.sections.filter((section) => section.id !== 'access');
  assert.ok(validateTravelGuide(missingAccess, source).some((error) => error.includes("'access'")));

  const pressureCopy = guide('sado');
  pressureCopy.sections[4].paragraphs.push('혼자서는 절대 못 가는 곳입니다.');
  assert.ok(validateTravelGuide(pressureCopy, source).some((error) => error.includes('과장')));

  const fakeProduct = guide('sado');
  fakeProduct.productConnection = {
    status: 'available',
    note: '상품이 있습니다.',
    url: 'https://reserve.foresttour.kr/tour/fake?from=naver-blog',
    verifiedAt: '2026-07-31T10:00:00+09:00'
  };
  assert.ok(validateTravelGuide(fakeProduct, source).some((error) => error.includes('connectedTour')));
});

test('공개 기록은 slug와 URL 중복을 거부한다', () => {
  const registry = {
    schemaVersion: 1,
    channel: 'naver-blog',
    posts: [
      {
        slug: 'sado',
        idempotencyKey: 'sado:a:b',
        contentDigest: 'abc',
        url: 'https://blog.naver.com/foresttour/123456789',
        blogId: 'foresttour',
        logNo: '123456789',
        verifiedAt: '2026-07-31T00:00:00.000Z',
      },
      {
        slug: 'sado',
        idempotencyKey: 'sado:c:d',
        contentDigest: 'def',
        url: 'https://blog.naver.com/foresttour/123456789',
        blogId: 'foresttour',
        logNo: '123456789',
        verifiedAt: '2026-07-31T01:00:00.000Z',
      },
    ],
  };
  const errors = validateRegistry(registry);
  assert.ok(errors.some((error) => error.includes('slug가 중복')));
  assert.ok(errors.some((error) => error.includes('url이 중복')));
});
