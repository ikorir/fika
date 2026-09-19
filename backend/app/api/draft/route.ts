import { NextResponse } from "next/server";
import { z } from "zod";

import { claudeWriter } from "@/lib/claude";
import { type ApiError, DraftRequest } from "@/lib/contract";
import { draft, type DraftWriter } from "@/lib/draft";

const fail = (error: string, status: number) => NextResponse.json<ApiError>({ error }, { status });

// Without a key there is no Claude, but the commuter still needs words. Fail the call and let the template answer.
const noKey: DraftWriter = async () => {
  throw new Error("ANTHROPIC_API_KEY is not set on the backend.");
};

// POST /api/draft: DraftRequest → DraftResponse. One Claude call, or Fika's own words. Never errors for a Claude
// failure: `source` says which of the two answered.
export async function POST(request: Request) {
  const parsed = DraftRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(`Invalid request. ${z.prettifyError(parsed.error)}`, 400);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  return NextResponse.json(await draft(parsed.data, apiKey ? claudeWriter(apiKey) : noKey));
}
