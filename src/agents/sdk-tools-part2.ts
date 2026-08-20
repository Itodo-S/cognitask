import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { todoService } from "../services/todo.service.js";
import { statsService } from "../services/stats.service.js";
import { cognitaskTools } from "./sdk-tools-part1.js";

const getOverdue = tool(
  "get_overdue",
  "Get all todos that are past their due date and not yet completed",
  {},
  async () => {
    const now = new Date().toISOString();
    const { todos } = await todoService.findMany({ limit: 100 });
    const overdue = todos.filter(
      (t) => t.status !== "completed" && t.status !== "archived" && t.dueDate && t.dueDate < now
    );
    return { content: [{ type: "text", text: JSON.stringify({ overdue, count: overdue.length }) }] };
  },
  { annotations: { readOnlyHint: true } }
);

const getUpcoming = tool(
  "get_upcoming",
  "Get todos due within the next N days",
  { days: z.number().min(1).max(30).optional().default(7).describe("Number of days to look ahead") },
  async (args) => {
    const now = new Date();
    const future = new Date(now.getTime() + args.days * 86400000).toISOString();
    const { todos } = await todoService.findMany({ limit: 100 });
    const upcoming = todos.filter(
      (t) => t.status !== "completed" && t.status !== "archived" && t.dueDate && t.dueDate > now.toISOString() && t.dueDate < future
    );
    return { content: [{ type: "text", text: JSON.stringify({ upcoming, count: upcoming.length, days: args.days }) }] };
  },
  { annotations: { readOnlyHint: true } }
);

const countByStatus = tool(
  "count_by_status",
  "Count todos grouped by status (pending, in_progress, completed, archived)",
  {},
  async () => {
    const stats = await todoService.getStats();
    return {
      content: [{ type: "text", text: JSON.stringify({
        pending: stats.pending, inProgress: stats.inProgress,
        completed: stats.completed, archived: stats.archived, total: stats.total,
      }) }],
    };
  },
  { annotations: { readOnlyHint: true } }
);

const getByPriority = tool(
  "get_by_priority",
  "Get all todos with a specific priority level",
  { priority: z.enum(["low", "medium", "high", "urgent"]).describe("Priority level to filter by") },
  async (args) => {
    const { todos, total } = await todoService.findMany({ priority: args.priority, limit: 50 });
    return { content: [{ type: "text", text: JSON.stringify({ priority: args.priority, total, todos }) }] };
  },
  { annotations: { readOnlyHint: true } }
);

const getByCategory = tool(
  "get_by_category",
  "Get all todos in a specific category",
  { category: z.string().describe("Category name") },
  async (args) => {
    const { todos, total } = await todoService.findMany({ category: args.category as any, limit: 50 });
    return { content: [{ type: "text", text: JSON.stringify({ category: args.category, total, todos }) }] };
  },
  { annotations: { readOnlyHint: true } }
);

const duplicateTodo = tool(
  "duplicate_todo",
  "Clone a todo with an optional title suffix",
  {
    id: z.string().describe("Todo ID to duplicate"),
    titleSuffix: z.string().optional().default(" (copy)").describe("Suffix to append to the title"),
  },
  async (args) => {
    const original = await todoService.findById(args.id);
    if (!original) return { content: [{ type: "text", text: JSON.stringify({ error: "Todo not found" }) }] };
    const duplicate = await todoService.create({
      title: `${original.title}${args.titleSuffix}`,
      description: original.description ?? undefined,
      priority: original.priority,
      category: original.category as any,
    });
    return { content: [{ type: "text", text: JSON.stringify(duplicate, null, 2) }] };
  },
  { annotations: { readOnlyHint: false } }
);

const getSubtasks = tool(
  "get_subtasks",
  "Get direct children (subtasks) of a parent todo",
  { parentId: z.string().describe("Parent todo ID") },
  async (args) => {
    const subtasks = await todoService.findSubtasks(args.parentId);
    return { content: [{ type: "text", text: JSON.stringify({ parentId: args.parentId, subtasks, count: subtasks.length }) }] };
  },
  { annotations: { readOnlyHint: true } }
);

const bulkUpdatePriority = tool(
  "bulk_update_priority",
  "Update priority for multiple todos at once",
  {
    ids: z.array(z.string()).min(1).describe("Array of todo IDs"),
    priority: z.enum(["low", "medium", "high", "urgent"]).describe("New priority level"),
  },
  async (args) => {
    const results = [];
    for (const id of args.ids) {
      const todo = await todoService.update(id, { priority: args.priority });
      if (todo) results.push(todo);
    }
    return { content: [{ type: "text", text: JSON.stringify({ updated: results.length, priority: args.priority }) }] };
  },
  { annotations: { readOnlyHint: false, idempotentHint: true } }
);

const quickAdd = tool(
  "quick_add",
  "Quickly create a todo from a natural language text description. Parses title, priority, category, and due date from the input.",
  { text: z.string().min(1).max(1000).describe("Natural language task description") },
  async (args) => {
    const todo = await todoService.create({ title: args.text });
    return { content: [{ type: "text", text: JSON.stringify(todo, null, 2) }] };
  },
  { annotations: { readOnlyHint: false } }
);

const analyzeProductivity = tool(
  "analyze_productivity",
  "Get dashboard analytics: stats, recent completions, and upcoming deadlines",
  {},
  async () => {
    const dashboard = await statsService.getDashboard();
    return { content: [{ type: "text", text: JSON.stringify(dashboard, null, 2) }] };
  },
  { annotations: { readOnlyHint: true } }
);

export const allCognitaskTools = [
  ...cognitaskTools,
  getOverdue, getUpcoming, countByStatus, getByPriority, getByCategory,
  duplicateTodo, getSubtasks, bulkUpdatePriority, quickAdd, analyzeProductivity,
];

export const cognitaskMcpServer = createSdkMcpServer({
  name: "cognitask",
  version: "0.1.0",
  instructions: "CogniTask todo management tools. Use these tools to create, read, update, delete, search, and analyze todo tasks.",
  tools: allCognitaskTools,
});
