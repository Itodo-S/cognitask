import { eq, desc } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type { SessionInfo } from "../types/ai.js";
import { nowISO, generateId } from "../utils/helpers.js";

export class SessionService {
  async create(claudeSessionId?: string, title?: string): Promise<SessionInfo> {
    const now = nowISO();
    const [session] = await db
      .insert(schema.sessions)
      .values({
        id: generateId(),
        claudeSessionId: claudeSessionId ?? null,
        title: title ?? null,
        createdAt: now,
        lastModified: now,
      })
      .returning();
    return session as SessionInfo;
  }

  async findById(id: string): Promise<SessionInfo | null> {
    const [session] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, id));
    return (session as SessionInfo) ?? null;
  }

  async findByClaudeId(claudeSessionId: string): Promise<SessionInfo | null> {
    const [session] = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.claudeSessionId, claudeSessionId));
    return (session as SessionInfo) ?? null;
  }

  async findMany(limit = 20, offset = 0): Promise<SessionInfo[]> {
    const rows = await db
      .select()
      .from(schema.sessions)
      .orderBy(desc(schema.sessions.lastModified))
      .limit(limit)
      .offset(offset);
    return rows as SessionInfo[];
  }

  async rename(id: string, title: string): Promise<SessionInfo | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    await db
      .update(schema.sessions)
      .set({ title, lastModified: nowISO() })
      .where(eq(schema.sessions.id, id));

    return this.findById(id);
  }

  async updateSummary(id: string, summary: string): Promise<void> {
    await db
      .update(schema.sessions)
      .set({ summary, lastModified: nowISO() })
      .where(eq(schema.sessions.id, id));
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
    return true;
  }
}

export const sessionService = new SessionService();
