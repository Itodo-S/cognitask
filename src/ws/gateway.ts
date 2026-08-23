import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import type {} from "@fastify/websocket";

type EventData = {
  event: string;
  payload: unknown;
};

class WsGateway {
  private clients = new Set<WebSocket>();

  addClient(ws: WebSocket): void {
    this.clients.add(ws);
    ws.on("close", () => this.clients.delete(ws));
    ws.on("error", () => this.clients.delete(ws));
  }

  broadcast(event: string, payload: unknown): void {
    const data = JSON.stringify({ event, payload });
    for (const client of this.clients) {
      if (client.readyState === 1) {
        client.send(data);
      }
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

export const wsGateway = new WsGateway();

export async function wsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/ws", { websocket: true }, (socket: WebSocket) => {
    wsGateway.addClient(socket);

    socket.send(JSON.stringify({ event: "connected", payload: { message: "Welcome to CogniTask WebSocket" } }));

    socket.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as EventData;
        
        if (msg.event === "ping") {
          socket.send(JSON.stringify({ event: "pong", payload: {} }));
        }
      } catch {
        
      }
    });
  });
}
