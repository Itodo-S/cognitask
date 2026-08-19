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

  if (error instanceof ZodError) {
    return reply.code(400).send({
      success: false,
      error: "Validation error",
      details: error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  const statusCode = error.statusCode ?? 500;
  return reply.code(statusCode).send({
    success: false,
    error: statusCode === 500 ? "Internal server error" : error.message,
  });
}
