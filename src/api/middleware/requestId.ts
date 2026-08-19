import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { generateId } from "../../utils/helpers.js";

export async function requestId(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.headers["x-request-id"] as string) ?? generateId();
    (request as any).requestId = id;
    reply.header("x-request-id", id);
  });
}
