import type { FastifyInstance } from "fastify";
import { createAIService } from "../../services/claude-ai.service.js";
import { ClaudeOrchestrator } from "../../agents/claude-orchestrator.js";
import {
  decomposeSchema,
  categorizeSchema,
  prioritizeSchema,
  suggestSchema,
  estimateSchema,
} from "../schemas/ai.schema.js";
import { success, error } from "../../utils/helpers.js";

const aiService = createAIService();
const orchestrator = new ClaudeOrchestrator(aiService);

export async function aiRoutes(app: FastifyInstance) {
  app.post("/api/ai/decompose", async (request, reply) => {
    const body = decomposeSchema.parse(request.body);
    try {
      const result = await orchestrator.decomposeGoal(body, body.saveTasks ?? false);
      return reply.send(success(result));
    } catch (err) {
      return reply.code(500).send(error(String(err)));
    }
  });

  app.post("/api/ai/categorize", async (request, reply) => {
    const body = categorizeSchema.parse(request.body);
    const result = await aiService.categorize(body);
    return reply.send(success(result));
  });

  app.post("/api/ai/prioritize", async (request, reply) => {
    const body = prioritizeSchema.parse(request.body);
    const result = await aiService.prioritize(body);
    return reply.send(success(result));
  });

  app.post("/api/ai/suggest", async (request, reply) => {
    const body = suggestSchema.parse(request.body);
    const result = await orchestrator.getSmartSuggestions(body.context);
    return reply.send(success(result));
  });

  app.post("/api/ai/estimate", async (request, reply) => {
    const body = estimateSchema.parse(request.body);
    const result = await aiService.estimate(body);
    return reply.send(success(result));
  });

  app.post("/api/ai/chat", async (request, reply) => {
    const { z } = await import("zod");
    const body = z.object({
      message: z.string().min(1).max(5000),
      sessionId: z.string().optional(),
    }).parse(request.body);

    try {
      const result = await orchestrator.chat(body.message, body.sessionId);
      return reply.send(success(result));
    } catch (err) {
      return reply.code(500).send(error(String(err)));
    }
  });

  app.post("/api/ai/auto-categorize", async (request, reply) => {
    const { z } = await import("zod");
    const body = z.object({
      todoIds: z.array(z.string()).min(1).max(50),
    }).parse(request.body);

    try {
      const results = await orchestrator.autoCategorize(body.todoIds);
      return reply.send(success(results));
    } catch (err) {
      return reply.code(500).send(error(String(err)));
    }
  });

  app.get("/api/ai/sessions", async (_request, reply) => {
    const sessions = await orchestrator.listSessions();
    return reply.send(success(sessions));
  });

  app.get("/api/ai/sessions/:id", async (request, reply) => {
    const { z } = await import("zod");
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const session = await orchestrator.getSessionMessages(id);
    if (!session) return reply.code(404).send({ success: false, error: "Session not found" });
    return reply.send(success(session));
  });
}
