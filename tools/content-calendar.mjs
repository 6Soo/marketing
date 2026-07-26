import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const CALENDAR_PATH = join(REPO, 'data', 'calendar.json');

// 달력 데이터 로드
function loadCalendar() {
  if (!existsSync(CALENDAR_PATH)) {
    throw new Error('달력 데이터(data/calendar.json)가 없습니다.');
  }
  return JSON.parse(readFileSync(CALENDAR_PATH, 'utf8'));
}

// 달력 데이터 저장
function saveCalendar(data, dryRun = true) {
  if (dryRun) {
    console.log(`[Dry Run] 변경된 캘린더 데이터를 저장하지 않습니다.`);
    return;
  }
  writeFileSync(CALENDAR_PATH, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * 예정된 발행 항목 확인
 */
export function getUpcoming() {
  const data = loadCalendar();
  return data.queue;
}

/**
 * 다음 발행 항목 반환
 */
export function getNextPublish() {
  const queue = getUpcoming();
  if (queue.length === 0) return null;
  // 현재는 첫 번째 항목을 반환
  return queue[0];
}

/**
 * 큐에 추가
 */
export function addToQueue(item, live = false) {
  const data = loadCalendar();
  item.id = Date.now().toString();
  data.queue.push(item);
  saveCalendar(data, !live);
  console.log(`항목이 큐에 추가되었습니다:`, item);
}

/**
 * 과거 이력 반환
 */
export function getHistory() {
  const data = loadCalendar();
  return data.history;
}

// CLI 모드 실행 감지
if (process.argv[1] && process.argv[1].endsWith('content-calendar.mjs')) {
  const args = process.argv.slice(2);
  const command = args[0] || 'show';
  const live = args.includes('--live') || args.includes('--publish');

  if (command === 'show') {
    console.log('예정된 발행:', getUpcoming());
  } else if (command === 'next') {
    console.log('다음 발행 항목:', getNextPublish() || '대기 중인 항목 없음');
  } else if (command === 'history') {
    console.log('발행 이력:', getHistory());
  } else if (command === 'add') {
    console.log('항목을 큐에 추가합니다 (기본 텍스트)...');
    addToQueue({ channel: 'instagram', type: 'test', scheduledFor: new Date().toISOString() }, live);
  } else if (command === 'sync') {
    console.log('인사이트 데이터와 동기화 (기능 개발 중)');
  } else {
    console.error(`알 수 없는 명령입니다: ${command}`);
  }
}
