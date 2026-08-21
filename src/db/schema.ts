import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const todos = sqliteTable("todos", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  category: text("category"),
  dueDate: text("due_date"),
  completedAt: text("completed_at"),
  parentId: text("parent_id").references((): any => todos.id),
  aiMetadata: text("ai_metadata"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const tags = sqliteTable("tags", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
});

export const todoTags = sqliteTable("todo_tags", {
  todoId: text("todo_id")
    .notNull()
    .references(() => todos.id, { onDelete: "cascade" }),
  tagId: text("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});

export const sessions = sqliteTable("sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  claudeSessionId: text("claude_session_id").unique(),
  title: text("title"),
  summary: text("summary"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  lastModified: text("last_modified")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const userPreferences = sqliteTable("user_preferences", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const todosRelations = relations(todos, ({ one, many }) => ({
  parent: one(todos, {
    fields: [todos.parentId],
    references: [todos.id],
    relationName: "subtasks",
  }),
  subtasks: many(todos, { relationName: "subtasks" }),
  todoTags: many(todoTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  todoTags: many(todoTags),
}));

export const todoTagsRelations = relations(todoTags, ({ one }) => ({
  todo: one(todos, {
    fields: [todoTags.todoId],
    references: [todos.id],
  }),
  tag: one(tags, {
    fields: [todoTags.tagId],
    references: [tags.id],
  }),
}));
