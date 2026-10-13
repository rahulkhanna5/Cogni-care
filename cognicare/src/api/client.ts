import Constants from 'expo-constants';

/**
 * The phone cannot reach "localhost" — that is the phone itself. The base URL
 * must be the development machine's LAN address, which is also the host in the
 * Expo URL the app was opened from, so we derive it rather than hardcoding it.
 */
function inferBaseUrl(): string {
  // An installed APK has no Expo host to follow, so its build bakes in the
  // hosted API (eas.json sets EXPO_PUBLIC_API_URL). Development leaves it
  // unset and keeps following the Mac on the LAN.
  const fromBuild = process.env.EXPO_PUBLIC_API_URL;
  if (fromBuild) return fromBuild;

  const fromConfig = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (fromConfig) return fromConfig;

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:4000/api/v1`;

  return 'http://localhost:4000/api/v1';
}

export const API_BASE_URL = inferBaseUrl();

export type ApiErrorBody = { error: { code: string; message: string; details?: unknown } };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type Tokens = { accessToken: string; refreshToken: string };

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
  signal?: AbortSignal;
  /** Give up after this long. AI calls pass a longer limit — see chat.api. */
  timeoutMs?: number;
};

/**
 * fetch has no timeout of its own, so a request the server never answered
 * hung forever — and at boot that meant a spinner with no way out, for an app
 * whose exercises are meant to work without the server at all.
 */
export const DEFAULT_TIMEOUT_MS = 20_000;
/** AI replies can legitimately take a while: the server may try more than one model. */
export const AI_TIMEOUT_MS = 120_000;

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, accessToken, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  // The timeout is a race, NOT an abort. Aborting a fetch made Expo's native
  // fetch (and some browsers) leave an internal promise rejected with no
  // handler, which surfaced as "Uncaught Error: signal is aborted without
  // reason" even though this function had caught it. On a timeout we simply
  // stop waiting; the abandoned request finishes or fails on its own, and its
  // outcome is swallowed below. A caller's own `signal` is still honoured.
  const exchange = (async () => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
    // Headers AND body inside the race, so a reply that stalls half-way also
    // times out instead of hanging.
    const s = response.status;
    return { status: s, text: s === 204 ? '' : await response.text() };
  })();
  exchange.catch(() => undefined); // never an unhandled rejection, even after a timeout

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
  });

  let status: number;
  let text: string;
  try {
    ({ status, text } = await Promise.race([exchange, timedOut]));
  } catch {
    // A dead server, a flaky connection and a timeout look the same to the
    // user. Give them something actionable rather than "Network request failed".
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.');
  } finally {
    clearTimeout(timer);
  }

  if (status === 204) return undefined as T;

  // A waking or failing host can answer with an HTML page. That is not JSON,
  // and "Unexpected token <" is not something to show anyone.
  let payload: unknown = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiError(
        status,
        'BAD_RESPONSE',
        'The server sent a reply the app could not read. Please try again in a moment.'
      );
    }
  }

  if (status < 200 || status >= 300) {
    const err = (payload as ApiErrorBody).error;
    throw new ApiError(
      status,
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'Something went wrong.',
      err?.details
    );
  }

  return payload as T;
}
