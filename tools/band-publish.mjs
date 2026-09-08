/**
 * 숲길여행 - 네이버 밴드 발행 지원 도구 (Phase 3 Multi-Channel Publishing)
 * 요일별 밴드 활성화 전략에 맞춰 텍스트와 이미지를 긴 호흡으로 풀어씁니다.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, basename, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { askGemini } from './gemini.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

const args = process.argv.slice(2);
const opt = (name, dflt) => args.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;

const COUNTRY_TAG_RULES = [
  ['일본', '#일본여행'],
  ['대만', '#대만여행'],
  ['중국', '#중국여행'],
  ['베트남', '#베트남여행'],
  ['태국', '#태국여행'],
  ['필리핀', '#필리핀여행'],
  ['몽골', '#몽골여행'],
  ['네팔', '#네팔여행'],
  ['인도네시아', '#인도네시아여행'],
  ['말레이시아', '#말레이시아여행'],
  ['싱가포르', '#싱가포르여행'],
  ['호주', '#호주여행'],
  ['뉴질랜드', '#뉴질랜드여행'],
  ['미국', '#미국여행'],
  ['캐나다', '#캐나다여행'],
  ['멕시코', '#멕시코여행'],
  ['브라질', '#브라질여행'],
  ['영국', '#영국여행'],
  ['프랑스', '#프랑스여행'],
  ['스페인', '#스페인여행'],
  ['이탈리아', '#이탈리아여행'],
  ['스위스', '#스위스여행'],
  ['터키', '#터키여행'],
  ['그리스', '#그리스여행'],
];

/** 국가명+여행 태그를 생성 결과에 항상 보장한다. */
export function ensureCountryTravelTag(text) {
  const source = String(text ?? '').trim();
  if (!source) return source;

  const existing = COUNTRY_TAG_RULES
    .filter(([, tag]) => source.includes(tag))
    .map(([, tag]) => tag);
  const detected = COUNTRY_TAG_RULES
    .filter(([country]) => source.includes(country))
    .map(([, tag]) => tag);
  const tags = [...new Set([...existing, ...detected])];
  if (tags.length === 0 && /국내|한국|대한민국/.test(source)) tags.push('#국내여행');
  if (tags.length === 0) return source;

  const missing = tags.filter(tag => !source.includes(tag));
  return missing.length ? `${source}\n\n${missing.join(' ')}` : source;
}

export async function generateBandPost(seriesDir, dayType, options = {}) {
  const outFile = options.output || opt('output', 'band-post.txt');
  const generateText = options.askGemini || askGemini;

  if (!existsSync(seriesDir)) {
    console.error("지정된 시리즈 폴더가 없습니다:", seriesDir);
    return;
  }

  const cardsFile = pathToFileURL(join(resolve(seriesDir), 'cards.mjs'));
  const { default: series } = await import(cardsFile);

  const textContent = series.cards
    .filter(c => c.kind !== 'cover')
    .map(c => [c.eye, c.title, c.body, ...(c.items || []), c.hand]
      .filter(Boolean).join('\n').replace(/<br\s*\/?>/gi, '\n'))
    .join('\n\n');
  if (!textContent.trim()) throw new Error('변환할 카드 문구가 없습니다.');

  let strategyInstruction = "";
  if (dayType === 'mon') {
    strategyInstruction = "월요일 테마: 이번 주 여행 일정 소개 및 모집에 초점을 맞춥니다.";
  } else if (dayType === 'wed') {
    strategyInstruction = "수요일 테마: 여행지의 숨겨진 이야기나 감성을 긴 호흡의 에세이처럼 풀어씁니다.";
  } else if (dayType === 'fri' || dayType === 'sat' || dayType === 'sun') {
    strategyInstruction = "주말 테마: 여행 현장의 실황이나 사진 앨범 위주로 생동감 있게 작성합니다.";
  } else {
    strategyInstruction = "일반 테마: 친근하고 편안한 네이버 밴드 스타일로 작성합니다.";
  }

  const prompt = `
다음 텍스트를 네이버 밴드 회원들(40~60대)을 위한 게시글로 변환해주세요.
${strategyInstruction}
이모지(🌸, 🌲 등)를 적절히 사용하고, 사진이 들어갈 위치에 [사진 삽입] 표시를 남겨주세요.

원본 텍스트:
${textContent}
`;

  try {
    const bandText = ensureCountryTravelTag(await generateText(prompt));
    if (!bandText?.trim()) throw new Error('빈 응답');

    const outFilePath = options.output || opt('output')
      ? (isAbsolute(outFile) ? outFile : resolve(REPO, outFile))
      : join(REPO, 'cardnews', 'out', basename(seriesDir), outFile);
    mkdirSync(dirname(outFilePath), { recursive: true });

    writeFileSync(outFilePath, bandText);
    console.log(`[밴드 발행] 게시글 텍스트 준비 완료: ${outFilePath}`);
    console.log(`[밴드 발행] 반자동 초안입니다. 공개 게시 전 사람이 검토해야 합니다.`);
    return outFilePath;
  } catch (e) {
    throw new Error(`BAND 초안 생성 실패: ${e.message}`, { cause: e });
  }
}

if (process.argv[1] && process.argv[1].endsWith('band-publish.mjs')) {
  const sDir = opt('series');
  const dType = opt('day', 'wed');
  if (!sDir) {
    console.error("사용법: node tools/band-publish.mjs --series=cardnews/series/<이름> --day=[mon|wed|fri] [--output=...]");
    process.exit(1);
  }
  generateBandPost(resolve(REPO, sDir), dType).catch(e => {
    console.error(`[밴드 발행] 생성 실패: ${e.message}`);
    process.exitCode = 1;
  });
}
