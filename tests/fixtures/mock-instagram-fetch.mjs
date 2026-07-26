const mode = process.env.MOCK_INSTAGRAM_MODE;
let nextId = 1;

globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  const method = init.method || 'GET';

  if (method === 'GET' && url.includes('/media?')) {
    const caption = mode === 'duplicate' ? '같은\r\n캡션 ' : '다른 캡션';
    return Response.json({
      data: [{ id: 'existing-media', caption, timestamp: '2026-07-25T00:00:00+0000' }],
    });
  }

  if (method === 'GET' && url.includes('fields=status_code')) {
    return Response.json({ status_code: 'FINISHED' });
  }

  if (method === 'POST') {
    return Response.json({ id: `mock-${nextId++}` });
  }

  return Response.json({ error: { message: `unexpected request: ${method} ${url}` } }, { status: 500 });
};
