// The one Claude call Fika makes. Structured output, no retries worth waiting for: the endpoint has about six
// seconds before the template answers instead, so this is built to come back fast or not at all.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { DraftRequest, DraftWords } from "@/lib/contract";
import type { DraftWriter } from "@/lib/draft";

/**
 * Who writes which language. Haiku writes the English. Its Swahili invents words ("taraharishi") and its Sheng
 * turns "sorry for the wait" into "sorry for waiting for her" (#8), so those two go to Sonnet, which writes them
 * properly: the notice goes out under the commuter's name and has to be a sentence they would have written.
 *
 * Sonnet thinks before it answers unless it is told not to, and thinking costs both the seconds this endpoint
 * does not have and the tokens the answer needs — left on, it ran 10 to 23 seconds and came back cut off. There
 * is nothing here to reason about: the numbers are all given, and the job is to say them in Sheng.
 */
const WRITER: Record<DraftRequest["language"], { model: string; thinking?: { type: "disabled" } }> = {
  en: { model: "claude-haiku-4-5-20251001" },
  sw: { model: "claude-sonnet-5", thinking: { type: "disabled" } },
  sheng: { model: "claude-sonnet-5", thinking: { type: "disabled" } },
};
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
  return async ({ system, user, language }, signal) => {
    const message = await client(apiKey).messages.create(
      {
        ...WRITER[language],
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
