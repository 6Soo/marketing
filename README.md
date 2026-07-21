# marketing — (주)숲길여행 카페 밖 채널 리포

인스타그램·유튜브·밴드 등 신규 고객 채널의 콘텐츠 제작·자동화와 지식 베이스.

- 시작점: **CLAUDE.md** (제0원칙·카드뉴스 비주얼 계약·타겟·자산·규칙 전부 여기)
- 지식 베이스: `learning/`(학습 01~09) · `coursebooks/`(여행지 소재) · `strategy/`(밴드 등 채널 전략) · `video/`
- 전사 원본 컨텍스트는 foresttour 리포 — 깊은 맥락이 필요한 세션은 두 리포를 함께 추가.

## 구조

```
cardnews/
  docs/          카드뉴스 제작 원칙 (훅 독트린 등)
  tools/         생성기 (기준본 CSS 템플릿 → PNG, 로컬 Chromium 헤드리스)
  series/        시리즈별 카드 데이터 (한 폴더 = 한 게시물: cards.mjs·캡션·사실-검증)
  photos/        시리즈별 소싱 사진 (출처.md에 Pexels ID·검색어 기록)
  out/           렌더 결과물 1080×1350 PNG (git 포함 — 게시에 바로 쓰는 실물)
  그들이모르는일본-001-히다.html   ← 비주얼 기준본 (풀블리드 실사진)
  그들이모르는일본-002-산리쿠.html ← 기록용 검토 페이지 (build-record.mjs 생성)
learning/ coursebooks/ strategy/ video/ context/ cafe-kit/ tools/
```

## 카드뉴스 렌더

```bash
node cardnews/tools/render.mjs cardnews/series/sanriku     # 실게시 PNG 전 장 (1080×1350)
node cardnews/tools/build-record.mjs cardnews/series/sanriku <소형사진폴더> <출력.html>  # 기록 페이지
```

- **비주얼 계약**: 기준본(001 히다)의 CSS·구조를 그대로 복사, 내용만 교체 — 전 카드 풀블리드
  실사진 + 하단 스크림, 무사진 단색 카드 금지(종이 카드는 8·9장만). 상세: CLAUDE.md.
- 사진 소싱: 모객글 실사진 → 없으면 `tools/stock-photo.mjs`(Pexels, .env 키 자동 로드).
- 산출물 전달: 이미지형은 PDF로 묶지 말고 **PNG 원본 직접 전달**(사장 지적 2026-07-21).

## 제0원칙 (사장 확정 2026-07-21)

**여행상품이 아니라 여행지를 소개한다.** 카드의 주인공은 땅(역사·문화·풍경의 이유).
가격·일정·박수·대장명·예약 문구는 카드에 넣지 않는다 — 상품 연결은 마지막 카드 한 줄과
캡션·프로필 링크만. '없는 것'(쇼핑센터 등)은 이름조차 부르지 않는다.
