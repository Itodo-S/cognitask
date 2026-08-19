export {
  listTodosToolSchema,
  createTodoToolSchema,
  updateTodoToolSchema,
  completeTodoToolSchema,
  addSubtaskToolSchema,
  getTodoStatsToolSchema,
  searchTodosToolSchema,
  prioritizeTodosToolSchema,
  type ListTodosToolInput,
  type CreateTodoToolInput,
  type UpdateTodoToolInput,
  type CompleteTodoToolInput,
  type AddSubtaskToolInput,
  type SearchTodosToolInput,
  type PrioritizeTodosToolInput,
} from "./todo-tools.schema.js";

export {
  decomposeGoalToolSchema,
  suggestTasksToolSchema,
  analyzeProductivityToolSchema,
  bulkCategorizeToolSchema,
  type DecomposeGoalToolInput,
  type SuggestTasksToolInput,
  type BulkCategorizeToolInput,
} from "./planning-tools.schema.js";

export {
  completionTrendsSchema,
  identifyOverdueSchema,
  productivityScoreSchema,
  type CompletionTrendsInput,
} from "./analysis-tools.schema.js";

export {
  quickAddToolSchema,
  focusModeSchema,
  dailySummarySchema,
  smartSortSchema,
  type QuickAddToolInput,
  type FocusModeInput,
  type SmartSortInput,
} from "./smart-tools.schema.js";
