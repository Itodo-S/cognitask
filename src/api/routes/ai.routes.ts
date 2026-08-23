import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createAIService } from "../../services/claude-ai.service.js";
import { ClaudeOrchestrator } from "../../agents/claude-orchestrator.js";
import { aiConfigured, modelName } from "../../services/ai/anthropic.client.js";
import {
  decomposeSchema,
  categorizeSchema,
  prioritizeSchema,
  suggestSchema,
  estimateSchema,
} from "../schemas/ai.schema.js";
import { success, error } from "../../utils/helpers.js";
import { logger } from "../../utils/logger.js";

const aiService = createAIService();
export const orchestrator = new ClaudeOrchestrator(aiService);

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  sessionId: z.string().optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(5000) }))
    .max(20)
    .optional(),
});

const checklistGenSchema = z.object({
  todoId: z.string().min(1),
  hint: z.string().max(500).optional(),
  apply: z.boolean().optional().default(false),
});

export async function aiRoutes(app: FastifyInstance) {
  app.get("/api/ai/status", async (_request, reply) =>
    reply.send(
      success({
        configured: aiConfigured(),
        model: aiConfigured() ? modelName() : null,
        mode: aiConfigured() ? "claude" : "offline",
      })
    )
  );

  app.post("/api/ai/decompose", async (request, reply) => {
    const body = decomposeSchema.parse(request.body);
    try {
      const result = await orchestrator.decomposeGoal(
        { goal: body.goal, context: body.context, maxTasks: body.maxTasks },
        body.saveTasks
      );
      return reply.send(success(result));
    } catch (err) {
      logger.error("Decompose failed", { error: String(err) });
      return reply.code(502).send(error(`Planning failed: ${String(err)}`));
    }
  });

  app.post("/api/ai/suggest", async (request, reply) => {
    const body = suggestSchema.parse(request.body);
    try {
      const result = await orchestrator.getSmartSuggestions(body.context);
      return reply.send(success(result));
    } catch (err) {
      logger.error("Suggest failed", { error: String(err) });
      return reply.code(502).send(error(`Suggestions failed: ${String(err)}`));
    }
  });

  app.post("/api/ai/refine", async (request, reply) => {
    const body = z.object({ todoId: z.string().min(1) }).parse(request.body);
    try {
      const result = await orchestrator.refineTodo(body.todoId);
      if (!result) return reply.code(404).send(error("Todo not found"));
      return reply.send(success(result));
    } catch (err) {
      logger.error("Refine failed", { error: String(err) });
      return reply.code(502).send(error(`Refine failed: ${String(err)}`));
    }
  });

  app.post("/api/ai/checklist", async (request, reply) => {
    const body = checklistGenSchema.parse(request.body);
    try {
      const result = await orchestrator.suggestChecklist(body.todoId, {
        hint: body.hint,
        apply: body.apply,
      });
      if (!result) return reply.code(404).send(error("Todo not found"));
      return reply.send(success(result));
    } catch (err) {
      logger.error("Checklist generation failed", { error: String(err) });
      return reply.code(502).send(error(`Checklist generation failed: ${String(err)}`));
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

  app.post("/api/ai/estimate", async (request, reply) => {
    const body = estimateSchema.parse(request.body);
    const result = await aiService.estimate(body);
    return reply.send(success(result));
  });

  app.post("/api/ai/chat", async (request, reply) => {
    const body = chatSchema.parse(request.body);
    try {
      const result = await orchestrator.chat(body.message, body.sessionId, body.history);
      return reply.send(success(result));
    } catch (err) {
      logger.error("Chat failed", { error: String(err) });
      return reply.code(502).send(error(`Chat failed: ${String(err)}`));
    }
  });

  app.post("/api/ai/auto-categorize", async (request, reply) => {
    const body = z.object({ todoIds: z.array(z.string()).min(1).max(50) }).parse(request.body);
    try {
      const results = await orchestrator.autoCategorize(body.todoIds);
      return reply.send(success(results));
    } catch (err) {
      logger.error("Auto-categorize failed", { error: String(err) });
      return reply.code(502).send(error(String(err)));
    }
  });

  app.get("/api/ai/sessions", async (_request, reply) => {
    const sessions = await orchestrator.listSessions();
    return reply.send(success(sessions));
  });

  app.get<{ Params: { id: string } }>("/api/ai/sessions/:id", async (request, reply) => {
    const session = await orchestrator.getSessionMessages(request.params.id);
    if (!session) return reply.code(404).send(error("Session not found"));
    return reply.send(success(session));
  });
}
