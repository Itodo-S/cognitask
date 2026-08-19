import type { FastifyInstance } from "fastify";
import { statsService } from "../../services/stats.service.js";
import { success } from "../../utils/helpers.js";

export async function statsRoutes(app: FastifyInstance) {
  // GET /api/stats/dashboard — overview stats
  app.get("/api/stats/dashboard", async (_request, reply) => {
    const data = await statsService.getDashboard();
    return reply.send(success(data));
  });

  // GET /api/stats/completion — completion rate over time
  app.get("/api/stats/completion", async (request, reply) => {
    const query = request.query as { days?: string };
    const days = Number(query.days) || 7;
    const data = await statsService.getCompletionRate(days);
    return reply.send(success(data));
  });
}
