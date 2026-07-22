// 다중 LLM 브리지 (서브에이전트 호출용, 2026-07-22).
// Claude Code가 Bash로 이 스크립트를 불러 프롬프트를 던지고, 다른 제공사 LLM의 텍스트 응답을
// stdout으로 받는다. GLM(Z.ai) · Kimi(Moonshot) · Grok(xAI) 세 곳 모두 OpenAI Chat Completions
// 호환 API(POST {base}/chat/completions, body { model, messages })라서 스크립트 하나로 묶었다
// — 진짜 중복 로직이라 provider별 파일로 쪼개지 않는다. SDK 의존성 없음(fetch 직접 호출).
//
// ⚠ 클라우드 세션(이 리포를 여는 원격 컨테이너)에서는 아웃바운드가 프록시를 거치므로
//   `NODE_USE_ENV_PROXY=1` 을 명령 앞에 붙여야 한다. 그래도 환경 네트워크 정책에 따라
//   막힐 수 있다.
//
// 가입(글로벌) URL — 지어내지 않고 조사 확인된 값 그대로:
//   GLM (Z.ai)      https://z.ai/model-api           (Z.ai Open Platform → API Keys)
//   Kimi (Moonshot) https://platform.moonshot.ai     (플랫폼 로그인 → API Keys)
//   Grok (xAI)      https://console.x.ai             (Console → API Keys)
//
// ⚠ PROVIDERS의 defaultModel은 각사 문서상 흔히 쓰이는 대표 모델명을 넣어둔 예시일 뿐이다.
//   정확한 최신 모델명은 각사 문서에서 직접 확인 후 --model= 로 지정하는 걸 권장한다
//   (모델명을 지어내서 마치 확정값처럼 쓰지 말 것).
//
// 키는 각 provider의 envVar(GLM_API_KEY / KIMI_API_KEY / GROK_API_KEY) 환경변수 또는
// 리포 루트 .env의 해당 변수= 줄에서 자동 로드된다.
//
// CLI: node tools/llm-bridge.mjs --provider=glm "질문"
//      node tools/llm-bridge.mjs --provider=kimi --model=kimi-k2 "이 코드 검토해줘" --file=src/foo.js
//      cat 문서.md | node tools/llm-bridge.mjs --provider=grok
// 모듈: import { askLLM, PROVIDERS } from './tools/llm-bridge.mjs'
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROVIDERS = {
  glm: {
    base: 'https://api.z.ai/api/paas/v4',
    envVar: 'GLM_API_KEY',
    defaultModel: 'glm-4.7-flash',
    label: 'GLM (Z.ai)',
  },
  kimi: {
    base: 'https://api.moonshot.ai/v1',
    envVar: 'KIMI_API_KEY',
    defaultModel: 'kimi-k2',
    label: 'Kimi (Moonshot)',
  },
  grok: {
    base: 'https://api.x.ai/v1',
    envVar: 'GROK_API_KEY',
    defaultModel: 'grok-4',
    label: 'Grok (xAI)',
  },
};

const TIMEOUT_MS = 120_000;

// 리포 루트 .env에서 키 자동 로드 (dotenv 의존성 없이 필요한 한 줄만 파싱)
function envKey(envVar) {
  if (process.env[envVar]) return process.env[envVar];
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const pattern = new RegExp(`^${envVar}=(.+)$`, 'm');
    const m = readFileSync(join(root, '.env'), 'utf8').match(pattern);
    if (m) return m[1].trim();
  } catch { /* .env 없으면 아래 에러로 안내 */ }
  return '';
}

export async function askLLM(provider, prompt, { model, apiKey } = {}) {
  const config = PROVIDERS[provider];
  if (!config) {
    const names = Object.keys(PROVIDERS).join(', ');
    throw new Error(`알 수 없는 provider입니다: "${provider}" — 사용 가능: ${names}`);
  }

  const key = apiKey || envKey(config.envVar);
  if (!key) {
    throw new Error(
      `${config.envVar}가 없습니다 — 환경변수로 설정하거나 리포 루트 .env에 ` +
      `${config.envVar}=... 한 줄을 넣어주세요. (${config.label})`
    );
  }

  const useModel = model || config.defaultModel;
  const url = `${config.base}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: useModel,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`${config.label} 호출이 ${TIMEOUT_MS / 1000}초 안에 끝나지 않아 중단했습니다.`);
    }
    throw new Error(`${config.label} 호출 중 네트워크 오류: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${config.label} 호출 실패 (HTTP ${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error(`${config.label} 응답에 텍스트가 없습니다 — 원본: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return text;
}

// CLI로 직접 실행된 경우
if (process.argv[1] && process.argv[1].endsWith('llm-bridge.mjs')) {
  const args = process.argv.slice(2);
  const opt = name => args.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
  const provider = opt('provider');
  const model = opt('model');
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

  if (!provider || !finalPrompt) {
    const providerList = Object.entries(PROVIDERS)
      .map(([name, c]) => `  ${name.padEnd(6)} ${c.label.padEnd(16)} 키 환경변수: ${c.envVar}`)
      .join('\n');
    console.error(
      '사용법: node tools/llm-bridge.mjs --provider=glm "질문" [--model=...] [--file=경로 ...]\n' +
      '       cat 문서.md | node tools/llm-bridge.mjs --provider=kimi\n' +
      '(클라우드 세션 프록시 환경에서는 NODE_USE_ENV_PROXY=1 을 명령 앞에 붙입니다)\n\n' +
      '사용 가능한 provider:\n' + providerList
    );
    process.exit(1);
  }

  try {
    const answer = await askLLM(provider, finalPrompt, { model });
    console.log(answer);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
