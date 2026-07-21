# marketing — (주)숲길여행 마케팅 산출물 리포

카페(foresttour.kr) 밖 채널(인스타그램·유튜브)용 콘텐츠 생성 도구와 산출물을 관리합니다.
운영 컨텍스트·마케팅 원칙은 foresttour 리포의 `CLAUDE.md` / `docs/학습-09-인스타-여행마케팅.md`가 원본입니다.

## 구조

```
cardnews/
  docs/          카드뉴스 제작 원칙 (훅 독트린 등)
  tools/         생성기 (HTML 템플릿 → PNG/PDF, 로컬 Chromium 헤드리스)
  series/        시리즈별 카드 데이터 (한 폴더 = 한 게시물)
  out/           렌더 결과물 (git 포함 — 사장님이 바로 쓰는 실물)
```

## 카드뉴스 렌더

```bash
node cardnews/tools/render.mjs cardnews/series/sanriku            # PNG 전 장
node cardnews/tools/render.mjs cardnews/series/sanriku --pdf      # 검토용 PDF까지
```

- 캔버스 1080×1350(4:5). 폰트: Noto Serif KR(감성 제목)·Noto Sans KR(정보).
- 실게시 전 사진 교체: 각 카드의 `photoNote`가 필요한 실사진을 명시합니다
  (스톡 검색 도구는 foresttour 리포 `cafe-kit/tools/stock-photo.mjs`).

## 제0원칙 (사장 확정 2026-07-21)

**여행상품이 아니라 여행지를 소개한다.** 카드의 주인공은 땅(역사·문화·풍경의 이유).
가격·일정·박수·대장명·예약 문구는 카드에 넣지 않는다 — 상품 연결은 마지막 카드 한 줄과
캡션·프로필 링크만. '없는 것'(쇼핑센터 등)은 이름조차 부르지 않는다.
