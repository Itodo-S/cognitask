import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { logger } from "../../utils/logger.js";

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  logger.error(`${request.method} ${request.url} failed`, {
    error: error.message,
    stack: error.stack,
  });

  if (error instanceof ZodError || error.name === "ZodError") {
    // Zod 4 exposes issues on `.issues`; older callers may still throw the
    // serialised list as the message.
    const zodErrors = (error as unknown as ZodError).issues ?? [];
    // If it's a raw string message that looks like Zod JSON (because error.errors was stripped)
    let details: any[] = [];
    if (zodErrors.length > 0) {
      details = zodErrors.map((e) => ({ field: e.path.join("."), message: e.message }));
    } else {
      try {
        const parsed = JSON.parse(error.message);
        if (Array.isArray(parsed) && parsed[0]?.code) {
          details = parsed.map((e: any) => ({ field: e.path?.join("."), message: e.message }));
        }
      } catch { /* ignore */ }
    }

    return reply.code(400).send({
      success: false,
      error: "Validation error",
      details,
    });
  }

  const statusCode = error.statusCode ?? 500;
  return reply.code(statusCode).send({
    success: false,
    error: statusCode === 500 ? "Internal server error" : error.message,
  });
}
