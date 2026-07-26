// 나만 몰랐던 일본 · 002 — 산리쿠 편
//
// 비주얼: 기준본(cardnews/나만몰랐던일본-001-히다.html) 계약 준수 — 전 카드 풀블리드 실사진,
//   종이(필드노트) 카드는 8·9장(걷는 법·마무리)만. 사진 출처: cardnews/photos/sanriku/출처.md
//   (전부 Pexels 분위기 대역 — 실게시 전 모객글/대장 실사진 확보 시 교체 1순위).
// 문구: 훅 독트린(docs/훅-독트린.md) 적용 + 독립 반박 검증 완료(사실-검증.md — 오류 0,
//   권고 반영: 열차 상시 정차 단정 완화 · '일본 최초' → '해안선만 따라 걷는 가장 긴 바닷길').
// 제0원칙 자가 점검: 가격·일정·박수·대장명 없음 ✓ '없는 것' 이름 없음 ✓ 상품 연결은 9장 hand 한 줄 ✓

export default {
  meta: {
    series: '나만 몰랐던 일본',
    number: '002',
    episode: '산리쿠 편',
    watermark: '숲길따라 감성여행',
    photoStatus: 'placeholder',
    photoNote: 'Pexels 분위기 대역입니다. 산리쿠 현지 촬영 원본으로 교체 전에는 게시할 수 없습니다.',
    landing: {
      profileUrl: 'https://foresttour.kr/',
      storyPath: '/stories/sanriku',
      sources: {
        carousel: 'insta-carousel-sanriku',
        story: 'insta-story-sanriku',
        reel: 'insta-reel-sanriku',
      },
      connectedTour: null,
    },
  },
  cards: [
    // ── 표지 확정안 ────────────────────────────────────────────────
    {
      id: 'cover-a', kind: 'cover', variant: '확정안 — 열린 이유형',
      title: '열차가 느려지는<br>바다 위 다리',
      sub: '풍경을 다 볼 때까지 · 이와테 산리쿠',
      photo: 'cardnews/photos/sanriku/cover-a.jpg',
    },

    // ── 내지 (2~9장) ────────────────────────────────────────────────
    {
      id: '02-train', kind: 'pc',
      eye: '三陸鉄道 — 리아스선',
      title: '풍경도 이 열차의<br>정차 이유가 됩니다',
      body: '태평양이 한눈에 열리는 오사와 교량.<br>관광 편성은 속도를 늦추고,<br>때로 약 1분간 멈춰 바다를 보여줍니다.',
      hand: '— 다음 기록: 깨끗할 때만 우는 모래',
      photo: 'cardnews/photos/sanriku/02-train.jpg',
    },
    {
      id: '03-sand', kind: 'pc',
      eye: '오스카 해안 — 鳴き砂',
      title: '모래가 웁니다,<br>깨끗할 때만',
      body: "마른 모래를 밟으면 '큣, 큣' —<br>석영 모래알이 서로 스치는 소리입니다.<br>때가 끼면 이 소리는 사라집니다.",
      hand: '— 다음 기록: 200미터 절벽이 이어지는 곳',
      photo: 'cardnews/photos/sanriku/03-sand.jpg',
    },
    {
      id: '04-cliff', kind: 'pc',
      eye: '기타야마자키 — 特A급',
      title: '일본이 해안 절경에<br>매긴 1등, 한 곳뿐',
      body: "높이 200미터 절벽이 8킬로미터.<br>전국 관광자원 평가에서 해안 '특A급'은<br>일본 전체에서 이곳이 유일합니다.",
      hand: "— 다음 기록: 스님이 '극락'이라 부른 바닷가",
      photo: 'cardnews/photos/sanriku/04-cliff.jpg',
    },
    {
      id: '05-jodo', kind: 'pc',
      eye: '미야코 — 浄土ヶ浜',
      title: "스님이 '극락'이라<br>부른 바닷가",
      body: '340여 년 전, "마치 극락정토 같구나" —<br>그 감탄이 그대로 이름이 됐다고 전해집니다.<br>흰 바위와 솔숲, 파도가 잔잔한 만.',
      hand: '— 다음 기록: 1,025km를 다시 이은 길',
      photo: 'cardnews/photos/sanriku/05-jodo.jpg',
    },
    {
      id: '06-trail', kind: 'pc',
      eye: '미치노쿠 시오카제 트레일',
      title: '이 길은 2011년의<br>슬픔에서 태어났습니다',
      body: '"걸어서 동북을 다시 잇자" — 대지진 이후<br>바닷가 마을들이 함께 낸 1,025km.<br>해안선만 따라 걷는, 일본에서 가장 긴 바닷길.',
      hand: '— 다음 기록: 일본 해녀의 북방한계선',
      photo: 'cardnews/photos/sanriku/06-trail.jpg',
    },
    {
      id: '07-ama', kind: 'pc',
      eye: '구지 고소데 해안 — 北限の海女',
      title: '해녀의<br>북방한계선',
      body: "해녀는 제주에만 있지 않습니다.<br>일본에서 해녀가 물질하는 가장 북쪽 바다 —<br>드라마 '아마짱'이 이 마을 이야기입니다.",
      hand: '— 여섯 장의 기록을 한 장에 모았습니다',
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
      eye: 'SANRIKU FIELD NOTE — SAVE 01',
      title: '산리쿠를 기억할<br>다섯 가지 장면',
      items: [
        '풍경 앞에서 속도를 늦추는 산리쿠 철도',
        '깨끗하고 마른 날에만 우는 오스카의 모래',
        "해안 유형 유일의 '특A급' 기타야마자키",
        '대지진 이후 마을을 다시 이은 1,025km의 길',
        "일본 해녀의 북방한계선, 구지 고소데 해안",
      ],
      hand: '— 저장해 두면, 산리쿠의 작은 지도가 됩니다',
    },
  ],
};
