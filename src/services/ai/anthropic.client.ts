import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { describeError } from "../../utils/helpers.js";
import { cleanString, extractJson, postJson } from "./http.js";
import type { MessageOptions, StructuredOptions } from "./types.js";

export type { JsonSchema, MessageOptions, StructuredOptions } from "./types.js";

const DEFAULT_MODEL = "claude-opus-5";

function apiUrl(): string {
  const rawUrl = cleanString(env.ANTHROPIC_BASE_URL) || "https://api.anthropic.com";
  const baseUrl = rawUrl.replace(/\/+$/, "");
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

async function callApi(body: Record<string, unknown>, timeoutMs: number): Promise<any> {
  return postJson({ url: apiUrl(), headers: headers(), body, timeoutMs, label: "Anthropic API" });
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
      error: describeError(err),
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
    logger.error("JSON fallback failed", { toolName, error: describeError(err) });
  }

  return fallback;
}

export const anthropic = { message, structured, aiConfigured, modelName };
