// The one Claude call Fika makes. Haiku 4.5, structured output, no retries worth waiting for: the endpoint has about
// six seconds before the template answers instead, so this is built to come back fast or not at all.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { DraftWords } from "@/lib/contract";
import type { DraftWriter } from "@/lib/draft";

const MODEL = "claude-haiku-4-5-20251001";
// Three short pieces of writing. Room for Swahili and Sheng, which run longer than English.
const MAX_TOKENS = 1_024;

let cached: { apiKey: string; client: Anthropic } | undefined;

function client(apiKey: string): Anthropic {
  if (cached?.apiKey !== apiKey) cached = { apiKey, client: new Anthropic({ apiKey, maxRetries: 1 }) };
  return cached.client;
}

/**
 * Claude as the draft endpoint's writer: a prompt in, the raw text of its answer out. The answer is asked for as
 * JSON matching DraftWords, but nothing here trusts that — `draft()` validates it and checks the ETA.
 */
export function claudeWriter(apiKey: string): DraftWriter {
  return async ({ system, user }, signal) => {
    const message = await client(apiKey).messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: "user", content: user }],
        output_config: { format: zodOutputFormat(DraftWords) },
      },
      { signal },
    );
    return message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
  };
}
