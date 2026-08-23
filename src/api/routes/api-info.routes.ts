import type { FastifyInstance } from "fastify";
import { success } from "../../utils/helpers.js";
import { env } from "../../config/env.js";

export async function apiInfoRoutes(app: FastifyInstance) {
  
  app.get("/api", async (_request, reply) => {
    return reply.send(
      success({
        name: "CogniTask API",
        version: "0.1.0",
        description: "AI-powered task decomposition and intelligent todo management",
        environment: env.NODE_ENV,
        endpoints: {
          todos: {
            list: "GET /api/todos",
            tree: "GET /api/todos/tree",
            get: "GET /api/todos/:id",
            create: "POST /api/todos",
            batchCreate: "POST /api/todos/batch",
            update: "PATCH /api/todos/:id",
            updateStatus: "PATCH /api/todos/:id/status",
            delete: "DELETE /api/todos/:id",
            addSubtask: "POST /api/todos/:id/subtasks",
            stats: "GET /api/todos/stats",
          },
          ai: {
            decompose: "POST /api/ai/decompose",
            categorize: "POST /api/ai/categorize",
            prioritize: "POST /api/ai/prioritize",
            suggest: "POST /api/ai/suggest",
            estimate: "POST /api/ai/estimate",
          },
          tags: {
            list: "GET /api/tags",
            create: "POST /api/tags",
            rename: "POST /api/tags/:id/rename",
            delete: "DELETE /api/tags/:id",
          },
          sessions: {
            list: "GET /api/sessions",
            get: "GET /api/sessions/:id",
            create: "POST /api/sessions",
            rename: "POST /api/sessions/:id/rename",
            delete: "DELETE /api/sessions/:id",
          },
          bulk: {
            status: "POST /api/bulk/status",
            priority: "POST /api/bulk/priority",
            delete: "POST /api/bulk/delete",
            category: "POST /api/bulk/category",
            import: "POST /api/bulk/import",
            export: "GET /api/bulk/export",
          },
          analytics: {
            overview: "GET /api/analytics/overview",
            productivity: "GET /api/analytics/productivity",
            timeline: "GET /api/analytics/timeline",
          },
          templates: {
            list: "GET /api/templates",
            get: "GET /api/templates/:id",
            apply: "POST /api/templates/:id/apply",
          },
          preferences: {
            list: "GET /api/preferences",
            get: "GET /api/preferences/:key",
            set: "PUT /api/preferences/:key",
            bulkSet: "PUT /api/preferences",
            delete: "DELETE /api/preferences/:key",
          },
          dependencies: {
            add: "POST /api/todos/:id/depends-on",
            list: "GET /api/todos/:id/dependencies",
            remove: "DELETE /api/todos/:id/depends-on/:depId",
          },
          sse: {
            todos: "GET /api/sse/todos",
            aiDecompose: "GET /api/sse/ai/decompose?goal=...",
          },
          health: {
            basic: "GET /api/health",
            detailed: "GET /api/health/detailed",
          },
          websocket: "ws://host:port/ws",
        },
      })
    );
  });
}
