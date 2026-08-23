import type { FastifyInstance } from "fastify";
import { todoService } from "../../services/todo.service.js";
import { aiService } from "../../services/ai.service.js";
import { success } from "../../utils/helpers.js";

export async function sseRoutes(app: FastifyInstance) {
  
  app.get("/api/sse/todos", async (_request, reply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const sendEvent = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent("connected", { message: "SSE connection established" });

    
    const { todos } = await todoService.findMany({ limit: 100 });
    sendEvent("initial", { todos });

    
    const interval = setInterval(() => {
      reply.raw.write(": keepalive\n\n");
    }, 30000);

    _request.raw.on("close", () => {
      clearInterval(interval);
    });
  });

  
  app.get("/api/sse/ai/decompose", async (request, reply) => {
    const query = request.query as { goal?: string };
    if (!query.goal) {
      return reply.code(400).send(success("Goal query parameter is required"));
    }

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const sendEvent = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent("connected", { message: "AI decomposition stream started" });

    try {
      const generator = aiService.decompose({ goal: query.goal });
      let result = null;

      for await (const event of generator) {
        sendEvent(event.type, event.data);
        if (event.type === "complete") {
          result = event.data;
        }
      }

      sendEvent("done", { result });
    } catch (err) {
      sendEvent("error", { message: String(err) });
    }

    reply.raw.end();
  });
}
