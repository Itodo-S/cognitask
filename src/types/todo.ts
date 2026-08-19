import type { TodoStatus, TodoPriority, TodoCategory } from "../config/constants.js";

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  category: TodoCategory | null;
  dueDate: string | null;
  completedAt: string | null;
  parentId: string | null;
  aiMetadata: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TodoWithSubtasks extends Todo {
  subtasks?: TodoWithSubtasks[];
  tags?: Tag[];
}

export interface Tag {
  id: string;
  name: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  category?: TodoCategory;
  dueDate?: string;
  parentId?: string;
  tags?: string[];
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  category?: TodoCategory;
  dueDate?: string;
}

export interface TodoFilter {
  status?: TodoStatus;
  priority?: TodoPriority;
  category?: TodoCategory;
  parentId?: string | null;
  search?: string;
  tags?: string[];
  dueBefore?: string;
  dueAfter?: string;
  limit?: number;
  offset?: number;
}

export interface TodoStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  archived: number;
  byPriority: Record<TodoPriority, number>;
  byCategory: Record<string, number>;
}
