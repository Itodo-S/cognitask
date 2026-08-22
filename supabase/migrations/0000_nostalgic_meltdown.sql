CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"claude_session_id" text,
	"title" text,
	"summary" text,
	"created_at" text NOT NULL,
	"last_modified" text NOT NULL,
	CONSTRAINT "sessions_claude_session_id_unique" UNIQUE("claude_session_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "todo_tags" (
	"todo_id" text NOT NULL,
	"tag_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"category" text,
	"due_date" text,
	"completed_at" text,
	"parent_id" text,
	"ai_metadata" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "user_preferences_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "todo_tags" ADD CONSTRAINT "todo_tags_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_tags" ADD CONSTRAINT "todo_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_parent_id_todos_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."todos"("id") ON DELETE no action ON UPDATE no action;