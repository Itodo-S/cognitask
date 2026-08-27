import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { describeError } from "../../utils/helpers.js";
import { cleanString, extractJson, postJson } from "./http.js";
import type { MessageOptions, StructuredOptions } from "./types.js";

/**
 * One client for every OpenAI-compatible endpoint. Groq and Gemini both speak
 * this dialect, so switching providers is a base URL and a model id — no
 * schema or prompt changes. Unlike the Anthropic client this sends nothing but
 * a normal bearer token, which is why it survives being hosted.
 */
interface Provider {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

const DEFAULTS = {
  groq: { baseUrl: "https://api.groq.com/openai/v1", model: "moonshotai/kimi-k2-instruct" },
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-flash" },
} as const;

function groq(): Provider | null {
  const apiKey = cleanString(env.GROQ_API_KEY);
  if (!apiKey) return null;
  return {
    name: "groq",
    baseUrl: cleanString(env.GROQ_BASE_URL) || DEFAULTS.groq.baseUrl,
    apiKey,
    model: cleanString(env.GROQ_MODEL) || DEFAULTS.groq.model,
  };
}

function gemini(): Provider | null {
  const apiKey = cleanString(env.GEMINI_API_KEY);
  if (!apiKey) return null;
  return {
    name: "gemini",
    baseUrl: cleanString(env.GEMINI_BASE_URL) || DEFAULTS.gemini.baseUrl,
    apiKey,
    model: cleanString(env.GEMINI_MODEL) || DEFAULTS.gemini.model,
  };
}

/**
 * Providers in the order they should be tried. Groq leads: it has the largest
 * free daily allowance, answers fastest, and does not train on what we send it.
 * Gemini is the fallback for when Groq's free tier rate-limits.
 */
export function providerChain(): Provider[] {
  if (env.AI_PROVIDER === "groq") return [groq()].filter(Boolean) as Provider[];
  if (env.AI_PROVIDER === "gemini") return [gemini()].filter(Boolean) as Provider[];
  return [groq(), gemini()].filter(Boolean) as Provider[];
}

export function aiConfigured(): boolean {
  return providerChain().length > 0;
}

export function modelName(): string {
  return providerChain()[0]?.model ?? "";
}

/** e.g. "groq" or "groq→gemini" — shown on /api/ai/status and in startup logs. */
export function providerLabel(): string {
  const names = providerChain().map((p) => p.name);
  return names.length ? names.join("→") : "unconfigured";
}

/**
 * Try each provider in turn. A failure anywhere — rate limit, dead key, bad
 * model id — moves to the next rather than giving up, and every failure is
 * logged with its provider so a misconfiguration is never silently masked.
 */
async function callChain(
  bodyFor: (provider: Provider) => Record<string, unknown>,
  timeoutMs: number
): Promise<any> {
  const chain = providerChain();
  if (chain.length === 0) {
    throw new Error("No AI provider configured — set GROQ_API_KEY or GEMINI_API_KEY.");
  }

  const failures: string[] = [];

  for (const [index, provider] of chain.entries()) {
    const isLast = index === chain.length - 1;
    try {
      const data = await postJson({
        url: `${provider.baseUrl.replace(/\/+$/, "")}/chat/completions`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: bodyFor(provider),
        timeoutMs,
        label: provider.name,
        // Only wait out a rate limit when there is nothing to fall back to.
        retryRateLimits: isLast,
      });
      if (provider !== chain[0]) {
        logger.info("AI call served by fallback provider", { provider: provider.name, model: provider.model });
      }
      return data;
    } catch (err) {
      const detail = describeError(err);
      failures.push(`${provider.name}: ${detail.slice(0, 200)}`);
      logger.error("AI provider failed", { provider: provider.name, model: provider.model, error: detail });
    }
  }

  throw new Error(`All AI providers failed — ${failures.join(" | ")}`);
}

function buildMessages(prompt: string, options: MessageOptions) {
  return [
    ...(options.system ? [{ role: "system" as const, content: options.system }] : []),
    ...(options.history ?? []),
    { role: "user" as const, content: prompt },
  ];
}

/** Plain text completion. */
export async function message(prompt: string, options: MessageOptions = {}): Promise<string> {
  const data = await callChain(
    (provider) => ({
      model: provider.model,
      max_tokens: options.maxTokens ?? 2048,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      messages: buildMessages(prompt, options),
    }),
    options.timeoutMs ?? 120_000
  );

  return String(data?.choices?.[0]?.message?.content ?? "").trim();
}

/** Read the arguments of a forced function call, whatever shape they arrive in. */
function readToolCall(data: any): unknown {
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;
  if (typeof args === "object") return args;
  try {
    return JSON.parse(args);
  } catch {
    // Some models emit arguments with stray prose or a trailing fence.
    return extractJson(String(args));
  }
}

/**
 * Ask the model for a value matching `schema`, using a forced function call.
 * The schemas in prompts.ts use `maxItems`/`minItems` and partial `required`,
 * which strict json_schema mode rejects but function `parameters` accept — so
 * they port across providers untouched.
 */
export async function structured<T>(prompt: string, options: StructuredOptions<T>): Promise<T> {
  const { toolName, toolDescription, schema, fallback, ...rest } = options;

  try {
    const data = await callChain(
      (provider) => ({
        model: provider.model,
        max_tokens: rest.maxTokens ?? 4096,
        ...(rest.temperature !== undefined ? { temperature: rest.temperature } : {}),
        messages: buildMessages(prompt, rest),
        tools: [
          {
            type: "function",
            function: { name: toolName, description: toolDescription, parameters: schema },
          },
        ],
        tool_choice: { type: "function", function: { name: toolName } },
      }),
      rest.timeoutMs ?? 120_000
    );

    const parsedArgs = readToolCall(data);
    if (parsedArgs && typeof parsedArgs === "object") return parsedArgs as T;

    // Some free-tier models answer in prose despite a forced tool_choice.
    const text = String(data?.choices?.[0]?.message?.content ?? "");
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

export const openaiCompatible = { message, structured, aiConfigured, modelName };
