import { eq, desc, asc, ilike, and, or, sql, isNull, inArray, count as drizzleCount } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type {
  CreateTodoInput,
  UpdateTodoInput,
  TodoFilter,
  TodoWithSubtasks,
  TodoStats,
  TodoStatus,
  TodoPriority,
  Tag,
} from "../types/todo.js";
import type { ChecklistItem } from "../types/checklist.js";
import { checklistService, ChecklistService } from "./checklist.service.js";
import { nowISO, generateId } from "../utils/helpers.js";

/** How deep the subtask tree is expanded before we stop recursing. */
const MAX_TREE_DEPTH = 4;

type TodoRow = typeof schema.todos.$inferSelect;

export class TodoService {
  async create(input: CreateTodoInput): Promise<TodoWithSubtasks> {
    const id = generateId();
    const now = nowISO();

    await db.insert(schema.todos).values({
      id,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "pending",
      priority: input.priority ?? "medium",
      category: input.category ?? null,
      dueDate: input.dueDate ?? null,
      parentId: input.parentId ?? null,
      aiMetadata: input.aiMetadata ?? null,
      createdAt: now,
      updatedAt: now,
    });

    if (input.tags?.length) {
      await this.syncTodoTags(id, input.tags);
    }
    if (input.checklist?.length) {
      await checklistService.createMany(id, input.checklist);
    }

    return this.findById(id) as Promise<TodoWithSubtasks>;
  }

  async batchCreate(inputs: CreateTodoInput[]): Promise<TodoWithSubtasks[]> {
    const results: TodoWithSubtasks[] = [];
    for (const input of inputs) {
      results.push(await this.create(input));
    }
    return results;
  }

  async findById(id: string): Promise<TodoWithSubtasks | null> {
    const [row] = await db.select().from(schema.todos).where(eq(schema.todos.id, id));
    if (!row) return null;
    const [hydrated] = await this.hydrate([row], 0);
    return hydrated ?? null;
  }

  async findSubtasks(parentId: string): Promise<TodoWithSubtasks[]> {
    const rows = await db
      .select()
      .from(schema.todos)
      .where(eq(schema.todos.parentId, parentId))
      .orderBy(asc(schema.todos.createdAt));
    return this.hydrate(rows, 1);
  }

