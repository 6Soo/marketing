// 그들이 모르는 일본 · 002 — 산리쿠 편
//
// 비주얼: 기준본(cardnews/그들이모르는일본-001-히다.html) 계약 준수 — 전 카드 풀블리드 실사진,
//   종이(필드노트) 카드는 8·9장(걷는 법·마무리)만. 사진 출처: cardnews/photos/sanriku/출처.md
//   (전부 Pexels 분위기 대역 — 실게시 전 모객글/대장 실사진 확보 시 교체 1순위).
// 문구: 훅 독트린(docs/훅-독트린.md) 적용 + 독립 반박 검증 완료(사실-검증.md — 오류 0,
//   권고 반영: 열차 상시 정차 단정 완화 · '일본 최초' → '해안선만 따라 걷는 가장 긴 바닷길').
// 제0원칙 자가 점검: 가격·일정·박수·대장명 없음 ✓ '없는 것' 이름 없음 ✓ 상품 연결은 9장 hand 한 줄 ✓

export default {
  meta: {
    series: '그들이 모르는 일본',
    number: '002',
    episode: '산리쿠 편',
    watermark: '숲길따라 감성여행',
  },
  cards: [
    // ── 표지 후보 3안 (게시 때 한 장만 선택) ─────────────────────────
    {
      id: 'cover-a', kind: 'cover', variant: 'A안 — 열린 이유형(추천)',
      title: '열차가<br>바다 위에서<br>멈추는 이유',
      sub: '고장도, 지연도 아닙니다 — 이와테, 산리쿠 해안',
      photo: 'cardnews/photos/sanriku/cover-a.jpg',
    },
    {
      id: 'cover-b', kind: 'cover', variant: 'B안 — 감각 선언형',
      title: '밟으면,<br>모래가 웁니다',
      sub: '더러워진 모래는 울지 않습니다 — 오스카 해안',
      photo: 'cardnews/photos/sanriku/cover-b.jpg',
    },
    {
      id: 'cover-c', kind: 'cover', variant: 'C안 — 순위·빈칸형',
      title: '해안 절경 1등은<br>일본에 한 곳뿐',
      sub: '한국 지도에는 아직 빈칸인 바닷가 — 산리쿠',
      photo: 'cardnews/photos/sanriku/cover-c.jpg',
    },

    // ── 내지 (2~9장) ────────────────────────────────────────────────
    {
      id: '02-train', kind: 'pc',
      eye: '三陸鉄道 — 리아스선',
      title: '기관사는 다리 위에서<br>속도를 늦춥니다',
      body: '바다 위 30미터, 창밖이 온통 태평양인 다리.<br>타신 분들이 그 바다를 다 볼 때까지 —<br>때로는 아예 멈춰 섭니다. 길게는 약 1분.',
      hand: '— 정시의 나라에서, 풍경 때문에 서는 열차',
      photo: 'cardnews/photos/sanriku/02-train.jpg',
    },
    {
      id: '03-sand', kind: 'pc',
      eye: '오스카 해안 — 鳴き砂',
      title: '모래가 웁니다,<br>깨끗할 때만',
      body: "마른 모래를 밟으면 '큣, 큣' —<br>석영 모래알이 서로 스치는 소리입니다.<br>때가 끼면 이 소리는 사라집니다.",
      hand: '— 모래 울음은 이 바다의 청정 증명서',
      photo: 'cardnews/photos/sanriku/03-sand.jpg',
    },
    {
      id: '04-cliff', kind: 'pc',
      eye: '기타야마자키 — 特A급',
      title: '일본이 해안 절경에<br>매긴 1등, 한 곳뿐',
      body: "높이 200미터 절벽이 8킬로미터.<br>전국 관광자원 평가에서 해안 '특A급'은<br>일본 전체에서 이곳이 유일합니다.",
      hand: "— 붙은 별명이 '바다의 알프스'",
      photo: 'cardnews/photos/sanriku/04-cliff.jpg',
    },
    {
      id: '05-jodo', kind: 'pc',
      eye: '미야코 — 浄土ヶ浜',
      title: "스님이 '극락'이라<br>부른 바닷가",
      body: '340여 년 전, "마치 극락정토 같구나" —<br>그 감탄이 그대로 이름이 됐다고 전해집니다.<br>흰 바위와 솔숲, 파도가 잔잔한 만.',
      hand: "— 이름부터 '정토(浄土)의 해변'",
      photo: 'cardnews/photos/sanriku/05-jodo.jpg',
    },
    {
      id: '06-trail', kind: 'pc',
      eye: '미치노쿠 시오카제 트레일',
      title: '이 길은 2011년의<br>슬픔에서 태어났습니다',
      body: '"걸어서 동북을 다시 잇자" — 대지진 이후<br>바닷가 마을들이 함께 낸 1,025km.<br>해안선만 따라 걷는, 일본에서 가장 긴 바닷길.',
      hand: '— 걷는 사람이 늘수록 마을이 살아납니다',
      photo: 'cardnews/photos/sanriku/06-trail.jpg',
    },
    {
      id: '07-ama', kind: 'pc',
      eye: '구지 고소데 해안 — 北限の海女',
      title: '해녀의<br>북방한계선',
      body: "해녀는 제주에만 있지 않습니다.<br>일본에서 해녀가 물질하는 가장 북쪽 바다 —<br>드라마 '아마짱'이 이 마을 이야기입니다.",
      hand: "— 그래서 이름도 '북한계 해녀'",
      photo: 'cardnews/photos/sanriku/07-ama.jpg',
    },
    {
      id: '08-howto', kind: 'paper',
      eye: '이 동네를 걷는 법',
      title: '적게 다니고,<br>오래 머뭅니다',
      body: '하루에 한 해안이면 충분합니다.<br>걷고, 담그고, 먹고 —<br>남는 시간이 이 바닷가의<br>진짜 볼거리입니다.',
      hand: '— 몸만 오세요, 바다는 준비돼 있습니다',
    },
    {
      id: '09-outro', kind: 'paper', stamp: '002<br>산리쿠',
      eye: '그들이 모르는 일본 — 002 산리쿠. 끝.',
      title: '이 바닷길,<br>저장해 두세요',
      body: '다음 기록은<br>또 다른 바닷가에서 이어집니다.',
      hand: '— 이 길은 10월에 실제로 걷습니다 · 프로필에서',
    },
  ],
};
