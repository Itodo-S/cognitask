import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../../utils/logger.js";

export async function requestLogger(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", async (request: FastifyRequest, _reply: FastifyReply) => {
    (request as any).startTime = Date.now();
  });

  app.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
    const duration = Date.now() - ((request as any).startTime ?? Date.now());
    logger.info(`${request.method} ${request.url} ${reply.statusCode}`, {
      duration: `${duration}ms`,
      userAgent: request.headers["user-agent"],
    });
  });
}
