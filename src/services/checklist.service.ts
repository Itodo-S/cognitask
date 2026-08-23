import { eq, asc, inArray, max } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type {
  ChecklistItem,
  ChecklistProgress,
  CreateChecklistItemInput,
  UpdateChecklistItemInput,
} from "../types/checklist.js";
import { nowISO, generateId } from "../utils/helpers.js";

/**
 * Checklist items are the small "pen strokes" inside a todo — a task can have
 * none at all (a plain line on the page) or a whole list of them.
 */
export class ChecklistService {
  async findByTodo(todoId: string): Promise<ChecklistItem[]> {
    const rows = await db
      .select()
      .from(schema.checklistItems)
      .where(eq(schema.checklistItems.todoId, todoId))
      .orderBy(asc(schema.checklistItems.position), asc(schema.checklistItems.createdAt));
    return rows as ChecklistItem[];
  }

  /** Batch-load checklists for many todos in one query (avoids N+1). */
  async findByTodoIds(todoIds: string[]): Promise<Map<string, ChecklistItem[]>> {
    const map = new Map<string, ChecklistItem[]>();
    if (todoIds.length === 0) return map;

    const rows = await db
      .select()
      .from(schema.checklistItems)
      .where(inArray(schema.checklistItems.todoId, todoIds))
      .orderBy(asc(schema.checklistItems.position), asc(schema.checklistItems.createdAt));

    for (const row of rows as ChecklistItem[]) {
      const list = map.get(row.todoId) ?? [];
      list.push(row);
      map.set(row.todoId, list);
    }
    return map;
  }

  async findById(id: string): Promise<ChecklistItem | null> {
    const [row] = await db
      .select()
      .from(schema.checklistItems)
      .where(eq(schema.checklistItems.id, id));
    return (row as ChecklistItem) ?? null;
  }

  async create(todoId: string, input: CreateChecklistItemInput): Promise<ChecklistItem> {
    const position = input.position ?? (await this.nextPosition(todoId));
    const now = nowISO();

    const [row] = await db
      .insert(schema.checklistItems)
      .values({
        id: generateId(),
        todoId,
        text: input.text,
        done: input.done ?? false,
        position,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return row as ChecklistItem;
  }

  /** Append several items at once, keeping their given order. */
  async createMany(todoId: string, texts: string[]): Promise<ChecklistItem[]> {
    const clean = texts.map((t) => t.trim()).filter(Boolean);
    if (clean.length === 0) return [];

    const start = await this.nextPosition(todoId);
    const now = nowISO();

    const rows = await db
      .insert(schema.checklistItems)
      .values(
        clean.map((text, i) => ({
          id: generateId(),
          todoId,
          text,
          done: false,
          position: start + i,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning();

    return rows as ChecklistItem[];
  }

  async update(id: string, input: UpdateChecklistItemInput): Promise<ChecklistItem | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const patch: Record<string, unknown> = { updatedAt: nowISO() };
    if (input.text !== undefined) patch.text = input.text;
    if (input.done !== undefined) patch.done = input.done;
    if (input.position !== undefined) patch.position = input.position;

    const [row] = await db
      .update(schema.checklistItems)
      .set(patch)
      .where(eq(schema.checklistItems.id, id))
      .returning();

    return (row as ChecklistItem) ?? null;
  }

  async toggle(id: string): Promise<ChecklistItem | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    return this.update(id, { done: !existing.done });
  }

  async delete(id: string): Promise<ChecklistItem | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await db.delete(schema.checklistItems).where(eq(schema.checklistItems.id, id));
    return existing;
  }

  async deleteByTodo(todoId: string): Promise<void> {
    await db.delete(schema.checklistItems).where(eq(schema.checklistItems.todoId, todoId));
  }

  /** Remove every checked item — the "tear off what's done" gesture. */
  async clearCompleted(todoId: string): Promise<number> {
    const items = await this.findByTodo(todoId);
    const done = items.filter((i) => i.done);
    for (const item of done) {
      await db.delete(schema.checklistItems).where(eq(schema.checklistItems.id, item.id));
    }
    return done.length;
  }

  /** Reorder by explicit id list; unknown ids are ignored, missing ones keep trailing order. */
  async reorder(todoId: string, orderedIds: string[]): Promise<ChecklistItem[]> {
    const items = await this.findByTodo(todoId);
    const byId = new Map(items.map((i) => [i.id, i]));
    const now = nowISO();

    let position = 0;
    for (const id of orderedIds) {
      if (!byId.has(id)) continue;
      await db
        .update(schema.checklistItems)
        .set({ position: position++, updatedAt: now })
        .where(eq(schema.checklistItems.id, id));
      byId.delete(id);
    }
    for (const leftover of byId.values()) {
      await db
        .update(schema.checklistItems)
        .set({ position: position++, updatedAt: now })
        .where(eq(schema.checklistItems.id, leftover.id));
    }

    return this.findByTodo(todoId);
  }

  /** Replace the whole checklist with the given lines (used by AI + inline editing). */
  async replaceAll(
    todoId: string,
    items: Array<string | { text: string; done?: boolean }>
  ): Promise<ChecklistItem[]> {
    await this.deleteByTodo(todoId);

    const normalized = items
      .map((i) => (typeof i === "string" ? { text: i, done: false } : { text: i.text, done: i.done ?? false }))
      .filter((i) => i.text.trim().length > 0);

    if (normalized.length === 0) return [];

    const now = nowISO();
    const rows = await db
      .insert(schema.checklistItems)
      .values(
        normalized.map((item, i) => ({
          id: generateId(),
          todoId,
          text: item.text.trim(),
          done: item.done,
          position: i,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning();

    return rows as ChecklistItem[];
  }

  static progressOf(items: ChecklistItem[] | undefined): ChecklistProgress {
    const total = items?.length ?? 0;
    const done = items?.filter((i) => i.done).length ?? 0;
    return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
  }

  private async nextPosition(todoId: string): Promise<number> {
    const [row] = await db
      .select({ value: max(schema.checklistItems.position) })
      .from(schema.checklistItems)
      .where(eq(schema.checklistItems.todoId, todoId));
    return (row?.value ?? -1) + 1;
  }
}

export const checklistService = new ChecklistService();
