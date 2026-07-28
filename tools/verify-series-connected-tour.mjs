// 시리즈 메타 `connectedTour` 계약 검증 (2026-07-28).
//
// 배경: 불변조건 7 "실제 공개 일정이 런타임에서 검증될 때만 CTA를 노출한다"는
// 지금까지 reservation 리포의 프로덕션 런타임에만 fail-closed로 존재했고,
// marketing 리포에는 회귀 테스트가 없었다. 시리즈 메타를 잘못 고쳐도 CI가 잡지 못했다.
//
// 이 모듈은 두 방향을 모두 강제한다.
//   1) `connectedTour`가 있는 시리즈 — 상품 식별자·매칭 조건·fail-closed 정책이 모두 있어야 한다.
//      하나라도 비면 런타임이 무엇을 검증해야 하는지 알 수 없으므로 계약 위반이다.
//   2) `connectedTour: null`인 시리즈 — 카드·게시 캡션 어디에도 예약 링크·출발일·박수·가격이
//      있으면 안 된다. 연결된 공개 일정이 없는데 상거래 약속이 나가는 것이 실제 사고였다.
//
// 순수 함수만 노출한다(파일 I/O는 호출자 몫). 위반은 예외로 던진다.

// 런타임이 "실제 활성 상품을 조회해 확인되지 않으면 숨긴다"를 뜻하는 정책 값만 허용한다.
// 새 정책을 도입하려면 반드시 여기에 명시적으로 추가해야 한다(기본 거부).
export const FAIL_CLOSED_TOUR_POLICIES = new Set([
  'reservation-api-runtime-fail-closed',
]);

// 게시 캡션 추출 규칙은 cardnews/tools/daily-publish.mjs와 동일해야 한다.
// (`---`로 3개 이상 구획이면 가운데가 게시 본문, 아니면 파일 전체)
export function extractPublishCaption(raw) {
  const trimmed = String(raw ?? '').trim();
  const sections = trimmed.split(/\r?\n---\r?\n/);
  return (sections.length >= 3 ? sections[1] : trimmed).trim();
}

// 카드에서 사람이 읽는 문자열만 모은다(사진 경로·id 같은 기계 값은 제외).
export function collectCardText(series) {
  const cards = Array.isArray(series?.cards) ? series.cards : [];
  const pieces = [];
  for (const card of cards) {
    for (const [key, value] of Object.entries(card)) {
      if (key === 'photo' || key === 'id' || key === 'kind') continue;
      if (typeof value === 'string') pieces.push(value);
      else if (Array.isArray(value)) pieces.push(value.filter(v => typeof v === 'string').join(' '));
    }
  }
  return pieces.join('\n').replace(/<br\s*\/?>/g, ' ');
}

// 공개 모집 일정이 연결되지 않은 시리즈에서 금지되는 상거래 신호.
// 카드·캡션 양쪽에 같은 기준을 적용한다.
const COMMERCE_PATTERNS = [
  { label: '예약 링크', re: /reserve\.foresttour\.kr|\/tour\/[A-Za-z0-9_-]+/ },
  { label: '예약·모객 문구', re: /예약(하기|금|신청)?|모객|잔여\s*석|선착순|마감\s*임박/ },
  { label: '출발일 약속', re: /출발일|출발\s*확정|다음\s*출발|\d{1,2}\s*월\s*\d{1,2}\s*일\s*출발/ },
  { label: '박수 표기', re: /\d\s*박\s*\d\s*일|\(\s*\d\s*박\s*\)/ },
  { label: '가격 표기', re: /\d[\d,]*\s*(만\s*)?원|₩\s*\d|여행\s*경비|1인\s*요금/ },
];

function fail(seriesName, message) {
  throw new Error(`[${seriesName}] connectedTour 계약 위반 — ${message}`);
}

/**
 * @param {object} input
 * @param {string} input.name        시리즈 폴더명 (오류 메시지용)
 * @param {object} input.series      cards.mjs default export
 * @param {string} [input.captionRaw] 캡션.md 원문 (없으면 캡션 검사는 건너뛴다)
 * @returns {{name: string, linked: boolean, productId: string|null, policy: string|null}}
 */
