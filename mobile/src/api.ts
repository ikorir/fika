import type { ApiError, DraftRequest, DraftResponse, RoutesRequest, RoutesResponse } from '@/contract';

// Always the deployed backend, never a laptop. Set in mobile/.env (see .env.example).
const API_URL = process.env.EXPO_PUBLIC_API_URL;

async function post<T>(path: string, body: unknown): Promise<T> {
  if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL is not set. Copy mobile/.env.example to mobile/.env.');
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error((json as ApiError | null)?.error ?? `Request failed (${res.status})`);
  return json as T;
}

export const fetchRoutes = (req: RoutesRequest) => post<RoutesResponse>('/api/routes', req);
export const fetchDraft = (req: DraftRequest) => post<DraftResponse>('/api/draft', req);
