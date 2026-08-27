import { env } from "../../config/env.js";
import * as anthropicClient from "./anthropic.client.js";
import * as openaiClient from "./openai.client.js";
import type { MessageOptions, StructuredOptions } from "./types.js";

export type { JsonSchema, MessageOptions, StructuredOptions } from "./types.js";

/**
 * Picks the client the rest of the app talks to. Everything above this file
 * (prompts, schemas, normalizers, routes) is provider-agnostic — this is the
 * only place that knows which endpoint is actually being called.
 */
function resolve() {
  if (env.AI_PROVIDER === "anthropic") return anthropicClient;
  if (env.AI_PROVIDER === "groq" || env.AI_PROVIDER === "gemini") return openaiClient;
  // auto: prefer the free-tier chain, fall back to the Anthropic/AgentRouter path.
  if (openaiClient.aiConfigured()) return openaiClient;
  return anthropicClient;
}

export function message(prompt: string, options?: MessageOptions): Promise<string> {
  return resolve().message(prompt, options);
}

export function structured<T>(prompt: string, options: StructuredOptions<T>): Promise<T> {
  return resolve().structured<T>(prompt, options);
}

export function aiConfigured(): boolean {
  return resolve().aiConfigured();
}

export function modelName(): string {
  return resolve().modelName();
}

/** e.g. "groq→gemini" or "anthropic" — surfaced on /api/ai/status. */
export function providerName(): string {
  return resolve() === openaiClient ? openaiClient.providerLabel() : "anthropic";
}

export const ai = { message, structured, aiConfigured, modelName, providerName };
