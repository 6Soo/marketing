// 나만 몰랐던 일본 · 003 — 사도 편
// 검증된 현지 사진: Wikimedia Commons 원본 5장(Public domain 또는 CC BY).
// 출처·라이선스·해시: cardnews/photos/sado/출처.md 및 각 *.source.json.

export default {
  meta: {
    series: '나만 몰랐던 일본',
    number: '003',
    episode: '사도 편',
    tag: '#나만몰랐던일본',
    hookFormula: 'open-reason',
    watermark: '숲길따라 감성여행',
    photoStatus: 'verified',
    photoNote: '사도 현지 촬영 Commons 원본이며 장소·저작자·재사용 라이선스·SHA-256을 확인했습니다.',
    landing: {
      profileUrl: 'https://foresttour.kr/',
      storyPath: '/stories/sado',
      sources: {
        carousel: 'insta-carousel-sado',
        story: 'insta-story-sado',
        reel: 'insta-reel-sado',
      },
      connectedTour: null,
    },
  },
  cards: [
    {
      id: 'cover-a',
      kind: 'cover',
      title: '섬 한가운데<br>거대한 층층 구조물이 남은 이유',
      sub: '광산이 멈춘 뒤에도 · 니가타 사도',
      photo: 'cardnews/photos/sado/03-kitazawa.jpg',
    },
    {
      id: '02-goldmine',
      kind: 'pc',
      eye: '사도섬 금산 — 세계문화유산',
      title: '금보다 오래 남은 건<br>사람이 파낸 방식',
      body: '니시미카와의 사금 채취와<br>아이카와·쓰루시의 갱도 채굴.<br>기계화 이전 금 생산 체계의 흔적이<br>2024년 세계유산이 됐습니다.',
      hand: '— 다음 기록: 산을 깎아 만든 거대한 선광장',
      photo: 'cardnews/photos/sado/02-goldmine.jpg',
    },
    {
      id: '03-kitazawa',
      kind: 'pc',
      eye: '아이카와 — 北沢浮遊選鉱場',
      title: '돌계단처럼 보이는<br>광석 처리 공장',
      body: '1938년 완성된 북택부유선광장.<br>한 달 5만 톤을 처리하던 시설은 멈췄고,<br>지금은 콘크리트 기초가<br>산비탈의 층을 그대로 보여줍니다.',
      hand: '— 세계유산 범위 밖에도 광산의 다음 시대가 남았습니다',
      photo: 'cardnews/photos/sado/03-kitazawa.jpg',
    },
    {
      id: '04-taraibune',
      kind: 'pc',
      eye: '오기 해안 — たらい舟',
      title: '배가 둥근 데는<br>바다의 이유가 있습니다',
      body: '19세기 후반, 바위가 빽빽한 좁은 해안에서<br>방향을 바꾸기 쉽도록 만든 대야배.<br>씻는 통을 닮은 모양이<br>사도 남쪽 바다의 생활 도구가 됐습니다.',
      hand: '— 다음 기록: 배를 만들던 사람들이 지은 마을',
      photo: 'cardnews/photos/sado/04-taraibune.jpg',
    },
    {
      id: '05-shukunegi',
      kind: 'pc',
      eye: '슈쿠네기 — 宿根木',
      title: '배목수의 기술이<br>골목이 되었습니다',
      body: '회선업으로 번성한 슈쿠네기.<br>배 판재를 다시 쓴 외벽과 돌을 얹은 지붕,<br>좁은 땅을 채운 집들이<br>한 마을의 항해 기억을 남깁니다.',
      hand: '— 금광의 섬을 항구 마을의 눈으로 다시 봅니다',
      photo: 'cardnews/photos/sado/05-shukunegi.jpg',
    },
    {
      id: '06-howto',
      kind: 'paper',
      eye: '사도를 읽는 순서',
      title: '금광 하나만 보고<br>돌아오지 않는 법',
      body: '광석을 캔 갱도에서 시작해<br>광석을 골라낸 북택의 층을 보고,<br>남쪽 바다의 둥근 배와<br>배목수 마을까지 이어 보세요.',
      hand: '— 산업의 흔적이 섬의 생활로 연결됩니다',
    },
    {
      id: '07-outro',
      kind: 'paper',
      stamp: '003<br>사도',
      eye: 'SADO FIELD NOTE — SAVE 01',
      title: '사도를 기억할<br>네 가지 단서',
      items: [
        '기계화 이전 금 생산 방식을 남긴 세계유산',
        '한 달 5만 톤을 처리하던 북택의 콘크리트 층',
        '좁은 암초 바다에서 방향을 바꾸던 둥근 대야배',
        '배 판재와 목수 기술이 골목으로 남은 슈쿠네기',
      ],
      hand: '— 저장해 두면, 금광 밖의 사도까지 이어집니다',
    },
  ],
};
