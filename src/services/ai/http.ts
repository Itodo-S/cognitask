import { logger } from "../../utils/logger.js";
import { describeError } from "../../utils/helpers.js";

/** Strip surrounding quotes and whitespace that sneak in through .env files. */
export function cleanString(val?: string): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "");
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export interface PostJsonOptions {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  timeoutMs: number;
  /** Names the endpoint in error messages, e.g. "Anthropic API" or "groq". */
  label: string;
  maxAttempts?: number;
  /**
   * Whether a 429 is worth sleeping on. False when another provider is queued
   * behind this one — a free-tier daily quota will not clear in a second, so
   * falling through immediately beats backing off.
   */
  retryRateLimits?: boolean;
}

const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * POST JSON and return the parsed response, retrying only what is worth
 * retrying. Any 4xx other than 429 is a permanent problem — a bad key, a bad
 * model id — and is thrown straight through rather than slept on.
 */
export async function postJson({
  url,
  headers,
  body,
  timeoutMs,
  label,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  retryRateLimits = true,
}: PostJsonOptions): Promise<any> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });

      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();

      if (res.ok) {
        // A proxy or WAF in front of the endpoint answers with an HTML page;
        // report that plainly instead of letting JSON.parse throw.
        if (!contentType.includes("json")) {
          throw new HttpError(
            `${label} endpoint ${new URL(url).host} returned ${contentType || "unknown content-type"} ` +
              `instead of JSON (HTTP ${res.status}). Body starts: ${raw.slice(0, 200).replace(/\s+/g, " ")}`,
            res.status
          );
        }
        try {
          return JSON.parse(raw);
        } catch {
          throw new HttpError(`${label} endpoint returned malformed JSON: ${raw.slice(0, 200)}`, res.status);
        }
      }

      // 4xx other than rate limiting will not get better by trying again.
      if (res.status < 500 && (res.status !== 429 || !retryRateLimits)) {
        throw new HttpError(`${label} ${res.status}: ${raw.slice(0, 400)}`, res.status);
      }
      lastError = new HttpError(`${label} ${res.status}: ${raw.slice(0, 200)}`, res.status);
    } catch (err) {
      lastError = err;
      if (err instanceof HttpError && err.status < 500 && (err.status !== 429 || !retryRateLimits)) throw err;
    }

    if (attempt < maxAttempts) {
      const backoff = 500 * 2 ** (attempt - 1);
      logger.warn("AI call failed, retrying", { label, attempt, backoff, error: describeError(lastError) });
      await sleep(backoff);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Pull the first balanced JSON object/array out of a text blob. */
export function extractJson(text: string): unknown {
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
