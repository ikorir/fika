/**
 * A shared key, not real auth. The backend is public and holds the Google and Anthropic keys, so anyone who reads
 * the URL out of the app can spend them. The app sends the key on every call; calls without it are refused.
 *
 * The key ships inside the app bundle (EXPO_PUBLIC_*), so whoever has the app can extract it. It closes the door
 * to the internet at large, not to a determined person — for a weekend with billed keys behind it, that is the trade.
 *
 * Unset on the backend means open, and says so in the log: a deploy that lands before the Coolify variable does
 * keeps answering the app. To close that instead, return the 401 when `expected` is missing.
 */
import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import type { ApiError } from "@/lib/contract";

const BEARER = /^Bearer (.+)$/;

// Compared byte by byte in constant time: a length-leaking early return is all a guesser needs.
function matches(sent: string, expected: string): boolean {
  const a = Buffer.from(sent);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** null when the request may go through, the 401 to return when it may not. Runs before anything is parsed. */
export function refuse(request: Request): NextResponse<ApiError> | null {
  const expected = process.env.FIKA_API_KEY;
  if (!expected) {
    console.warn("FIKA_API_KEY is not set on the backend: /api is open to anyone who knows the URL.");
    return null;
  }

  const sent = BEARER.exec(request.headers.get("authorization") ?? "")?.[1];
  if (sent && matches(sent, expected)) return null;
  return NextResponse.json<ApiError>({ error: "Unauthorized." }, { status: 401 });
}