  async findMany(filter: TodoFilter = {}): Promise<{ todos: TodoWithSubtasks[]; total: number }> {
    const conditions = this.buildFilterConditions(filter);
    const where = conditions.length ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ value: drizzleCount() })
      .from(schema.todos)
      .where(where);

    const total = countResult?.value ?? 0;

    const rows = await db
      .select()
      .from(schema.todos)
      .where(where)
      .orderBy(
        filter.status === "completed" ? desc(schema.todos.completedAt) : asc(schema.todos.createdAt)
      )
      .limit(filter.limit ?? 50)
      .offset(filter.offset ?? 0);

    return { todos: await this.hydrate(rows, 0), total };
  }

  async findRootTodos(filter: TodoFilter = {}): Promise<{ todos: TodoWithSubtasks[]; total: number }> {
    return this.findMany({ ...filter, parentId: null });
  }

  async update(id: string, input: UpdateTodoInput): Promise<TodoWithSubtasks | null> {
    const [existing] = await db.select().from(schema.todos).where(eq(schema.todos.id, id));
    if (!existing) return null;

    const now = nowISO();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) {
      updateData.status = input.status;
      updateData.completedAt = input.status === "completed" ? now : null;
    }
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
    // Re-parenting must never let a task become its own ancestor.
    if (input.parentId !== undefined) {
      if (input.parentId === null) {
        updateData.parentId = null;
      } else if (input.parentId !== id && !(await this.isDescendant(input.parentId, id))) {
        updateData.parentId = input.parentId;
      }
    }

    await db.update(schema.todos).set(updateData).where(eq(schema.todos.id, id));

    // Ticking off the whole task ticks off every line inside it, the way you'd
    // strike through a list on paper.
    if (input.status === "completed" && existing.status !== "completed") {
      await db
        .update(schema.checklistItems)
        .set({ done: true, updatedAt: now })
        .where(eq(schema.checklistItems.todoId, id));
    }

    return this.findById(id);
  }

  async updateStatus(id: string, status: TodoStatus): Promise<TodoWithSubtasks | null> {
    return this.update(id, { status });
  }

  /**
   * Keep a todo's status in step with its checklist: every line ticked closes
   * the task, and un-ticking a line on a closed task reopens it.
   * Returns the todo if its status actually moved.
   */
  async syncStatusToChecklist(todoId: string): Promise<TodoWithSubtasks | null> {
    const [todo] = await db.select().from(schema.todos).where(eq(schema.todos.id, todoId));
    if (!todo || todo.status === "archived") return null;

    const items = await checklistService.findByTodo(todoId);
    if (items.length === 0) return null;

    const allDone = items.every((i) => i.done);

    if (allDone && todo.status !== "completed") {
      return this.update(todoId, { status: "completed" });
    }
    if (!allDone && todo.status === "completed") {
      return this.update(todoId, { status: "in_progress" });
    }
    return null;
  }

  async delete(id: string): Promise<boolean> {
    const [existing] = await db.select().from(schema.todos).where(eq(schema.todos.id, id));
    if (!existing) return false;

    await db
      .update(schema.todos)
      .set({ status: "archived", updatedAt: nowISO() })
      .where(eq(schema.todos.id, id));
    return true;
  }

  async restore(id: string): Promise<TodoWithSubtasks | null> {
    const [existing] = await db.select().from(schema.todos).where(eq(schema.todos.id, id));
    if (!existing || existing.status !== "archived") return null;
    return this.update(id, { status: "pending" });
  }

  async hardDelete(id: string): Promise<boolean> {
    const [existing] = await db.select().from(schema.todos).where(eq(schema.todos.id, id));
    if (!existing) return false;

    await db.delete(schema.todos).where(eq(schema.todos.id, id));
    return true;
  }

  async getTree(): Promise<TodoWithSubtasks[]> {
    const roots = await db
      .select()
      .from(schema.todos)
      .where(isNull(schema.todos.parentId))
      .orderBy(asc(schema.todos.createdAt));
    return this.hydrate(roots, 0);
  }

  async getStats(): Promise<TodoStats> {
    const allTodos = await db.select().from(schema.todos);

    const byPriority: Record<TodoPriority, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    const byCategory: Record<string, number> = {};
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let archived = 0;

    for (const todo of allTodos) {
      if (todo.status === "pending") pending++;
      else if (todo.status === "in_progress") inProgress++;
      else if (todo.status === "completed") completed++;
      else if (todo.status === "archived") archived++;

      if (todo.priority in byPriority) {
        byPriority[todo.priority as TodoPriority]++;
      }

      const cat = todo.category ?? "uncategorized";
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    }

    return {
      total: allTodos.length,
      pending,
      inProgress,
      completed,
      archived,
      byPriority,
      byCategory,
    };
  }

  /**
   * Attach tags, checklists and subtasks to a batch of rows using one query per
   * relation per level, instead of a query per row.
   */
  private async hydrate(rows: TodoRow[], depth: number): Promise<TodoWithSubtasks[]> {
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const [checklistsByTodo, tagsByTodo, childrenByParent] = await Promise.all([
      checklistService.findByTodoIds(ids),
      this.findTagsForTodos(ids),
      depth < MAX_TREE_DEPTH ? this.findChildrenFor(ids) : Promise.resolve(new Map<string, TodoRow[]>()),
    ]);

    // Recurse one level at a time so each depth costs a fixed number of queries.
    const allChildren = [...childrenByParent.values()].flat();
    const hydratedChildren = allChildren.length ? await this.hydrate(allChildren, depth + 1) : [];
    const childrenById = new Map(hydratedChildren.map((c) => [c.id, c]));

    return rows.map((row) => {
      const checklist = checklistsByTodo.get(row.id) ?? [];
      const subtasks = (childrenByParent.get(row.id) ?? [])
        .map((c) => childrenById.get(c.id))
        .filter((c): c is TodoWithSubtasks => Boolean(c));

      return {
        ...row,
        subtasks,
        tags: tagsByTodo.get(row.id) ?? [],
        checklist,
        checklistProgress: ChecklistService.progressOf(checklist),
      } as TodoWithSubtasks;
    });
  }

  /** True when `candidateId` sits somewhere under `ancestorId` in the tree. */
  private async isDescendant(candidateId: string, ancestorId: string): Promise<boolean> {
    let current: string | null = candidateId;
    for (let hops = 0; current && hops < 20; hops++) {
      if (current === ancestorId) return true;
      const [row] = await db
        .select({ parentId: schema.todos.parentId })
        .from(schema.todos)
        .where(eq(schema.todos.id, current));
      current = row?.parentId ?? null;
    }
    return false;
  }

  private async findChildrenFor(parentIds: string[]): Promise<Map<string, TodoRow[]>> {
    const map = new Map<string, TodoRow[]>();
    if (parentIds.length === 0) return map;

    const rows = await db
      .select()
      .from(schema.todos)
      .where(inArray(schema.todos.parentId, parentIds))
      .orderBy(asc(schema.todos.createdAt));

    for (const row of rows) {
      if (!row.parentId) continue;
      const list = map.get(row.parentId) ?? [];
      list.push(row);
      map.set(row.parentId, list);
    }
    return map;
  }

  private async findTagsForTodos(todoIds: string[]): Promise<Map<string, Tag[]>> {
    const map = new Map<string, Tag[]>();
    if (todoIds.length === 0) return map;

    const rows = await db
      .select({ todoId: schema.todoTags.todoId, id: schema.tags.id, name: schema.tags.name })
      .from(schema.todoTags)
      .innerJoin(schema.tags, eq(schema.todoTags.tagId, schema.tags.id))
      .where(inArray(schema.todoTags.todoId, todoIds));

    for (const row of rows) {
      const list = map.get(row.todoId) ?? [];
      list.push({ id: row.id, name: row.name });
      map.set(row.todoId, list);
    }
    return map;
  }

  private async syncTodoTags(todoId: string, tagNames: string[]): Promise<void> {
    await db.delete(schema.todoTags).where(eq(schema.todoTags.todoId, todoId));

    for (const name of tagNames) {
      const clean = name.trim();
      if (!clean) continue;

      let [tag] = await db.select().from(schema.tags).where(eq(schema.tags.name, clean));
      if (!tag) {
        [tag] = await db.insert(schema.tags).values({ id: generateId(), name: clean }).returning();
      }
      if (tag) {
        await db.insert(schema.todoTags).values({ todoId, tagId: tag.id });
      }
    }
  }

  private buildFilterConditions(filter: TodoFilter) {
    const conditions = [];

    if (filter.status) {
      conditions.push(eq(schema.todos.status, filter.status));
    } else {
      // Archived todos live in the drawer, not on the page.
      conditions.push(sql`${schema.todos.status} <> 'archived'`);
    }
    if (filter.priority) {
      conditions.push(eq(schema.todos.priority, filter.priority));
    }
    if (filter.category) {
      conditions.push(eq(schema.todos.category, filter.category));
    }
    if (filter.parentId !== undefined) {
      if (filter.parentId === null) {
        conditions.push(isNull(schema.todos.parentId));
      } else {
        conditions.push(eq(schema.todos.parentId, filter.parentId));
      }
    }
    if (filter.search) {
      conditions.push(
        or(
          ilike(schema.todos.title, `%${filter.search}%`),
          ilike(schema.todos.description, `%${filter.search}%`)
        )!
      );
    }
    if (filter.dueBefore) {
      conditions.push(sql`${schema.todos.dueDate} <= ${filter.dueBefore}`);
    }
    if (filter.dueAfter) {
      conditions.push(sql`${schema.todos.dueDate} >= ${filter.dueAfter}`);
    }

    return conditions;
  }
}

export const todoService = new TodoService();

export type { ChecklistItem };
