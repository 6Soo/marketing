# marketing — (주)숲길여행 카페 밖 채널 리포

인스타그램·유튜브·밴드 등 신규 고객 채널의 콘텐츠 제작·자동화와 지식 베이스.

- 시작점: **CLAUDE.md** (제0원칙·카드뉴스 비주얼 계약·타겟·자산·규칙 전부 여기)
- 지식 베이스: `learning/`(학습 01~09) · `coursebooks/`(여행지 소재) · `strategy/`(밴드 등 채널 전략) · `video/`
- 전사 원본 컨텍스트는 foresttour 리포 — 깊은 맥락이 필요한 세션은 두 리포를 함께 추가.

## 구조

```
cardnews/
  docs/          카드뉴스 제작 원칙 (훅 독트린 등)
  tools/         생성기 (HTML 템플릿 → PNG/PDF, 로컬 Chromium 헤드리스)
  series/        시리즈별 카드 데이터 (한 폴더 = 한 게시물)
  out/           렌더 결과물 (git 포함 — 사장님이 바로 쓰는 실물)
  그들이모르는일본-001-히다.html   ← 비주얼 기준본 (풀블리드 실사진)
learning/ coursebooks/ strategy/ video/ context/ cafe-kit/ tools/
```

## 카드뉴스 렌더

```bash
node cardnews/tools/render.mjs cardnews/series/sanriku            # PNG 전 장
node cardnews/tools/render.mjs cardnews/series/sanriku --pdf      # 검토용 PDF까지
```

- 캔버스 1080×1350(4:5). 폰트: Noto Serif KR(감성 제목)·Noto Sans KR(정보).
- **비주얼 계약**: 전 카드 풀블리드 실사진 + 하단 스크림 — 기준본과 CLAUDE.md 참조. 무사진 단색 카드 금지.
- 사진 소싱: 모객글 실사진 → 없으면 `tools/stock-photo.mjs`(Pexels, .env 키 자동 로드).

## 제0원칙 (사장 확정 2026-07-21)

**여행상품이 아니라 여행지를 소개한다.** 카드의 주인공은 땅(역사·문화·풍경의 이유).
가격·일정·박수·대장명·예약 문구는 카드에 넣지 않는다 — 상품 연결은 마지막 카드 한 줄과
캡션·프로필 링크만. '없는 것'(쇼핑센터 등)은 이름조차 부르지 않는다.
