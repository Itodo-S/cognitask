import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

export interface JsonSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface MessageOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** Prior turns, for multi-turn chat. */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface StructuredOptions<T> extends MessageOptions {
  /** Name of the synthetic tool the model must call. */
  toolName: string;
  toolDescription: string;
  schema: JsonSchema;
  /** Last-resort value if the model and every retry fail. */
  fallback: T;
}

const DEFAULT_MODEL = "claude-opus-5";
const MAX_ATTEMPTS = 3;

function cleanString(val?: string): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "");
}

function apiUrl(): string {
  const rawUrl = cleanString(env.ANTHROPIC_BASE_URL) || "https://api.anthropic.com";
  let baseUrl = rawUrl.replace(/\/+$/, "");
  if (baseUrl.endsWith("/v1/messages")) return baseUrl;
  if (baseUrl.endsWith("/v1")) return `${baseUrl}/messages`;
  return `${baseUrl}/v1/messages`;
}

function headers(): Record<string, string> {
  const apiKey = cleanString(env.ANTHROPIC_AUTH_TOKEN) || cleanString(env.ANTHROPIC_API_KEY) || "";
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    Authorization: `Bearer ${apiKey}`,
    "anthropic-version": "2023-06-01",
    "User-Agent": "claude-cli/1.0.108 (external, cli)",
    "X-Stainless-Arch": "x64",
    "X-Stainless-Lang": "js",
    "X-Stainless-OS": "Linux",
  };
}

export function aiConfigured(): boolean {
  return Boolean(cleanString(env.ANTHROPIC_API_KEY) || cleanString(env.ANTHROPIC_AUTH_TOKEN));
}

export function modelName(): string {
  return cleanString(env.ANTHROPIC_MODEL) || cleanString(env.CLAUDE_MODEL) || DEFAULT_MODEL;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callApi(body: Record<string, unknown>, timeoutMs: number): Promise<any> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(apiUrl(), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.ok) return await res.json();

      const detail = await res.text().catch(() => "");
      // 4xx other than rate limiting will not get better by trying again.
      if (res.status < 500 && res.status !== 429) {
        throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 400)}`);
      }
      lastError = new Error(`Anthropic API ${res.status}: ${detail.slice(0, 200)}`);
    } catch (err) {
      lastError = err;
      if (String(err).includes("Anthropic API 4")) throw err;
    }

    if (attempt < MAX_ATTEMPTS) {
      const backoff = 500 * 2 ** (attempt - 1);
      logger.warn("Anthropic call failed, retrying", { attempt, backoff, error: String(lastError) });
      await sleep(backoff);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Plain text completion. */
export async function message(prompt: string, options: MessageOptions = {}): Promise<string> {
  const data = await callApi(
    {
      model: modelName(),
      max_tokens: options.maxTokens ?? 2048,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options.system ? { system: options.system } : {}),
      messages: [...(options.history ?? []), { role: "user", content: prompt }],
    },
    options.timeoutMs ?? 120_000
  );

  return (data.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n")
    .trim();
}

/** Pull the first balanced JSON object/array out of a text blob. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fenced?.[1], text].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      /* fall through to brace scanning */
    }

    for (const [open, close] of [
      ["{", "}"],
      ["[", "]"],
    ] as const) {
      const start = trimmed.indexOf(open);
      if (start === -1) continue;

      let depth = 0;
      let inString = false;
      let escaped = false;

      for (let i = start; i < trimmed.length; i++) {
        const ch = trimmed[i];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === '"') inString = !inString;
        if (inString) continue;
        if (ch === open) depth++;
        else if (ch === close) {
          depth--;
          if (depth === 0) {
            try {
              return JSON.parse(trimmed.slice(start, i + 1));
            } catch {
              break;
            }
          }
        }
      }
    }
  }
  return null;
}

/**
 * Ask the model for a value matching `schema`. Uses tool-calling so the model
 * returns real structured data; falls back to parsing JSON out of prose if the
 * upstream endpoint does not support tools.
 */
export async function structured<T>(prompt: string, options: StructuredOptions<T>): Promise<T> {
  const { toolName, toolDescription, schema, fallback, ...rest } = options;

  const body: Record<string, unknown> = {
    model: modelName(),
    max_tokens: rest.maxTokens ?? 4096,
    ...(rest.temperature !== undefined ? { temperature: rest.temperature } : {}),
    ...(rest.system ? { system: rest.system } : {}),
    messages: [...(rest.history ?? []), { role: "user", content: prompt }],
    tools: [{ name: toolName, description: toolDescription, input_schema: schema }],
    tool_choice: { type: "tool", name: toolName },
  };

  try {
    const data = await callApi(body, rest.timeoutMs ?? 120_000);
    const toolUse = (data.content ?? []).find((b: any) => b.type === "tool_use");
    if (toolUse?.input && typeof toolUse.input === "object") {
      return toolUse.input as T;
    }

    const text = (data.content ?? [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");
    const parsed = extractJson(text);
    if (parsed && typeof parsed === "object") return parsed as T;

    logger.warn("Structured call returned no usable payload", { toolName });
  } catch (err) {
    logger.error("Structured call failed, retrying without tools", {
      toolName,
      error: String(err),
    });
  }

  // Second chance: ask for raw JSON without the tools API.
  try {
    const text = await message(
      `${prompt}\n\nRespond with ONLY a JSON object matching this schema, no prose, no code fences:\n${JSON.stringify(
        schema
      )}`,
      { ...rest, maxTokens: rest.maxTokens ?? 4096 }
    );
    const parsed = extractJson(text);
    if (parsed && typeof parsed === "object") return parsed as T;
  } catch (err) {
    logger.error("JSON fallback failed", { toolName, error: String(err) });
  }

  return fallback;
}

export const anthropic = { message, structured, aiConfigured, modelName };
