import type { ApiResponse } from "../types/api.js";

export function success<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message };
}

export function error(message: string): ApiResponse {
  return { success: false, error: message };
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Unwrap an error into a readable string, following `cause` chains.
 * Drizzle and postgres.js both wrap the real failure one or two levels down,
 * so `String(err)` alone hides why a query actually failed.
 */
export function describeError(err: unknown, depth = 0): string {
  if (depth > 4) return "";
  if (!(err instanceof Error)) return String(err);

  const parts = [err.message];
  const extra = err as Error & { code?: string; severity?: string; detail?: string };
  if (extra.code) parts.push(`code=${extra.code}`);
  if (extra.severity) parts.push(`severity=${extra.severity}`);
  if (extra.detail) parts.push(`detail=${extra.detail}`);

  const cause = (err as Error & { cause?: unknown }).cause;
  if (cause) {
    const nested = describeError(cause, depth + 1);
    if (nested) parts.push(`caused by: ${nested}`);
  }
  return parts.join(" | ");
}
