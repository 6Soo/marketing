import { writeFileSync } from 'node:fs';

const output = process.argv.find(arg => arg.startsWith('--screenshot='))?.slice('--screenshot='.length);
if (!output) process.exit(2);

const png1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);
writeFileSync(output, png1x1);

// Windows Edge에서 관찰된 것처럼 파일 생성 뒤 프로세스가 끝나지 않는 상황을 재현한다.
setInterval(() => {}, 60_000);
