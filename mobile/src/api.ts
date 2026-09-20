import type { ApiError, DraftRequest, DraftResponse, RoutesRequest, RoutesResponse } from '@/contract';

// Always the deployed backend, never a laptop. Set in mobile/.env (see .env.example).
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// The shared key the backend asks for. Public by nature — EXPO_PUBLIC_* is compiled into the bundle — so it keeps
// strangers who find the URL off the billed Google and Anthropic keys, and nothing more. Real auth is out of scope.
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL is not set. Copy mobile/.env.example to mobile/.env.');
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(API_KEY ? { authorization: `Bearer ${API_KEY}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error((json as ApiError | null)?.error ?? `Request failed (${res.status})`);
  return json as T;
}

export const fetchRoutes = (req: RoutesRequest) => post<RoutesResponse>('/api/routes', req);
export const fetchDraft = (req: DraftRequest, signal?: AbortSignal) =>
  post<DraftResponse>('/api/draft', req, signal);
