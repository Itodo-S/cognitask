CREATE TABLE IF NOT EXISTS `todos` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `description` text,
  `status` text NOT NULL DEFAULT 'pending',
  `priority` text NOT NULL DEFAULT 'medium',
  `category` text,
  `due_date` text,
  `completed_at` text,
  `parent_id` text,
  `ai_metadata` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`parent_id`) REFERENCES `todos`(`id`)
);

CREATE TABLE IF NOT EXISTS `tags` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS `todo_tags` (
  `todo_id` text NOT NULL,
  `tag_id` text NOT NULL,
  PRIMARY KEY (`todo_id`, `tag_id`),
  FOREIGN KEY (`todo_id`) REFERENCES `todos`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `claude_session_id` text UNIQUE,
  `title` text,
  `summary` text,
  `created_at` text NOT NULL,
  `last_modified` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `user_preferences` (
  `id` text PRIMARY KEY NOT NULL,
  `key` text NOT NULL UNIQUE,
  `value` text NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_todos_status` ON `todos`(`status`);
CREATE INDEX IF NOT EXISTS `idx_todos_priority` ON `todos`(`priority`);
CREATE INDEX IF NOT EXISTS `idx_todos_parent_id` ON `todos`(`parent_id`);
CREATE INDEX IF NOT EXISTS `idx_todos_due_date` ON `todos`(`due_date`);
CREATE INDEX IF NOT EXISTS `idx_todos_created_at` ON `todos`(`created_at`);
CREATE INDEX IF NOT EXISTS `idx_sessions_claude_id` ON `sessions`(`claude_session_id`);
