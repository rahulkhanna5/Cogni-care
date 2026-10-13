import { ApiError, request } from './client';

/** A fetch that honours its AbortSignal, like the real one. */
function stalledFetch(bodyStalls: boolean) {
  return jest.fn((_url: string, init: { signal: AbortSignal }) => {
    return new Promise<Response>((resolve, reject) => {
      const abort = () => reject(new DOMException('signal is aborted without reason', 'AbortError'));
      if (!bodyStalls) {
        init.signal.addEventListener('abort', abort);
        return; // never answers
      }
      resolve({
        status: 200,
        ok: true,
        text: () =>
          new Promise<string>((_r, rej) =>
            init.signal.addEventListener('abort', () =>
              rej(new DOMException('signal is aborted without reason', 'AbortError'))
            )
          ),
      } as unknown as Response);
    });
  });
}

const reply = (status: number, text: string) =>
  jest.fn(async () => ({ status, ok: status >= 200 && status < 300, text: async () => text }) as unknown as Response);

afterEach(() => {
  jest.useRealTimers();
});

it('a request the server never answers ends as a friendly network error', async () => {
  jest.useFakeTimers();
  globalThis.fetch = stalledFetch(false) as unknown as typeof fetch;
  const result = request('/x', { timeoutMs: 1000 }).catch((e) => e);
  await jest.advanceTimersByTimeAsync(1000);
  const err = await result;
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
});

it('a body that stalls after the headers is also a network error, not a raw AbortError', async () => {
  jest.useFakeTimers();
  globalThis.fetch = stalledFetch(true) as unknown as typeof fetch;
  const result = request('/x', { timeoutMs: 1000 }).catch((e) => e);
  await jest.advanceTimersByTimeAsync(1000);
  const err = await result;
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
});

it('an HTML error page from the host is a readable error, not "Unexpected token <"', async () => {
  globalThis.fetch = reply(502, '<html>Bad gateway</html>') as unknown as typeof fetch;
  const err = await request('/x').catch((e) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ status: 502, code: 'BAD_RESPONSE' });
});

it('still returns JSON, passes 204 through, and keeps the server error code', async () => {
  globalThis.fetch = reply(200, '{"ok":true}') as unknown as typeof fetch;
  await expect(request('/x')).resolves.toEqual({ ok: true });

  globalThis.fetch = reply(204, '') as unknown as typeof fetch;
  await expect(request('/x')).resolves.toBeUndefined();

  globalThis.fetch = reply(
    403,
    JSON.stringify({ error: { code: 'EMAIL_NOT_VERIFIED', message: 'Confirm first.' } })
  ) as unknown as typeof fetch;
  await expect(request('/x')).rejects.toMatchObject({ status: 403, code: 'EMAIL_NOT_VERIFIED' });
});
