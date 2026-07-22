// Google Gemini 브리지 (서브에이전트 호출용, 2026-07-22).
// Claude Code가 Bash로 이 스크립트를 불러 프롬프트를 던지고, Gemini의 텍스트 응답을 stdout으로 받는다.
// Google Generative Language API(REST)를 직접 호출한다 — SDK 의존성 없음.
//
// ⚠ 클라우드 세션(이 리포를 여는 원격 컨테이너)에서는 아웃바운드가 프록시를 거치므로
//   `NODE_USE_ENV_PROXY=1` 을 명령 앞에 붙여야 한다. 그래도 환경 네트워크 정책에 따라
//   막힐 수 있다 — 이 스크립트의 주 용도는 로컬 윈도우 세션이고, 클라우드에서는 실패할 수 있다.
// 키는 환경변수 GEMINI_API_KEY 또는 리포 루트 .env의 GEMINI_API_KEY= 줄에서 자동 로드된다.
//
// ⚠ 기본 모델(DEFAULT_MODEL)은 'gemini-3.6-flash'로 고정한다(사장 지시 2026-07-22, 전사 공통).
//   무료 등급이 있어 클라우드/로컬 모두 결제 연결 없이 동작한다. 최상위 Pro가 필요할 때만
//   --model=gemini-3.1-pro-preview 로 지정(이 모델은 무료 등급이 없어 AI Studio Billing 필요 —
//   붙어 있지 않으면 429/403으로 실패). 그 외 모델도 --model 옵션으로 임시 지정 가능.
//
// CLI: node tools/gemini.mjs "질문"
//      node tools/gemini.mjs "이 코드 검토해줘" --file=src/foo.js --model=gemini-2.5-flash
//      cat 문서.md | node tools/gemini.mjs
// 모듈: import { askGemini } from './tools/gemini.mjs'
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.6-flash';
const TIMEOUT_MS = 120_000;

// 리포 루트 .env에서 키 자동 로드 (dotenv 의존성 없이 필요한 한 줄만 파싱)
function envKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const m = readFileSync(join(root, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  } catch { /* .env 없으면 아래 에러로 안내 */ }
  return '';
}

export async function askGemini(prompt, { model = DEFAULT_MODEL, apiKey } = {}) {
  const key = apiKey || envKey();
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY가 없습니다 — 환경변수로 설정하거나 리포 루트 .env에 ' +
      'GEMINI_API_KEY=... 한 줄을 넣어주세요. 발급처: https://aistudio.google.com/apikey'
    );
  }

  const url = `${API_BASE}/${model}:generateContent?key=${key}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Gemini 호출이 ${TIMEOUT_MS / 1000}초 안에 끝나지 않아 중단했습니다.`);
    }
    throw new Error(`Gemini 호출 중 네트워크 오류: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini 호출 실패 (HTTP ${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const candidates = data.candidates || [];
  if (candidates.length === 0) {
    const blockReason = data.promptFeedback?.blockReason;
    throw new Error(
      'Gemini 응답에 candidates가 없습니다 (안전 필터 등으로 비어있을 수 있음)' +
      (blockReason ? ` — blockReason: ${blockReason}` : '')
    );
  }

  const parts = candidates[0]?.content?.parts || [];
  const text = parts.map(p => p.text || '').join('');
  if (!text) {
    throw new Error('Gemini 응답에 candidates는 있지만 텍스트가 비어있습니다.');
  }
  return text;
}

// CLI로 직접 실행된 경우
if (process.argv[1] && process.argv[1].endsWith('gemini.mjs')) {
  const args = process.argv.slice(2);
  const opt = name => args.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
  const model = opt('model') || DEFAULT_MODEL;
  const filePaths = args
    .filter(a => a.startsWith('--file='))
    .map(a => a.split('=').slice(1).join('='));

  let promptText = args.find(a => !a.startsWith('--')) || '';

  // 인자로 프롬프트가 없고 stdin이 파이프로 들어오면 stdin 전체를 프롬프트로 사용
  if (!promptText && !process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    promptText = Buffer.concat(chunks).toString('utf8').trim();
  }

  // --file 옵션으로 넘긴 파일들을 프롬프트 앞에 붙인다
  let fileBlocks = '';
  for (const fp of filePaths) {
    try {
      const content = readFileSync(fp, 'utf8');
      fileBlocks += `[파일: ${fp}]\n${content}\n\n`;
    } catch (err) {
      console.error(`파일을 읽지 못했습니다 (${fp}): ${err.message}`);
      process.exit(1);
    }
  }

  const finalPrompt = fileBlocks ? `${fileBlocks}${promptText}` : promptText;

  if (!finalPrompt) {
    console.error(
      '사용법: node tools/gemini.mjs "질문" [--model=gemini-2.5-flash] [--file=경로 ...]\n' +
      '       cat 문서.md | node tools/gemini.mjs\n' +
      '(클라우드 세션 프록시 환경에서는 NODE_USE_ENV_PROXY=1 을 명령 앞에 붙입니다)'
    );
    process.exit(1);
  }

  try {
    const answer = await askGemini(finalPrompt, { model });
    console.log(answer);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
