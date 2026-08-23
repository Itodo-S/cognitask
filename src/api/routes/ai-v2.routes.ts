import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { orchestrator } from "./ai.routes.js";
import { success, error } from "../../utils/helpers.js";
import { logger } from "../../utils/logger.js";

/**
 * v2 keeps the older client contract alive (`tasks` instead of `todos`) while
 * delegating to the same orchestrator as v1.
 */
export async function aiRoutes_v2(app: FastifyInstance) {
  app.post("/api/v2/ai/plan", async (request, reply) => {
    const body = z
      .object({
        goal: z.string().min(1).max(2000),
        context: z.string().max(2000).optional(),
        maxTasks: z.number().min(1).max(20).optional(),
        saveTasks: z.boolean().optional().default(false),
      })
      .parse(request.body);

    try {
      const result = await orchestrator.decomposeGoal(
        { goal: body.goal, context: body.context, maxTasks: body.maxTasks },
        body.saveTasks
      );

      return reply.send(
        success({
          goal: body.goal,
          tasks: result.todos,
          savedIds: result.savedIds ?? [],
          savedTodos: result.savedTodos ?? [],
          sessionId: result.sessionId,
          summary: result.summary,
          firstAction: result.firstAction,
          assumptions: result.assumptions ?? [],
          risks: result.risks ?? [],
          totalEstimatedMinutes: result.totalEstimatedMinutes,
        })
      );
    } catch (err) {
      logger.error("v2 plan failed", { error: String(err) });
      return reply.code(502).send(error(`Planning failed: ${String(err)}`));
    }
  });

  app.post("/api/v2/ai/refine", async (request, reply) => {
    const body = z.object({ todoId: z.string().min(1) }).parse(request.body);

    try {
      const result = await orchestrator.refineTodo(body.todoId);
      if (!result) return reply.code(404).send(error("Todo not found"));

      return reply.send(
        success({
          original: {
            id: result.original.id,
            title: result.original.title,
            description: result.original.description,
            priority: result.original.priority,
            category: result.original.category,
          },
          suggestions: result.suggestions,
        })
      );
    } catch (err) {
      logger.error("v2 refine failed", { error: String(err) });
      return reply.code(502).send(error(`Refine failed: ${String(err)}`));
    }
  });
}
