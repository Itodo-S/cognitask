import { z } from "zod";
import { todoService } from "../../services/todo.service.js";
import {
  listTodosToolSchema,
  createTodoToolSchema,
  updateTodoToolSchema,
  completeTodoToolSchema,
  addSubtaskToolSchema,
  searchTodosToolSchema,
} from "../tools/todo-tools.schema.js";

type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
}>;

export const todoHandlers: Record<string, { schema: z.ZodTypeAny; handler: ToolHandler }> = {
  list_todos: {
    schema: listTodosToolSchema,
    handler: async (args) => {
      const parsed = listTodosToolSchema.parse(args);
      const { todos, total } = await todoService.findMany({
        status: parsed.status,
        priority: parsed.priority,
        category: parsed.category as any,
        search: parsed.search,
        limit: parsed.limit,
      });
      return {
        content: [{ type: "text", text: JSON.stringify({ total, todos }, null, 2) }],
      };
    },
  },
  create_todo: {
    schema: createTodoToolSchema,
    handler: async (args) => {
      const parsed = createTodoToolSchema.parse(args);
      const todo = await todoService.create(parsed as any);
      return {
        content: [{ type: "text", text: JSON.stringify(todo, null, 2) }],
      };
    },
  },
  update_todo: {
    schema: updateTodoToolSchema,
    handler: async (args) => {
      const parsed = updateTodoToolSchema.parse(args);
      const { id, ...rest } = parsed;
      const todo = await todoService.update(id, rest as any);
      return {
        content: [{ type: "text", text: JSON.stringify(todo, null, 2) }],
      };
    },
  },
  complete_todo: {
    schema: completeTodoToolSchema,
    handler: async (args) => {
      const parsed = completeTodoToolSchema.parse(args);
      const todo = await todoService.updateStatus(parsed.id, "completed");
      return {
        content: [{ type: "text", text: JSON.stringify(todo, null, 2) }],
      };
    },
  },
  add_subtask: {
    schema: addSubtaskToolSchema,
    handler: async (args) => {
      const parsed = addSubtaskToolSchema.parse(args);
      const { parentId, ...rest } = parsed;
      const subtask = await todoService.create({ ...rest, parentId });
      return {
        content: [{ type: "text", text: JSON.stringify(subtask, null, 2) }],
      };
    },
  },
  search_todos: {
    schema: searchTodosToolSchema,
    handler: async (args) => {
      const parsed = searchTodosToolSchema.parse(args);
      const { todos, total } = await todoService.findMany({
        search: parsed.query,
        limit: parsed.limit,
      });
      return {
        content: [{ type: "text", text: JSON.stringify({ total, todos }, null, 2) }],
      };
    },
  },
  get_todo_stats: {
    schema: z.object({}),
    handler: async () => {
      const stats = await todoService.getStats();
      return {
        content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
      };
    },
  },
  get_todo_tree: {
    schema: z.object({}),
    handler: async () => {
      const tree = await todoService.getTree();
      return {
        content: [{ type: "text", text: JSON.stringify(tree, null, 2) }],
      };
    },
  },
  archive_todo: {
    schema: z.object({ id: z.string() }),
    handler: async (args) => {
      const parsed = z.object({ id: z.string() }).parse(args);
      const result = await todoService.delete(parsed.id);
      return {
        content: [{ type: "text", text: JSON.stringify({ archived: result }) }],
      };
    },
  },
  bulk_complete: {
    schema: z.object({ ids: z.array(z.string()).min(1) }),
    handler: async (args) => {
      const parsed = z.object({ ids: z.array(z.string()).min(1) }).parse(args);
      const results = [];
      for (const id of parsed.ids) {
        const todo = await todoService.updateStatus(id, "completed");
        if (todo) results.push(todo);
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ completed: results.length, todos: results }) }],
      };
    },
  },
  get_overdue: {
    schema: z.object({}),
    handler: async () => {
      const now = new Date().toISOString();
      const { todos } = await todoService.findMany({ limit: 100 });
      const overdue = todos.filter(
        (t) => t.status !== "completed" && t.status !== "archived" && t.dueDate && t.dueDate < now
      );
      return {
        content: [{ type: "text", text: JSON.stringify({ overdue, count: overdue.length }) }],
      };
    },
  },
  get_upcoming: {
    schema: z.object({ days: z.number().min(1).max(30).optional().default(7) }),
    handler: async (args) => {
      const parsed = z.object({ days: z.number().min(1).max(30).optional().default(7) }).parse(args);
      const now = new Date();
      const future = new Date(now.getTime() + parsed.days * 86400000).toISOString();
      const { todos } = await todoService.findMany({ limit: 100 });
      const upcoming = todos.filter(
        (t) =>
          t.status !== "completed" &&
          t.status !== "archived" &&
          t.dueDate &&
          t.dueDate > now.toISOString() &&
          t.dueDate < future
      );
      return {
        content: [{ type: "text", text: JSON.stringify({ upcoming, count: upcoming.length, days: parsed.days }) }],
      };
    },
  },
  count_by_status: {
    schema: z.object({}),
    handler: async () => {
      const stats = await todoService.getStats();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              pending: stats.pending,
              inProgress: stats.inProgress,
              completed: stats.completed,
              archived: stats.archived,
              total: stats.total,
            }),
          },
        ],
      };
    },
  },
  get_by_priority: {
    schema: z.object({ priority: z.enum(["low", "medium", "high", "urgent"]) }),
    handler: async (args) => {
      const parsed = z.object({ priority: z.enum(["low", "medium", "high", "urgent"]) }).parse(args);
      const { todos, total } = await todoService.findMany({ priority: parsed.priority, limit: 50 });
      return {
        content: [{ type: "text", text: JSON.stringify({ priority: parsed.priority, total, todos }) }],
      };
    },
  },
  get_by_category: {
    schema: z.object({ category: z.string() }),
    handler: async (args) => {
      const parsed = z.object({ category: z.string() }).parse(args);
      const { todos, total } = await todoService.findMany({ category: parsed.category as any, limit: 50 });
      return {
        content: [{ type: "text", text: JSON.stringify({ category: parsed.category, total, todos }) }],
      };
    },
  },
  duplicate_todo: {
    schema: z.object({ id: z.string(), titleSuffix: z.string().optional().default(" (copy)") }),
    handler: async (args) => {
      const parsed = z.object({ id: z.string(), titleSuffix: z.string().optional().default(" (copy)") }).parse(args);
      const original = await todoService.findById(parsed.id);
      if (!original) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "Todo not found" }) }] };
      }
      const duplicate = await todoService.create({
        title: `${original.title}${parsed.titleSuffix}`,
        description: original.description ?? undefined,
        priority: original.priority,
        category: original.category as any,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(duplicate, null, 2) }],
      };
    },
  },
  get_subtasks: {
    schema: z.object({ parentId: z.string() }),
    handler: async (args) => {
      const parsed = z.object({ parentId: z.string() }).parse(args);
      const subtasks = await todoService.findSubtasks(parsed.parentId);
      return {
        content: [{ type: "text", text: JSON.stringify({ parentId: parsed.parentId, subtasks, count: subtasks.length }) }],
      };
    },
  },
  bulk_update_priority: {
    schema: z.object({ ids: z.array(z.string()).min(1), priority: z.enum(["low", "medium", "high", "urgent"]) }),
    handler: async (args) => {
      const parsed = z.object({ ids: z.array(z.string()).min(1), priority: z.enum(["low", "medium", "high", "urgent"]) }).parse(args);
      const results = [];
      for (const id of parsed.ids) {
        const todo = await todoService.update(id, { priority: parsed.priority });
        if (todo) results.push(todo);
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ updated: results.length, priority: parsed.priority }) }],
      };
    },
  },
};
