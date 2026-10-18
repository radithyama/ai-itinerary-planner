import "server-only";

import { z } from "zod";
import { jsonGenerationConfig, SYSTEM_INSTRUCTION } from "@/lib/itinerary";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export class GeminiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

/** Calls Gemini with a JSON schema and validates the reply with the matching zod schema. */
export async function generateJson<T extends z.ZodTypeAny>(
  prompt: string,
  jsonSchema: object,
  schema: T
): Promise<z.infer<T>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY is not set");

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: jsonGenerationConfig(jsonSchema),
  });

  // One retry for transient overload errors.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body,
      signal: AbortSignal.timeout(90_000),
      cache: "no-store",
    });

    if (!res.ok) {
      if ((res.status === 503 || res.status === 500) && attempt === 0) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw new GeminiError(`Gemini ${res.status}: ${(await res.text()).slice(0, 500)}`, res.status);
    }

    const data = await res.json();
    const text: string | undefined = data.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("");
    if (!text) {
      throw new GeminiError(`Empty Gemini response (finishReason: ${data.candidates?.[0]?.finishReason ?? "none"})`);
    }
    return schema.parse(JSON.parse(text));
  }
}
