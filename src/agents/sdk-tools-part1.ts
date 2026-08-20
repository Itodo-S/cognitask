import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { todoService } from "../services/todo.service.js";
import { statsService } from "../services/stats.service.js";

const listTodos = tool(
  "list_todos",
  "List and filter todos by status, priority, category, or search query",
  {
    status: z.enum(["pending", "in_progress", "completed", "archived"]).optional().describe("Filter by status"),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional().describe("Filter by priority"),
    category: z.string().optional().describe("Filter by category"),
    search: z.string().optional().describe("Search in title and description"),
    limit: z.number().min(1).max(100).optional().default(20).describe("Max results"),
  },
  async (args) => {
    const { todos, total } = await todoService.findMany({
      status: args.status, priority: args.priority,
      category: args.category as any, search: args.search, limit: args.limit,
    });
    return { content: [{ type: "text", text: JSON.stringify({ total, todos }, null, 2) }] };
  },
  { annotations: { readOnlyHint: true, destructiveHint: false } }
);

const createTodo = tool(
  "create_todo",
  "Create a new todo task with title, description, priority, category, and optional due date",
  {
    title: z.string().min(1).max(500).describe("Task title"),
    description: z.string().max(5000).optional().describe("Detailed description"),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium").describe("Task priority"),
    category: z.string().optional().describe("Task category (work, personal, health, etc.)"),
    dueDate: z.string().optional().describe("Due date in ISO format"),
    parentId: z.string().optional().describe("Parent task ID for subtasks"),
  },
  async (args) => {
    const todo = await todoService.create({
      title: args.title, description: args.description, priority: args.priority,
      category: args.category as any, dueDate: args.dueDate, parentId: args.parentId,
    });
    return { content: [{ type: "text", text: JSON.stringify(todo, null, 2) }] };
  },
  { annotations: { readOnlyHint: false, destructiveHint: false } }
);

const updateTodo = tool(
  "update_todo",
  "Update an existing todo's fields (title, description, status, priority, category, dueDate)",
  {
    id: z.string().describe("Todo ID to update"),
    title: z.string().min(1).max(500).optional().describe("New title"),
    description: z.string().max(5000).optional().describe("New description"),
    status: z.enum(["pending", "in_progress", "completed", "archived"]).optional().describe("New status"),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional().describe("New priority"),
    category: z.string().optional().describe("New category"),
    dueDate: z.string().optional().describe("New due date in ISO format"),
  },
  async (args) => {
    const { id, ...rest } = args;
    const todo = await todoService.update(id, rest);
    return { content: [{ type: "text", text: JSON.stringify(todo, null, 2) }] };
  },
  { annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true } }
);

const completeTodo = tool(
  "complete_todo",
  "Mark a todo as completed",
  { id: z.string().describe("Todo ID to complete") },
  async (args) => {
    const todo = await todoService.updateStatus(args.id, "completed");
    return { content: [{ type: "text", text: JSON.stringify(todo, null, 2) }] };
  },
  { annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true } }
);

const addSubtask = tool(
  "add_subtask",
  "Create a subtask under a parent todo",
  {
    parentId: z.string().describe("Parent todo ID"),
    title: z.string().min(1).max(500).describe("Subtask title"),
    description: z.string().max(5000).optional().describe("Subtask description"),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium").describe("Subtask priority"),
  },
  async (args) => {
    const { parentId, ...rest } = args;
    const subtask = await todoService.create({ ...rest, parentId });
    return { content: [{ type: "text", text: JSON.stringify(subtask, null, 2) }] };
  },
  { annotations: { readOnlyHint: false, destructiveHint: false } }
);

const searchTodos = tool(
  "search_todos",
  "Full-text search across todo titles and descriptions",
  {
    query: z.string().min(1).describe("Search query"),
    limit: z.number().min(1).max(50).optional().default(10).describe("Max results"),
  },
  async (args) => {
    const { todos, total } = await todoService.findMany({ search: args.query, limit: args.limit });
    return { content: [{ type: "text", text: JSON.stringify({ total, todos }, null, 2) }] };
  },
  { annotations: { readOnlyHint: true } }
);

const getTodoStats = tool(
  "get_todo_stats",
  "Get aggregate statistics: total, pending, in_progress, completed, archived counts, and breakdown by priority/category",
  {},
  async () => {
    const stats = await todoService.getStats();
    return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
  },
  { annotations: { readOnlyHint: true } }
);

const getTodoTree = tool(
  "get_todo_tree",
  "Get the full hierarchical todo tree with parent-child relationships",
  {},
  async () => {
    const tree = await todoService.getTree();
    return { content: [{ type: "text", text: JSON.stringify(tree, null, 2) }] };
  },
  { annotations: { readOnlyHint: true } }
);

const archiveTodo = tool(
  "archive_todo",
  "Archive (soft-delete) a todo. It will no longer appear in active lists.",
  { id: z.string().describe("Todo ID to archive") },
  async (args) => {
    const result = await todoService.delete(args.id);
    return { content: [{ type: "text", text: JSON.stringify({ archived: result }) }] };
  },
  { annotations: { readOnlyHint: false, destructiveHint: true } }
);

const bulkComplete = tool(
  "bulk_complete",
  "Mark multiple todos as completed at once",
  { ids: z.array(z.string()).min(1).describe("Array of todo IDs to complete") },
  async (args) => {
    const results = [];
    for (const id of args.ids) {
      const todo = await todoService.updateStatus(id, "completed");
      if (todo) results.push(todo);
    }
    return { content: [{ type: "text", text: JSON.stringify({ completed: results.length, todos: results }) }] };
  },
  { annotations: { readOnlyHint: false, idempotentHint: true } }
);

export const cognitaskTools = [
  listTodos, createTodo, updateTodo, completeTodo, addSubtask,
  searchTodos, getTodoStats, getTodoTree, archiveTodo, bulkComplete,
];
