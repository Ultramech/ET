import { generateText, generateObject, embedMany } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { z } from "zod";

// ---------------------------------------------------------------------------
// Multi-provider AI layer for Sutradhar.
//
// Priority: Gemini (direct, multimodal — best for P&ID vision) → Vercel AI
// Gateway (any "provider/model" string) → deterministic fallback. Every call
// is wrapped so a missing key / network error NEVER throws to the caller: it
// returns null and the domain logic degrades to its rule-based path.
// ---------------------------------------------------------------------------

const GEMINI_KEY =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const google = GEMINI_KEY ? createGoogleGenerativeAI({ apiKey: GEMINI_KEY }) : null;

const TEXT_MODEL = process.env.SUTRADHAR_MODEL || "gemini-2.5-flash";
const GATEWAY_TEXT = process.env.SUTRADHAR_GATEWAY_MODEL || "google/gemini-2.5-flash";
const EMBED_DIM = 768;

export type Provider = "gemini" | "gateway" | "none";

export function provider(): Provider {
  if (google) return "gemini";
  if (GATEWAY_KEY) return "gateway";
  return "none";
}

export interface Caps {
  llm: boolean;
  embeddings: boolean;
  vision: boolean;
  provider: Provider;
  model: string;
}

export function caps(): Caps {
  const p = provider();
  return {
    llm: p !== "none",
    embeddings: p !== "none",
    vision: p === "gemini", // multimodal image understanding
    provider: p,
    model: p === "gemini" ? TEXT_MODEL : p === "gateway" ? GATEWAY_TEXT : "fallback",
  };
}

// Back-compat helper used across the codebase.
export function isLLMAvailable(): boolean {
  return provider() !== "none";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function textModel(): any {
  if (google) return google(TEXT_MODEL);
  if (GATEWAY_KEY) return GATEWAY_TEXT;
  return null;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("ai-timeout")), ms)),
  ]);
}

/** Plain text completion. Returns null when no provider or on failure. */
// Gemini 2.5 "thinking" adds latency. For grounded RAG the answer quality comes
// from retrieval, so we default thinking OFF for speed and only spend a budget
// on genuinely multi-step reasoning (RCA / compliance).
function googleOpts(thinkingBudget: number) {
  return { google: { thinkingConfig: { thinkingBudget } } };
}

export async function llmText(opts: {
  system: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  thinkingBudget?: number;
}): Promise<string | null> {
  const model = textModel();
  if (!model) return null;
  try {
    const { text } = await withTimeout(
      generateText({
        model,
        system: opts.system,
        prompt: opts.prompt,
        temperature: opts.temperature ?? 0.2,
        maxOutputTokens: opts.maxOutputTokens ?? 900,
        providerOptions: googleOpts(opts.thinkingBudget ?? 0),
      }),
      opts.timeoutMs ?? 30000
    );
    return text.trim();
  } catch (err) {
    console.error("[ai] llmText failed:", (err as Error).message);
    return null;
  }
}

/** Back-compat alias. */
export const llmComplete = llmText;

/** Structured output constrained to a Zod schema. Returns null on failure. */
export async function llmObject<T>(opts: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
  timeoutMs?: number;
  thinkingBudget?: number;
}): Promise<T | null> {
  const model = textModel();
  if (!model) return null;
  try {
    const { object } = await withTimeout(
      generateObject({
        model,
        system: opts.system,
        prompt: opts.prompt,
        schema: opts.schema,
        temperature: opts.temperature ?? 0.1,
        providerOptions: googleOpts(opts.thinkingBudget ?? 0),
      }),
      opts.timeoutMs ?? 40000
    );
    return object as T;
  } catch (err) {
    console.error("[ai] llmObject failed:", (err as Error).message);
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Direct Gemini batch-embedding call. The AI SDK fans a batch out into many
// single requests which trips the free-tier rate limit; batchEmbedContents is
// one request per batch and is far kinder to quota.
async function geminiBatchEmbed(texts: string[]): Promise<number[][]> {
  const requests = texts.map((t) => ({
    model: "models/gemini-embedding-001",
    content: { parts: [{ text: t.slice(0, 8000) }] },
    outputDimensionality: EMBED_DIM,
  }));
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents",
    {
      method: "POST",
      headers: { "x-goog-api-key": GEMINI_KEY as string, "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
      signal: AbortSignal.timeout(60000),
    }
  );
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) throw new Error(`embed HTTP ${res.status}`);
  const data = await res.json();
  return (data.embeddings ?? []).map((e: { values: number[] }) => e.values);
}

/** Embed many texts. Returns null (not throw) when embeddings unavailable. */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (!texts.length) return [];
  try {
    if (google) {
      const out: number[][] = [];
      const BATCH = 10;
      for (let i = 0; i < texts.length; i += BATCH) {
        const batch = texts.slice(i, i + BATCH);
        let attempt = 0;
        // paced with backoff so we stay under the free-tier rate limit
        for (;;) {
          try {
            const vecs = await geminiBatchEmbed(batch);
            out.push(...vecs);
            break;
          } catch (e) {
            if ((e as Error).message === "RATE_LIMIT" && attempt < 4) {
              attempt++;
              await sleep(2000 * attempt);
              continue;
            }
            throw e;
          }
        }
        await sleep(250); // gentle pacing between batches
      }
      return out;
    }
    if (GATEWAY_KEY) {
      const out: number[][] = [];
      for (let i = 0; i < texts.length; i += 96) {
        const batch = texts.slice(i, i + 96).map((t) => t.slice(0, 8000));
        const { embeddings } = await withTimeout(
          embedMany({ model: "openai/text-embedding-3-small", values: batch }),
          45000
        );
        out.push(...embeddings);
      }
      return out;
    }
    return null;
  } catch (err) {
    console.error("[ai] embedTexts failed:", (err as Error).message);
    return null;
  }
}

