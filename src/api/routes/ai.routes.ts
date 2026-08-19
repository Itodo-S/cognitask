import type { FastifyInstance } from "fastify";
import { aiService } from "../../services/ai.service.js";
import {
  decomposeSchema,
  categorizeSchema,
  prioritizeSchema,
  suggestSchema,
  estimateSchema,
} from "../schemas/ai.schema.js";
import { success, error } from "../../utils/helpers.js";

export async function aiRoutes(app: FastifyInstance) {
  // POST /api/ai/decompose — break goal into tasks (streaming)
  app.post("/api/ai/decompose", async (request, reply) => {
    const body = decomposeSchema.parse(request.body);

    const events: unknown[] = [];
    const generator = aiService.decompose(body);
    let result = null;

    for await (const event of generator) {
      events.push(event);
      if (event.type === "complete") {
        result = event.data;
      }
    }

    return reply.send(
      success({
        events,
        result,
      })
    );
  });

  // POST /api/ai/categorize — auto-categorize a task
  app.post("/api/ai/categorize", async (request, reply) => {
    const body = categorizeSchema.parse(request.body);
    const result = await aiService.categorize(body);
    return reply.send(success(result));
  });

  // POST /api/ai/prioritize — AI priority suggestion
  app.post("/api/ai/prioritize", async (request, reply) => {
    const body = prioritizeSchema.parse(request.body);
    const result = await aiService.prioritize(body);
    return reply.send(success(result));
  });

  // POST /api/ai/suggest — suggest next actions
  app.post("/api/ai/suggest", async (request, reply) => {
    const body = suggestSchema.parse(request.body);
    const result = await aiService.suggest(body);
    return reply.send(success(result));
  });

  // POST /api/ai/estimate — time/complexity estimate
  app.post("/api/ai/estimate", async (request, reply) => {
    const body = estimateSchema.parse(request.body);
    const result = await aiService.estimate(body);
    return reply.send(success(result));
  });
}
