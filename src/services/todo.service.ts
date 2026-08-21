import { eq, desc, asc, like, and, or, sql, isNull, count as drizzleCount } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type {
  CreateTodoInput,
  UpdateTodoInput,
  TodoFilter,
  TodoWithSubtasks,
  TodoStats,
  TodoStatus,
  TodoPriority,
} from "../types/todo.js";
import { nowISO, generateId } from "../utils/helpers.js";

export class TodoService {
  async create(input: CreateTodoInput): Promise<TodoWithSubtasks> {
    const id = generateId();
    const now = nowISO();

    const [todo] = await db
      .insert(schema.todos)
      .values({
        id,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? "pending",
        priority: input.priority ?? "medium",
        category: input.category ?? null,
        dueDate: input.dueDate ?? null,
        parentId: input.parentId ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (input.tags?.length) {
      await this.syncTodoTags(id, input.tags);
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
    const [todo] = await db.select().from(schema.todos).where(eq(schema.todos.id, id));
    if (!todo) return null;

    const subtasks = await this.findSubtasks(id);
    const tags = await this.findTodoTags(id);

    return { ...todo, subtasks, tags } as TodoWithSubtasks;
  }

  async findSubtasks(parentId: string): Promise<TodoWithSubtasks[]> {
    const rows = await db
      .select()
      .from(schema.todos)
      .where(eq(schema.todos.parentId, parentId))
      .orderBy(asc(schema.todos.createdAt));

    const results: TodoWithSubtasks[] = [];
    for (const row of rows) {
      const subtasks = await this.findSubtasks(row.id);
      const tags = await this.findTodoTags(row.id);
      results.push({ ...row, subtasks, tags } as TodoWithSubtasks);
    }
    return results;
  }

  async findMany(filter: TodoFilter = {}): Promise<{ todos: TodoWithSubtasks[]; total: number }> {
    const conditions = this.buildFilterConditions(filter);

    const [countResult] = await db
      .select({ value: drizzleCount() })
      .from(schema.todos)
      .where(conditions.length ? and(...conditions) : undefined);

    const total = countResult?.value ?? 0;

    const rows = await db
      .select()
      .from(schema.todos)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(
        filter.status === "completed" ? desc(schema.todos.completedAt) : asc(schema.todos.createdAt)
      )
      .limit(filter.limit ?? 50)
      .offset(filter.offset ?? 0);

    const todos: TodoWithSubtasks[] = [];
    for (const row of rows) {
      const subtasks = await this.findSubtasks(row.id);
      const tags = await this.findTodoTags(row.id);
      todos.push({ ...row, subtasks, tags } as TodoWithSubtasks);
    }

    return { todos, total };
  }

  async findRootTodos(filter: TodoFilter = {}): Promise<{ todos: TodoWithSubtasks[]; total: number }> {
    return this.findMany({ ...filter, parentId: null });
  }

  async update(id: string, input: UpdateTodoInput): Promise<TodoWithSubtasks | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const now = nowISO();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) {
      updateData.status = input.status;
      if (input.status === "completed") {
        updateData.completedAt = now;
      }
    }
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;

    await db.update(schema.todos).set(updateData).where(eq(schema.todos.id, id));

    return this.findById(id);
  }

  async updateStatus(id: string, status: TodoStatus): Promise<TodoWithSubtasks | null> {
    return this.update(id, { status });
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    await db.update(schema.todos).set({ status: "archived", updatedAt: nowISO() }).where(eq(schema.todos.id, id));
    return true;
  }

  async hardDelete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
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

    const tree: TodoWithSubtasks[] = [];
    for (const root of roots) {
      const subtasks = await this.findSubtasks(root.id);
      const tags = await this.findTodoTags(root.id);
      tree.push({ ...root, subtasks, tags } as TodoWithSubtasks);
    }
    return tree;
  }

  async getStats(): Promise<TodoStats> {
    const allTodos = await db.select().from(schema.todos);

    const byPriority: Record<TodoPriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };
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

  
  private async syncTodoTags(todoId: string, tagNames: string[]): Promise<void> {
    await db.delete(schema.todoTags).where(eq(schema.todoTags.todoId, todoId));

    for (const name of tagNames) {
      let [tag] = await db.select().from(schema.tags).where(eq(schema.tags.name, name));
      if (!tag) {
        [tag] = await db.insert(schema.tags).values({ id: generateId(), name }).returning();
      }
      if (tag) {
        await db.insert(schema.todoTags).values({ todoId, tagId: tag.id });
      }
    }
  }

  private async findTodoTags(todoId: string) {
    const rows = await db
      .select({ id: schema.tags.id, name: schema.tags.name })
      .from(schema.todoTags)
      .innerJoin(schema.tags, eq(schema.todoTags.tagId, schema.tags.id))
      .where(eq(schema.todoTags.todoId, todoId));
    return rows;
  }

  private buildFilterConditions(filter: TodoFilter) {
    const conditions = [];

    if (filter.status) {
      conditions.push(eq(schema.todos.status, filter.status));
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
          like(schema.todos.title, `%${filter.search}%`),
          like(schema.todos.description, `%${filter.search}%`)
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
