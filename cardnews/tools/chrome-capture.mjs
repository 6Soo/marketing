import { closeSync, existsSync, openSync, readSync, rmSync, statSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export function readPngSize(file) {
  const fd = openSync(file, 'r');
  try {
    const header = Buffer.alloc(24);
    if (readSync(fd, header, 0, header.length, 0) !== header.length) {
      throw new Error('PNG 헤더가 완성되지 않았습니다.');
    }
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (!header.subarray(0, 8).equals(signature) || header.toString('ascii', 12, 16) !== 'IHDR') {
      throw new Error('PNG 서명 또는 IHDR이 올바르지 않습니다.');
    }
    return {
      width: header.readUInt32BE(16),
      height: header.readUInt32BE(20),
    };
  } finally {
    closeSync(fd);
  }
}

async function stopProcessTree(child) {
  if (!child.pid || child.exitCode !== null) return false;

  if (process.platform === 'win32') {
    const result = spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    if (result.status !== 0 && child.exitCode === null) child.kill();
  } else {
    child.kill('SIGTERM');
    await delay(300);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
  return true;
}

export async function captureScreenshot(browser, browserArgs, outputFile, options = {}) {
  const {
    expectedWidth = 1080,
    expectedHeight = 1350,
    minBytes = 1024,
    timeoutMs = 45_000,
    exitGraceMs = 800,
  } = options;

  rmSync(outputFile, { force: true });
  const child = spawn(browser, browserArgs, {
    stdio: 'ignore',
    windowsHide: true,
  });

  let spawnError = null;
  let closed = false;
  child.once('error', error => { spawnError = error; });
  child.once('close', () => { closed = true; });

  const deadline = Date.now() + timeoutMs;
  let lastSize = -1;
  let stableReads = 0;
  let png = null;

  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;

    if (existsSync(outputFile)) {
      try {
        const size = statSync(outputFile).size;
        const dimensions = readPngSize(outputFile);
        if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) {
          throw new Error(
            `PNG 크기 불일치: ${dimensions.width}×${dimensions.height} (기대 ${expectedWidth}×${expectedHeight})`
          );
        }
        stableReads = size === lastSize ? stableReads + 1 : 0;
        lastSize = size;
        if (size >= minBytes && stableReads >= 2) {
          png = { ...dimensions, bytes: size };
          break;
        }
      } catch (error) {
        if (error.message.startsWith('PNG 크기 불일치')) throw error;
      }
    }

    if (closed && !existsSync(outputFile)) {
      throw new Error(`브라우저가 PNG를 만들지 않고 종료했습니다(code=${child.exitCode ?? 'unknown'}).`);
    }
    await delay(100);
  }

  if (!png) {
    await stopProcessTree(child);
    throw new Error(`브라우저 캡처 타임아웃(${Math.round(timeoutMs / 1000)}초): ${outputFile}`);
  }

  const graceDeadline = Date.now() + exitGraceMs;
  while (!closed && Date.now() < graceDeadline) await delay(50);
  const forcedShutdown = await stopProcessTree(child);

  return { ...png, forcedShutdown };
}
