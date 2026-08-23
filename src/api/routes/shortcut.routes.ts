import type { FastifyInstance } from "fastify";
import { db, schema } from "../../db/client.js";
import { sql, eq } from "drizzle-orm";
import { success } from "../../utils/helpers.js";
import { z } from "zod";

export async function shortcutRoutes(app: FastifyInstance) {
  

  
  app.get("/api/shortcuts", async (_request, reply) => {
    const prefs = await db
      .select()
      .from(schema.userPreferences)
      .where(sql`${schema.userPreferences.key} LIKE 'shortcut:%'`);

    const shortcuts = prefs.map((p) => {
      const data = JSON.parse(p.value);
      return { id: p.key.replace("shortcut:", ""), ...data };
    });

    return reply.send(success(shortcuts));
  });

  
  app.put("/api/shortcuts", async (request, reply) => {
    const body = z
      .record(
        z.string(),
        z.object({
          key: z.string(),
          action: z.string(),
          description: z.string().optional(),
        })
      )
      .parse(request.body);

    for (const [id, shortcut] of Object.entries(body)) {
      const key = `shortcut:${id}`;
      const value = JSON.stringify(shortcut);
      const [existing] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.key, key));

      if (existing) {
        await db.update(schema.userPreferences).set({ value }).where(eq(schema.userPreferences.key, key));
      } else {
        await db.insert(schema.userPreferences).values({ id: crypto.randomUUID(), key, value });
      }
    }

    return reply.send(success(null, "Shortcuts updated"));
  });

  
  app.get("/api/shortcuts/defaults", async (_request, reply) => {
    return reply.send(
      success({
        "ctrl+n": { action: "create_todo", description: "New todo" },
        "ctrl+d": { action: "toggle_dark_mode", description: "Toggle theme" },
        "ctrl+k": { action: "open_search", description: "Open search" },
        "ctrl+b": { action: "toggle_sidebar", description: "Toggle sidebar" },
        "ctrl+/": { action: "open_shortcuts", description: "Show shortcuts" },
        "1": { action: "set_priority_low", description: "Set priority: Low" },
        "2": { action: "set_priority_medium", description: "Set priority: Medium" },
        "3": { action: "set_priority_high", description: "Set priority: High" },
        "4": { action: "set_priority_urgent", description: "Set priority: Urgent" },
        "x": { action: "complete_todo", description: "Complete selected todo" },
        "Delete": { action: "archive_todo", description: "Archive selected todo" },
      })
    );
  });
}
