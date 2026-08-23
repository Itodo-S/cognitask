import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.js";
import { db, schema } from "../../db/client.js";
import { success } from "../../utils/helpers.js";

export async function healthRoutes(app: FastifyInstance) {
  
  app.get("/api/health", async (_request, reply) => {
    return reply.send(
      success({
        status: "ok",
        name: "CogniTask",
        version: "0.1.0",
        environment: env.NODE_ENV,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      })
    );
  });

  
  app.get("/api/health/detailed", async (_request, reply) => {
    let dbStatus = "ok";
    let dbLatency = 0;

    try {
      const start = Date.now();
      await db.select().from(schema.todos).limit(1);
      dbLatency = Date.now() - start;
    } catch (err) {
      dbStatus = "error";
    }

    return reply.send(
      success({
        status: dbStatus === "ok" ? "ok" : "degraded",
        name: "CogniTask",
        version: "0.1.0",
        environment: env.NODE_ENV,
        uptime: Math.floor(process.uptime()),
        memory: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
        },
        timestamp: new Date().toISOString(),
      })
    );
  });
}
