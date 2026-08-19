import { z } from "zod";
import { todoService } from "../../services/todo.service.js";
import { statsService } from "../../services/stats.service.js";
import {
  listTodosToolSchema,
  createTodoToolSchema,
  updateTodoToolSchema,
  completeTodoToolSchema,
  addSubtaskToolSchema,
  searchTodosToolSchema,
} from "./tools/todo-tools.schema.js";
import {
  decomposeGoalToolSchema,
  analyzeProductivityToolSchema,
} from "./tools/planning-tools.schema.js";
import { quickAddToolSchema } from "./tools/smart-tools.schema.js";
import { todoService } from "../../services/todo.service.js";

/**
 * Tool handler function type.
 * When the Claude Agent SDK is integrated, each handler maps to an MCP tool via tool().
 */
type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
}>;

/**
 * Register all custom MCP tools.
 *
 * ──────────────────────────────────────────────────────────────────────
 *  WHEN YOU ADD THE CLAUDE AGENT SDK:
 *
 *  1. Import:  import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
 *  2. Convert each handler below to use tool() + Zod schema:
 *
 *     const myTool = tool(
 *       "list_todos",
 *       "List and filter todos",
 *       listTodosToolSchema,
 *       async (args) => {
 *         const result = await todoService.findMany(args);
 *         return {
 *           content: [{ type: "text", text: JSON.stringify(result) }],
 *         };
 *       },
 *       { annotations: { readOnlyHint: true } }
 *     );
 *
 *  3. Create MCP server:
 *     const mcpServer = createSdkMcpServer({
 *       name: "cognitask",
 *       version: "0.1.0",
 *       tools: [listTodosTool, createTodoTool, ...],
 *     });
 *
 *  4. Pass mcpServer to query() options as mcpServers: [mcpServer]
 * ──────────────────────────────────────────────────────────────────────
 */

export const toolHandlers: Record<string, { schema: z.ZodTypeAny; handler: ToolHandler }> = {
  list_todos: {
    schema: listTodosToolSchema,
    handler: async (args) => {
      const parsed = listTodosToolSchema.parse(args);
      const { todos, total } = await todoService.findMany({
        status: parsed.status,
        priority: parsed.priority,
        category: parsed.category,
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
      const todo = await todoService.create(parsed);
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
      const todo = await todoService.update(id, rest);
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

  decompose_goal: {
    schema: decomposeGoalToolSchema,
    handler: async (args) => {
      const parsed = decomposeGoalToolSchema.parse(args);
      // This will use the real AI service when SDK is integrated
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                goal: parsed.goal,
                status: "ready_for_sdk_integration",
                message:
                  "When the Claude Agent SDK is added, this tool will decompose the goal into structured tasks using Claude's reasoning.",
              },
              null,
              2
            ),
          },
        ],
      };
    },
  },

  analyze_productivity: {
    schema: analyzeProductivityToolSchema,
    handler: async () => {
      const dashboard = await statsService.getDashboard();
      return {
        content: [{ type: "text", text: JSON.stringify(dashboard, null, 2) }],
      };
    },
  },

  quick_add: {
    schema: quickAddToolSchema,
    handler: async (args) => {
      const parsed = quickAddToolSchema.parse(args);
      const todo = await todoService.create({ title: parsed.text });
      return {
        content: [{ type: "text", text: JSON.stringify(todo, null, 2) }],
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
};