export const EMBEDDING_DIM = EMBED_DIM;

// Fast, single-shot query embedding for retrieval. No retries, short timeout —
// if the embedding quota is momentarily unavailable we fall straight back to
// BM25 rather than making the user wait.
export async function embedQuery(text: string): Promise<number[] | null> {
  if (!google) return null;
  try {
    const vecs = await withTimeout(geminiBatchEmbed([text]), 4000);
    return vecs[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Direct Gemini vision → JSON. Bypasses the AI SDK structured-vision path
 * (which hangs on complex schemas) by asking the model for JSON directly and
 * parsing it. Robust: returns null on any error/timeout.
 */
export async function geminiVisionJSON(opts: {
  imageBase64: string;
  mimeType: string;
  prompt: string;
  thinkingBudget?: number;
  timeoutMs?: number;
}): Promise<unknown | null> {
  if (!GEMINI_KEY) return null;
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: opts.prompt },
          { inline_data: { mime_type: opts.mimeType, data: opts.imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      thinkingConfig: { thinkingBudget: opts.thinkingBudget ?? 0 },
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  };
  // vision models occasionally return 503 "high demand" or hit the per-minute
  // rate limit — retry the SAME model with backoff (secondary models may have
  // no free-tier quota, so falling back to them just guarantees failure).
  for (let attempt = 0; attempt < 4; attempt++) {
    const model = TEXT_MODEL;
    try {
      const res = await withTimeout(
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": GEMINI_KEY as string, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(opts.timeoutMs ?? 45000),
        }),
        (opts.timeoutMs ?? 45000) + 2000
      );
      const d = await res.json();
      if (d.error) {
        const msg = d.error.message || "";
        if (/high demand|overload|503|unavailable|429|quota/i.test(msg) && attempt < 3) {
          await sleep(1500 * (attempt + 1));
          continue;
        }
        throw new Error(msg);
      }
      const text: string =
        d.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      return JSON.parse(text);
    } catch (err) {
      const msg = (err as Error).message;
      if (attempt < 3 && /high demand|overload|503|unavailable|429|timeout|fetch failed/i.test(msg)) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      console.error("[ai] geminiVisionJSON failed:", msg);
      return null;
    }
  }
  return null;
}

/**
 * Multimodal extraction from an image (P&ID / engineering drawing / scanned
 * form). Gemini only. Returns structured object per schema, or null.
 */
export async function visionExtract<T>(opts: {
  imageBase64: string;
  mimeType: string;
  prompt: string;
  schema: z.ZodType<T>;
  timeoutMs?: number;
  thinkingBudget?: number;
}): Promise<T | null> {
  if (!google) return null;
  try {
    const { object } = await withTimeout(
      generateObject({
        model: google(TEXT_MODEL),
        schema: opts.schema,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: opts.prompt },
              {
                type: "image",
                image: `data:${opts.mimeType};base64,${opts.imageBase64}`,
              },
            ],
          },
        ],
        temperature: 0.1,
        providerOptions: googleOpts(opts.thinkingBudget ?? 1024),
      }),
      opts.timeoutMs ?? 90000
    );
    return object as T;
  } catch (err) {
    console.error("[ai] visionExtract failed:", (err as Error).message);
    return null;
  }
}
