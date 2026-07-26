/**
 * 숲길여행 - 다음 카페 발행 지원 도구 (Phase 3 Multi-Channel Publishing)
 * 인스타그램용 텍스트/카드를 시니어 대상 다음 카페 형식(존댓말, 큰 글씨)으로 변환합니다.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, basename, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { askGemini } from './gemini.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

const args = process.argv.slice(2);
const opt = (name, dflt) => args.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const flag = name => args.includes(`--${name}`);

export async function generateCafePost(seriesDir, options = {}) {
  const isAuto = options.auto || flag('auto');
  const outFile = options.output || opt('output', 'cafe-post.html');

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

  const prompt = `
다음 인스타그램용 짧은 문구들을 다음 카페 주 사용층인 50-60대 시니어를 위한
정중하고 따뜻한 존댓말 문장으로 변환해주세요.
글씨가 커 보일 수 있도록 문단 간격을 넉넉히 하고, 너무 어려운 외래어는 쉽게 풀어주세요.

원본 문구:
${textContent}
`;

  let cafeText = "변환된 텍스트가 여기에 들어갑니다.";
  try {
    cafeText = await askGemini(prompt);
  } catch (e) {
    console.warn("Gemini API 호출 실패, 원본 텍스트 사용 (", e.message, ")");
    cafeText = textContent;
  }

  const templatePath = join(REPO, 'cafe-kit', '모집글-템플릿.txt');
  let template = "<div>\n{{CONTENT}}\n</div>";
  if (existsSync(templatePath)) {
    template = readFileSync(templatePath, 'utf8');
  }

  const finalHtml = template.replace('{{CONTENT}}', cafeText.replace(/\n/g, '<br>\n'));

  const outFilePath = options.output || opt('output')
    ? (isAbsolute(outFile) ? outFile : resolve(REPO, outFile))
    : join(REPO, 'cardnews', 'out', basename(seriesDir), outFile);
  mkdirSync(dirname(outFilePath), { recursive: true });

  writeFileSync(outFilePath, finalHtml);
  console.log(`[카페 발행] HTML 준비 완료: ${outFilePath}`);
  console.log(`직접 복사하여 카페에 붙여넣기 하거나, 반자동화를 사용하세요.`);

  if (isAuto) {
    console.log(`[카페 발행] --auto 플래그 감지. Playwright 자동 발행은 향후 구현 예정입니다. (TODO)`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('cafe-publish.mjs')) {
  const sDir = opt('series');
  if (!sDir) {
    console.error("사용법: node tools/cafe-publish.mjs --series=cardnews/series/<이름> [--output=...] [--auto]");
    process.exit(1);
  }
  generateCafePost(resolve(REPO, sDir)).catch(e => {
    console.error(`[카페 발행] 생성 실패: ${e.message}`);
    process.exitCode = 1;
  });
}
