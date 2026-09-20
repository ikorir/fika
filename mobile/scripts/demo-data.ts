/**
 * Regenerates the demo's bundled data: src/demo/saved-routes.json and src/demo/saved-drafts.json.
 *
 *   cd backend && npx next dev --port 3111
 *   cd mobile  && API_URL=http://localhost:3111 API_KEY=<the backend's FIKA_API_KEY> \
 *                 npx tsx scripts/demo-data.ts [--routes 2026-09-21]
 *
 * Without --routes it keeps the saved response and only rewrites the words, which is what a late change to the
 * wording needs. With --routes it fetches a fresh one from Google for that weekday morning first — about six
 * billed calls, and no guarantee the stage arc still holds on the new numbers, which is what the tests in
 * src/demo/saved.test.ts are there to tell you.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { DraftRequest, DraftResponse, RoutesResponse } from '@/contract';
import { savedKey, scriptSteps } from '@/demo/saved';
import { draftRequest } from '@/draft/request';
import { LANGUAGES, TONES, type Voice } from '@/notice/voice';
import { seedCommute } from '@/seed';
import { nairobiTimeOnDay } from '@/time';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const API_KEY = process.env.API_KEY ?? '';
const DIR = join(__dirname, '..', 'src', 'demo');

const commute = seedCommute;
const voices: Voice[] = TONES.flatMap((t) => LANGUAGES.map((l) => ({ tone: t.value, language: l.value })));

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(API_KEY ? { authorization: `Bearer ${API_KEY}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} answered ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

const write = (name: string, data: unknown) => {
  writeFileSync(join(DIR, name), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`wrote src/demo/${name}`);
};

/** A weekday morning's routes for the seeded commute, as the app would fetch them on that morning. */
async function fetchRoutes(day: string): Promise<RoutesResponse> {
  const on = new Date(`${day}T12:00:00+03:00`);
  const response = await post<RoutesResponse>('/api/routes', {
    origin: commute.origin.location,
    destination: commute.destination.location,
    arriveBy: nairobiTimeOnDay(commute.arriveBy, on),
    usualDeparture: nairobiTimeOnDay(commute.usualDeparture, on),
  });
  // The "now" sample was fetched the day before the morning it is about, and the engine reads the deadline off the
  // earliest sample, so keeping it would judge the whole response against the wrong day.
  return { ...response, samples: response.samples.filter((s) => s.kind !== 'now') };
}

/**
 * Claude's own words, asked for again if the backend answered with its template. The endpoint sends the template
 * whenever an answer is late or states a number the engine did not compute, and the app only ever offers Claude's,
 * so a saved template would leave that screen wording itself.
 *
 * Asking again is usually enough. The one screen that needs several goes is the at-risk one in English, where
 * Claude keeps writing the notice around the arrival of the road it is suggesting they switch to rather than the
 * ETA of the road they are on, and the endpoint rightly refuses it.
 */
async function claudeWords(req: DraftRequest, tries = 8): Promise<DraftResponse> {
  for (let attempt = 1; attempt <= tries; attempt++) {
    const words = await post<DraftResponse>('/api/draft', req);
    if (words.source === 'claude') return words;
  }
  throw new Error(`${savedKey(req)}: the backend answered with its own template ${tries} times.`);
}

/** Claude's words for every step of the script, in every tone and language. Six at a time, one step at a time. */
async function fetchDrafts(routes: RoutesResponse): Promise<Record<string, DraftResponse>> {
  const saved: Record<string, DraftResponse> = {};
  for (const step of scriptSteps(commute, routes.samples)) {
    const requests = voices.map((voice) => draftRequest(commute, step.evaluation, step.simulation, voice));
    const words = await Promise.all(requests.map((req) => claudeWords(req)));
    requests.forEach((req, i) => {
      saved[savedKey(req)] = words[i];
    });
    console.log(`${step.scenario}: ${requests.length} drafts`);
  }
  return saved;
}

async function main() {
  const day = process.argv[process.argv.indexOf('--routes') + 1];
  let routes = (await import('@/demo/saved-routes.json')).default as RoutesResponse;
  if (process.argv.includes('--routes')) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? '')) throw new Error('--routes needs a day, e.g. --routes 2026-09-21.');
    routes = await fetchRoutes(day);
    write('saved-routes.json', routes);
  }
  write('saved-drafts.json', await fetchDrafts(routes));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
