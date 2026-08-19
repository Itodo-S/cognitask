import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { env } from "./config/env.js";
import { errorHandler } from "./api/middleware/errorHandler.js";
import { setupRateLimiter } from "./api/middleware/rateLimiter.js";
import { todoRoutes, aiRoutes, sessionRoutes, statsRoutes } from "./api/routes/index.js";
import { wsRoutes } from "./ws/index.js";
import { logger } from "./utils/logger.js";

const app = Fastify({
  logger: {
    level: env.NODE_ENV === "development" ? "info" : "warn",
  },
});

// ── Plugins ───────────────────────────────────────────────────
await app.register(cors, { origin: env.CORS_ORIGIN });
await app.register(sensible);
await app.register(setupRateLimiter);

// ── WebSocket ─────────────────────────────────────────────────
await app.register(wsRoutes);

// ── Routes ────────────────────────────────────────────────────
await app.register(todoRoutes);
await app.register(aiRoutes);
await app.register(sessionRoutes);
await app.register(statsRoutes);

// ── Root ──────────────────────────────────────────────────────
app.get("/api/health", async () => ({
  status: "ok",
  name: "CogniTask",
  version: "0.1.0",
  timestamp: new Date().toISOString(),
}));

// ── Error handler ─────────────────────────────────────────────
app.setErrorHandler(errorHandler);

// ── Start ─────────────────────────────────────────────────────
async function start() {
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    logger.info(`CogniTask running on http://${env.HOST}:${env.PORT}`);
    logger.info(`WebSocket available at ws://${env.HOST}:${env.PORT}/ws`);
  } catch (err) {
    logger.error("Failed to start server", { error: String(err) });
    process.exit(1);
  }
}

start();
