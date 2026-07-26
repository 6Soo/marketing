import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { captureScreenshot, readPngSize } from '../cardnews/tools/chrome-capture.mjs';

const fakeBrowser = fileURLToPath(new URL('./fixtures/fake-screenshot-browser.mjs', import.meta.url));

test('PNG 생성 후 종료하지 않는 브라우저 프로세스도 정리하고 성공 처리한다', async () => {
  const output = join(tmpdir(), `chrome-capture-${process.pid}.png`);
  rmSync(output, { force: true });

  const result = await captureScreenshot(
    process.execPath,
    [fakeBrowser, `--screenshot=${output}`],
    output,
    { expectedWidth: 1, expectedHeight: 1, minBytes: 32, timeoutMs: 5_000, exitGraceMs: 100 }
  );

  assert.deepEqual(readPngSize(output), { width: 1, height: 1 });
  assert.equal(result.forcedShutdown, true);
  assert.equal(existsSync(output), true);
  rmSync(output, { force: true });
});
