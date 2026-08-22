import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

async function start() {
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    logger.info(`CogniTask running on http://${env.HOST}:${env.PORT}`);
    logger.info(`WebSocket available at ws://${env.HOST}:${env.PORT}/ws`);
    logger.info(`API docs at http://${env.HOST}:${env.PORT}/api/health`);
  } catch (err) {
    logger.error("Failed to start server", { error: String(err) });
    process.exit(1);
  }
}

start();
