import type {
  ApiError,
  DraftRequest,
  DraftResponse,
  Place,
  PlaceSuggestions,
  RoutesRequest,
  RoutesResponse,
} from '@/contract';

// Always the deployed backend, never a laptop. Set in mobile/.env (see .env.example).
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// The shared key the backend asks for. Public by nature — EXPO_PUBLIC_* is compiled into the bundle — so it keeps
// strangers who find the URL off the billed Google and Anthropic keys, and nothing more. Real auth is out of scope.
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

const authorization: Record<string, string> = API_KEY ? { authorization: `Bearer ${API_KEY}` } : {};

async function call<T>(path: string, init: RequestInit & { headers?: Record<string, string> }): Promise<T> {
  if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL is not set. Copy mobile/.env.example to mobile/.env.');
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...authorization, ...init.headers } });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error((json as ApiError | null)?.error ?? `Request failed (${res.status})`);
  return json as T;
}

const post = <T>(path: string, body: unknown, signal?: AbortSignal) =>
  call<T>(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal });


const get = <T>(path: string, signal?: AbortSignal) => call<T>(path, { signal });

export const fetchRoutes = (req: RoutesRequest) => post<RoutesResponse>('/api/routes', req);
export const fetchDraft = (req: DraftRequest, signal?: AbortSignal) =>
  post<DraftResponse>('/api/draft', req, signal);

/** Places to pick from as the commuter types an address. Kenya only; the key stays on the backend. */
export const searchPlaces = (q: string, signal?: AbortSignal) =>
  get<PlaceSuggestions>(`/api/places/autocomplete?q=${encodeURIComponent(q)}`, signal);

/** The place behind a suggestion, with the coordinates the commute is stored with. */
export const fetchPlace = (placeId: string, signal?: AbortSignal) =>
  get<Place>(`/api/places/details?placeId=${encodeURIComponent(placeId)}`, signal);
