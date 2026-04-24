import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  pitcher_number: z.string().min(1).max(8),
  team: z.string().min(1).max(64).nullable(),
  tag_counts: z
    .array(
      z.object({
        tag: z.string().min(1).max(64),
        count: z.number().int().min(1).max(999),
      }),
    )
    .max(40),
  last_inning_seen: z.number().int().min(0).max(30),
  status: z.enum(["active", "finished"]),
});

export type PitcherCoachCallInput = z.infer<typeof InputSchema>;

export interface PitcherCoachCallResult {
  coach_call: string;
  confidence: "high" | "medium" | "low";
  source: "ai" | "fallback";
  error?: string;
}

const SYSTEM_PROMPT = `You are a baseball dugout coach giving a one-line scouting call on an opposing pitcher.

RULES:
- Use ONLY the tags provided. Do not invent pitches, velocity, or behavior not in the tags.
- coach_call MUST be under 18 words.
- coach_call MUST sound like something a coach yells in a dugout (direct, actionable, present tense).
- If total tag count < 3 OR no clear pattern, return "Need more intel" with confidence "low".
- confidence: "high" if 5+ total observations and a clear dominant pattern, "medium" if 3-4 observations, "low" otherwise.
- Never reference player names or anything not in the structured input.

Return your answer ONLY by calling the report_coach_call function.`;

export const getAiCoachCall = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<PitcherCoachCallResult> => {
    const total = data.tag_counts.reduce((s, t) => s + t.count, 0);
    if (total < 2) {
      return {
        coach_call: "Need more intel",
        confidence: "low",
        source: "ai",
      };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        coach_call: "",
        confidence: "low",
        source: "fallback",
        error: "missing_key",
      };
    }

    const userMessage = [
      `Pitcher #${data.pitcher_number}${data.team ? ` (${data.team})` : ""}, last seen inning ${data.last_inning_seen}, status: ${data.status}.`,
      `Tag observations:`,
      ...data.tag_counts.map((t) => `- ${t.tag} (${t.count})`),
    ].join("\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: "openai/gpt-5-mini",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userMessage },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "report_coach_call",
                  description:
                    "Report a one-line dugout coaching call for the opposing pitcher.",
                  parameters: {
                    type: "object",
                    properties: {
                      coach_call: {
                        type: "string",
                        description:
                          "Under 18 words, present-tense, actionable dugout call.",
                      },
                      confidence: {
                        type: "string",
                        enum: ["high", "medium", "low"],
                      },
                    },
                    required: ["coach_call", "confidence"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: {
              type: "function",
              function: { name: "report_coach_call" },
            },
          }),
        },
      );

      if (!res.ok) {
        const errCode =
          res.status === 429
            ? "rate_limited"
            : res.status === 402
              ? "payment_required"
              : `gateway_${res.status}`;
        console.error("[pitcher-coach-call] gateway error", res.status);
        return {
          coach_call: "",
          confidence: "low",
          source: "fallback",
          error: errCode,
        };
      }

      const json = await res.json();
      const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
      const argsRaw = toolCall?.function?.arguments;
      if (!argsRaw) {
        return {
          coach_call: "",
          confidence: "low",
          source: "fallback",
          error: "no_tool_call",
        };
      }
      const args = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
      const out = z
        .object({
          coach_call: z.string().min(1).max(200),
          confidence: z.enum(["high", "medium", "low"]),
        })
        .parse(args);

      // Enforce word cap server-side
      const words = out.coach_call.split(/\s+/);
      const trimmed =
        words.length > 18 ? words.slice(0, 18).join(" ") + "…" : out.coach_call;

      return {
        coach_call: trimmed,
        confidence: out.confidence,
        source: "ai",
      };
    } catch (e) {
      const isAbort = e instanceof Error && e.name === "AbortError";
      console.error("[pitcher-coach-call] failed", e);
      return {
        coach_call: "",
        confidence: "low",
        source: "fallback",
        error: isAbort ? "timeout" : "exception",
      };
    } finally {
      clearTimeout(timeout);
    }
  });
