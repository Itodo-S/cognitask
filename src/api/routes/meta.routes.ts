import type { FastifyInstance } from "fastify";
import { success } from "../../utils/helpers.js";

export async function metaRoutes(app: FastifyInstance) {
  
  app.get("/api/meta/limits", async (_request, reply) => {
    return reply.send(
      success({
        maxTodosPerRequest: 100,
        maxBatchSize: 50,
        maxTodoTitleLength: 500,
        maxTodoDescriptionLength: 5000,
        maxTagsPerTodo: 20,
        maxSubtaskDepth: 10,
        maxFileSize: "1MB",
        rateLimit: {
          maxRequests: 100,
          windowMs: 60000,
        },
      })
    );
  });

  
  app.get("/api/meta/version", async (_request, reply) => {
    return reply.send(
      success({
        api: "1.0.0",
        version: "0.1.0",
        name: "CogniTask",
        description: "AI-powered task decomposition and intelligent todo management",
        sdk: "Not yet integrated — add @anthropic-ai/claude-agent-sdk manually",
      })
    );
  });
}
