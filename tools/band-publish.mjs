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

export async function generateBandPost(seriesDir, dayType, options = {}) {
  const outFile = options.output || opt('output', 'band-post.txt');

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

  let bandText = "밴드용 텍스트가 여기에 들어갑니다.";
  try {
    bandText = await askGemini(prompt);
  } catch (e) {
    console.warn("Gemini API 호출 실패 (", e.message, ")");
    bandText = textContent;
  }

  const outFilePath = options.output || opt('output')
    ? (isAbsolute(outFile) ? outFile : resolve(REPO, outFile))
    : join(REPO, 'cardnews', 'out', basename(seriesDir), outFile);
  mkdirSync(dirname(outFilePath), { recursive: true });

  writeFileSync(outFilePath, bandText);
  console.log(`[밴드 발행] 게시글 텍스트 준비 완료: ${outFilePath}`);
  console.log(`[밴드 발행] TODO: 네이버 밴드 Open API 파트너 승인 후 자동 게시 기능 활성화 예정`);
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
