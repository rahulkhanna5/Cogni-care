import Constants from 'expo-constants';

/**
 * The phone cannot reach "localhost" — that is the phone itself. The base URL
 * must be the development machine's LAN address, which is also the host in the
 * Expo URL the app was opened from, so we derive it rather than hardcoding it.
 */
function inferBaseUrl(): string {
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
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
  signal?: AbortSignal;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, accessToken, signal } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    // A dead server and a flaky connection look the same to fetch. Give the
    // user something actionable rather than "Network request failed".
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.');
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : {};

  if (!response.ok) {
    const err = (payload as ApiErrorBody).error;
    throw new ApiError(
      response.status,
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'Something went wrong.',
      err?.details
    );
  }

  return payload as T;
}
