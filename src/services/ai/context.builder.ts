import { db, schema } from "../../db/client.js";
import { checklistService } from "../checklist.service.js";
import type { ChecklistItem } from "../../types/checklist.js";

type TodoRow = typeof schema.todos.$inferSelect;

export interface WorkspaceSnapshot {
  now: Date;
  todos: TodoRow[];
  checklists: Map<string, ChecklistItem[]>;
  open: TodoRow[];
  inProgress: TodoRow[];
  overdue: TodoRow[];
  dueToday: TodoRow[];
  dueSoon: TodoRow[];
  stale: TodoRow[];
  unscheduled: TodoRow[];
  completedRecently: TodoRow[];
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  velocityPerWeek: number;
}

const DAY = 86_400_000;

function daysBetween(a: string | null, b: Date): number {
  if (!a) return Number.POSITIVE_INFINITY;
  return Math.floor((b.getTime() - new Date(a).getTime()) / DAY);
}

/** Load everything the model needs to reason about this workspace. */
export async function buildSnapshot(now = new Date()): Promise<WorkspaceSnapshot> {
  const todos = await db.select().from(schema.todos);
  const active = todos.filter((t) => t.status !== "archived");
  const open = active.filter((t) => t.status === "pending" || t.status === "in_progress");

  const checklists = await checklistService.findByTodoIds(open.slice(0, 60).map((t) => t.id));

  const iso = now.toISOString();
  const todayKey = iso.slice(0, 10);
  const soonIso = new Date(now.getTime() + 3 * DAY).toISOString();
  const weekAgoIso = new Date(now.getTime() - 7 * DAY).toISOString();

  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  for (const t of open) {
    const cat = t.category ?? "uncategorized";
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
  }

  const completedRecently = active
    .filter((t) => t.status === "completed" && t.completedAt && t.completedAt > weekAgoIso)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  return {
    now,
    todos: active,
    checklists,
    open,
    inProgress: open.filter((t) => t.status === "in_progress"),
    overdue: open.filter((t) => t.dueDate && t.dueDate < iso),
    dueToday: open.filter((t) => t.dueDate?.startsWith(todayKey)),
    dueSoon: open.filter((t) => t.dueDate && t.dueDate >= iso && t.dueDate <= soonIso),
    // Sitting untouched for over a week — the tasks that quietly rot.
    stale: open.filter((t) => daysBetween(t.updatedAt, now) >= 7),
    unscheduled: open.filter((t) => !t.dueDate),
    completedRecently,
    byCategory,
    byPriority,
    velocityPerWeek: completedRecently.length,
  };
}

function line(t: TodoRow, snapshot: WorkspaceSnapshot): string {
  const bits: string[] = [`[${t.id}]`, `(${t.status}/${t.priority})`, t.title];
  if (t.category) bits.push(`#${t.category}`);
  if (t.dueDate) {
    const overdue = t.dueDate < snapshot.now.toISOString();
    bits.push(`due ${t.dueDate.slice(0, 10)}${overdue ? " OVERDUE" : ""}`);
  }
  const age = daysBetween(t.updatedAt, snapshot.now);
  if (Number.isFinite(age) && age >= 7) bits.push(`untouched ${age}d`);

  const items = snapshot.checklists.get(t.id);
  if (items?.length) {
    const done = items.filter((i) => i.done).length;
    bits.push(`checklist ${done}/${items.length}`);
    const next = items.find((i) => !i.done);
    if (next) bits.push(`next-line: "${next.text}"`);
  }
  if (t.description) bits.push(`— ${t.description.slice(0, 120)}`);
  return bits.join(" ");
}

/**
 * Render the snapshot as a compact briefing the model can read cheaply.
 * Deliberately verbose about *signals* (overdue, stale, load) and terse about
 * raw rows, because the signals are what produce non-obvious advice.
 */
export function renderSnapshot(snapshot: WorkspaceSnapshot, limit = 40): string {
  const { now } = snapshot;
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const hour = now.getHours();
  const partOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const sections: string[] = [];

  sections.push(
    [
      `Current time: ${now.toISOString()} (${weekday} ${partOfDay})`,
      `Open tasks: ${snapshot.open.length} (${snapshot.inProgress.length} in progress)`,
      `Overdue: ${snapshot.overdue.length} | Due today: ${snapshot.dueToday.length} | Due within 3 days: ${snapshot.dueSoon.length}`,
      `Untouched 7+ days: ${snapshot.stale.length} | No due date: ${snapshot.unscheduled.length}`,
      `Completed in last 7 days: ${snapshot.velocityPerWeek}`,
      `Open by priority: ${JSON.stringify(snapshot.byPriority)}`,
      `Open by category: ${JSON.stringify(snapshot.byCategory)}`,
    ].join("\n")
  );

  if (snapshot.overdue.length) {
    sections.push(
      `OVERDUE:\n${snapshot.overdue.slice(0, 10).map((t) => line(t, snapshot)).join("\n")}`
    );
  }
  if (snapshot.inProgress.length) {
    sections.push(
      `IN PROGRESS:\n${snapshot.inProgress.slice(0, 10).map((t) => line(t, snapshot)).join("\n")}`
    );
  }

  const rest = snapshot.open
    .filter((t) => !snapshot.overdue.includes(t) && !snapshot.inProgress.includes(t))
    .slice(0, limit);
  if (rest.length) {
    sections.push(`OTHER OPEN TASKS:\n${rest.map((t) => line(t, snapshot)).join("\n")}`);
  }

  if (snapshot.completedRecently.length) {
    sections.push(
      `RECENTLY COMPLETED (for pattern, do not re-suggest):\n${snapshot.completedRecently
        .slice(0, 12)
        .map((t) => `- ${t.title}${t.category ? ` #${t.category}` : ""}`)
        .join("\n")}`
    );
  }

  if (snapshot.open.length === 0) {
    sections.push("The page is blank — this user has no open tasks at all.");
  }

  return sections.join("\n\n");
}