export function verifyConnectedTourContract({ name, series, captionRaw }) {
  const seriesName = name || series?.meta?.episode || 'unknown';
  const landing = series?.meta?.landing;
  if (!landing || typeof landing !== 'object') {
    fail(seriesName, 'meta.landing이 없습니다. 연결 계약을 판정할 수 없습니다.');
  }
  if (!('connectedTour' in landing)) {
    fail(seriesName, 'meta.landing.connectedTour 키가 없습니다. 연결 없음이면 명시적으로 null이어야 합니다.');
  }

  const tour = landing.connectedTour;

  if (tour === null) {
    const caption = captionRaw === undefined ? '' : extractPublishCaption(captionRaw);
    const surfaces = [
      ['카드', collectCardText(series)],
      ['게시 캡션', caption],
    ];
    for (const [surface, text] of surfaces) {
      if (!text) continue;
      for (const { label, re } of COMMERCE_PATTERNS) {
        const hit = text.match(re);
        if (hit) {
          fail(seriesName, `연결된 공개 일정이 없는데 ${surface}에 ${label}가 있습니다: "${hit[0]}"`);
        }
      }
    }
    return { name: seriesName, linked: false, productId: null, policy: null };
  }

  if (typeof tour !== 'object' || Array.isArray(tour)) {
    fail(seriesName, 'connectedTour는 null이거나 객체여야 합니다.');
  }

  const { productId, policy } = tour;
  if (typeof productId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(productId)) {
    fail(seriesName, 'productId가 없거나 형식이 잘못됐습니다(예약 시스템 상품 식별자여야 합니다).');
  }
  if (typeof policy !== 'string' || !policy) {
    fail(seriesName, 'policy가 없습니다. 런타임 노출 정책을 명시해야 합니다.');
  }
  if (!FAIL_CLOSED_TOUR_POLICIES.has(policy)) {
    fail(seriesName, `policy '${policy}'는 허용된 fail-closed 정책이 아닙니다(허용: ${[...FAIL_CLOSED_TOUR_POLICIES].join(', ')}).`);
  }

  // 매칭 조건 — 런타임이 "이 상품이 진짜 그 여행지인가"를 대조할 근거가 최소 1종 있어야 한다.
  const matchers = {
    requiredTitleTerms: tour.requiredTitleTerms,
    requiredCountry: tour.requiredCountry,
    requiredUrlPattern: tour.requiredUrlPattern,
  };
  const present = [];
  if ('requiredTitleTerms' in tour) {
    const terms = matchers.requiredTitleTerms;
    if (!Array.isArray(terms) || terms.length === 0
      || terms.some(t => typeof t !== 'string' || !t.trim())) {
      fail(seriesName, 'requiredTitleTerms는 비어 있지 않은 문자열 배열이어야 합니다.');
    }
    present.push('requiredTitleTerms');
  }
  for (const key of ['requiredCountry', 'requiredUrlPattern']) {
    if (key in tour) {
      if (typeof matchers[key] !== 'string' || !matchers[key].trim()) {
        fail(seriesName, `${key}는 비어 있지 않은 문자열이어야 합니다.`);
      }
      present.push(key);
    }
  }
  if (present.length === 0) {
    fail(seriesName, '매칭 조건이 하나도 없습니다(requiredTitleTerms·requiredCountry·requiredUrlPattern 중 최소 1종 필요).');
  }

  // 카드·캡션에 예약 딥링크가 나온다면 반드시 이 productId여야 한다.
  const linkText = [collectCardText(series), captionRaw === undefined ? '' : extractPublishCaption(captionRaw)].join('\n');
  for (const m of linkText.matchAll(/reserve\.foresttour\.kr\/tour\/([A-Za-z0-9_-]+)/g)) {
    if (m[1] !== productId) {
      fail(seriesName, `본문의 예약 딥링크 상품 '${m[1]}'이 connectedTour.productId '${productId}'와 다릅니다.`);
    }
  }

  return { name: seriesName, linked: true, productId, policy };
}
