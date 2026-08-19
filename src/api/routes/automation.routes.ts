import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql, eq } from "drizzle-orm";
import { success, error } from "../../utils/helpers.js";
import { z } from "zod";

export async function automationRoutes(app: FastifyInstance) {
  // Store automations in user_preferences

  // GET /api/automations — list all automations
  app.get("/api/automations", async (_request, reply) => {
    const prefs = await db
      .select()
      .from(schema.userPreferences)
      .where(sql`${schema.userPreferences.key} LIKE 'automation:%'`);

    const automations = prefs.map((p) => {
      const data = JSON.parse(p.value);
      return { id: p.key.replace("automation:", ""), ...data };
    });

    return reply.send(success(automations));
  });

  // POST /api/automations — create automation
  app.post("/api/automations", async (request, reply) => {
    const body = z
      .object({
        name: z.string().min(1).max(200),
        trigger: z.enum(["created", "completed", "due_today", "overdue", "status_change"]),
        condition: z
          .object({
            category: z.string().optional(),
            priority: z.string().optional(),
            status: z.string().optional(),
          })
          .optional(),
        action: z.enum(["categorize", "prioritize", "notify", "add_tag", "set_due"]),
        actionConfig: z.record(z.unknown()).optional(),
      })
      .parse(request.body);

    const id = crypto.randomUUID();
    const key = `automation:${id}`;
    const value = JSON.stringify({
      ...body,
      enabled: true,
      createdAt: new Date().toISOString(),
    });

    await db.insert(schema.userPreferences).values({ id: crypto.randomUUID(), key, value });

    return reply.code(201).send(success({ id, ...JSON.parse(value) }, "Automation created"));
  });

  // PATCH /api/automations/:id/toggle — enable/disable
  app.patch<{ Params: { id: string } }>("/api/automations/:id/toggle", async (request, reply) => {
    const key = `automation:${request.params.id}`;
    const [pref] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    if (!pref) return reply.code(404).send(error("Automation not found"));

    const data = JSON.parse(pref.value);
    data.enabled = !data.enabled;

    await db.update(schema.userPreferences).set({ value: JSON.stringify(data) }).where(eq(schema.userPreferences.key, key));

    return reply.send(success({ id: request.params.id, enabled: data.enabled }, `Automation ${data.enabled ? "enabled" : "disabled"}`));
  });

  // DELETE /api/automations/:id — delete automation
  app.delete<{ Params: { id: string } }>("/api/automations/:id", async (request, reply) => {
    const key = `automation:${request.params.id}`;
    const [pref] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    if (!pref) return reply.code(404).send(error("Automation not found"));

    await db.delete(schema.userPreferences).where(eq(schema.userPreferences.key, key));
    return reply.send(success(null, "Automation deleted"));
  });
}
