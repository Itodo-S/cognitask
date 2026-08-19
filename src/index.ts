import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { env } from "./config/env.js";
import { errorHandler } from "./api/middleware/errorHandler.js";
import { setupRateLimiter } from "./api/middleware/rateLimiter.js";
import { requestLogger } from "./api/middleware/requestLogger.js";
import { requestId } from "./api/middleware/requestId.js";
import { securityHeaders } from "./api/middleware/security.js";
import {
  todoRoutes,
  aiRoutes,
  sessionRoutes,
  statsRoutes,
  tagRoutes,
  sseRoutes,
  bulkRoutes,
} from "./api/routes/index.js";
import { preferencesRoutes } from "./api/routes/preferences.routes.js";
import { analyticsRoutes } from "./api/routes/analytics.routes.js";
import { templateRoutes } from "./api/routes/template.routes.js";
import { dependencyRoutes } from "./api/routes/dependency.routes.js";
import { healthRoutes } from "./api/routes/health.routes.js";
import { apiInfoRoutes } from "./api/routes/api-info.routes.js";
import { smartRoutes } from "./api/routes/smart.routes.js";
import { activityRoutes } from "./api/routes/activity.routes.js";
import { focusRoutes } from "./api/routes/focus.routes.js";
import { calendarRoutes } from "./api/routes/calendar.routes.js";
import { projectRoutes } from "./api/routes/project.routes.js";
import { duplicateRoutes } from "./api/routes/duplicate.routes.js";
import { searchRoutes } from "./api/routes/search.routes.js";
import { reportRoutes } from "./api/routes/report.routes.js";
import { insightsRoutes } from "./api/routes/insights.routes.js";
import { exportRoutes } from "./api/routes/export.routes.js";
import { reminderRoutes } from "./api/routes/reminder.routes.js";
import { dragDropRoutes } from "./api/routes/dragdrop.routes.js";
import { queueRoutes } from "./api/routes/queue.routes.js";
import { dashboardRoutes } from "./api/routes/dashboard.routes.js";
import { wsRoutes } from "./ws/index.js";
import { logger } from "./utils/logger.js";

const app = Fastify({
  logger: {
    level: env.NODE_ENV === "development" ? "info" : "warn",
  },
  requestTimeout: 30000,
  bodyLimit: 1048576,
});

// ── Plugins ───────────────────────────────────────────────────
await app.register(cors, { origin: env.CORS_ORIGIN });
await app.register(sensible);
await app.register(setupRateLimiter);

// ── Middleware ─────────────────────────────────────────────────
await app.register(requestId);
await app.register(requestLogger);
await app.register(securityHeaders);

// ── WebSocket ─────────────────────────────────────────────────
await app.register(wsRoutes);

// ── Routes ────────────────────────────────────────────────────
await app.register(todoRoutes);
await app.register(aiRoutes);
await app.register(sessionRoutes);
await app.register(statsRoutes);
await app.register(tagRoutes);
await app.register(sseRoutes);
await app.register(bulkRoutes);
await app.register(preferencesRoutes);
await app.register(analyticsRoutes);
await app.register(templateRoutes);
await app.register(dependencyRoutes);
await app.register(healthRoutes);
await app.register(apiInfoRoutes);
await app.register(smartRoutes);
await app.register(activityRoutes);
await app.register(focusRoutes);
await app.register(calendarRoutes);
await app.register(projectRoutes);
await app.register(duplicateRoutes);
await app.register(searchRoutes);
await app.register(reportRoutes);
await app.register(insightsRoutes);
await app.register(exportRoutes);
await app.register(reminderRoutes);
await app.register(dragDropRoutes);
await app.register(queueRoutes);
await app.register(dashboardRoutes);

// ── Error handler ─────────────────────────────────────────────
app.setErrorHandler(errorHandler);

// ── Start ─────────────────────────────────────────────────────
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
