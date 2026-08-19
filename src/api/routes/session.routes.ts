import type { FastifyInstance } from "fastify";
import { sessionService } from "../../services/session.service.js";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function sessionRoutes(app: FastifyInstance) {
  // GET /api/sessions — list sessions
  app.get("/api/sessions", async (request, reply) => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = Number(query.limit) || 20;
    const offset = Number(query.offset) || 0;
    const sessions = await sessionService.findMany(limit, offset);
    return reply.send(success(sessions));
  });

  // GET /api/sessions/:id — get session by id
  app.get<{ Params: { id: string } }>("/api/sessions/:id", async (request, reply) => {
    const session = await sessionService.findById(request.params.id);
    if (!session) return reply.code(404).send(error("Session not found"));
    return reply.send(success(session));
  });

  // POST /api/sessions — create session
  app.post("/api/sessions", async (request, reply) => {
    const body = z
      .object({ claudeSessionId: z.string().optional(), title: z.string().optional() })
      .parse(request.body);
    const session = await sessionService.create(body.claudeSessionId, body.title);
    return reply.code(201).send(success(session, "Session created"));
  });

  // POST /api/sessions/:id/rename — rename session
  app.post<{ Params: { id: string } }>("/api/sessions/:id/rename", async (request, reply) => {
    const body = z.object({ title: z.string().min(1).max(200) }).parse(request.body);
    const session = await sessionService.rename(request.params.id, body.title);
    if (!session) return reply.code(404).send(error("Session not found"));
    return reply.send(success(session, "Session renamed"));
  });

  // DELETE /api/sessions/:id — delete session
  app.delete<{ Params: { id: string } }>("/api/sessions/:id", async (request, reply) => {
    const deleted = await sessionService.delete(request.params.id);
    if (!deleted) return reply.code(404).send(error("Session not found"));
    return reply.send(success(null, "Session deleted"));
  });
}
