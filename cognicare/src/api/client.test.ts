import { ApiError, request } from './client';

/** A server that never answers, or answers headers and then stalls the body. */
function stalledFetch(bodyStalls: boolean) {
  return jest.fn(
    (_url: string, _init: RequestInit) =>
      new Promise<Response>((resolve) => {
        if (!bodyStalls) return; // never answers
        resolve({ status: 200, ok: true, text: () => new Promise<string>(() => undefined) } as unknown as Response);
      })
  );
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

it('times out without aborting: nothing is left to reject unhandled', async () => {
  jest.useFakeTimers();
  const f = stalledFetch(false);
  globalThis.fetch = f as unknown as typeof fetch;
  const result = request('/x', { timeoutMs: 1000 }).catch((e) => e);
  await jest.advanceTimersByTimeAsync(1000);
  expect(await result).toMatchObject({ code: 'NETWORK_ERROR' });
  // No AbortSignal of our own was handed to fetch, so no abort can fire.
  expect((f.mock.calls[0]![1] as RequestInit).signal).toBeUndefined();
});

it('a request that fails after the timeout is swallowed, not reported', async () => {
  jest.useFakeTimers();
  let fail!: (e: unknown) => void;
  globalThis.fetch = jest.fn(() => new Promise<Response>((_r, rej) => (fail = rej))) as unknown as typeof fetch;
  const unhandled = jest.fn();
  process.on('unhandledRejection', unhandled);
  const result = request('/x', { timeoutMs: 1000 }).catch((e) => e);
  await jest.advanceTimersByTimeAsync(1000);
  await result;
  fail(new Error('connection reset'));
  await jest.advanceTimersByTimeAsync(10);
  jest.useRealTimers();
  await new Promise((r) => setTimeout(r, 20));
  process.off('unhandledRejection', unhandled);
  expect(unhandled).not.toHaveBeenCalled();
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
