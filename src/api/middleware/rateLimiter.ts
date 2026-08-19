import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { env } from "../../config/env.js";

export async function setupRateLimiter(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
  });
}
