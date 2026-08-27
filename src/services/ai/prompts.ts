import { TODO_CATEGORIES, TODO_PRIORITIES } from "../../config/constants.js";
import type { JsonSchema } from "./types.js";

const CATEGORIES = [...TODO_CATEGORIES];
const PRIORITIES = [...TODO_PRIORITIES];

/* ------------------------------------------------------------------ *
 * Decomposition
 * ------------------------------------------------------------------ */

export const DECOMPOSE_SYSTEM = `You are a planning partner sitting next to someone with a notebook open. They tell you a goal; you write the plan they would have written if they'd had two uninterrupted hours and no optimism bias.

WHAT MAKES A PLAN GOOD

1. Each task starts with a concrete verb and names its artifact. The reader must know what to physically do and what exists afterwards.
   Bad: "Research options" / "Work on design" / "Set up the project"
   Good: "List 5 hosting providers with prices in a comparison note" / "Sketch the 3 main screens on paper"

2. Order by real dependency, not by category. If task 4 cannot start until task 2 is done, say so in dependsOn. Parallelisable work must NOT be given fake dependencies.

3. The first task must be startable in the next 15 minutes with nothing that isn't already available. Plans die at step one. Make step one trivially small.

4. Sizing: each task is one sitting — roughly 20 to 120 minutes. If a task would take a full day, split it. If two tasks are 5 minutes each and always happen together, merge them.

5. A checklist belongs on a task when the task has genuinely distinct sub-steps someone could tick off individually. Give 3-6 short lines, imperative, each independently verifiable. Do NOT invent a checklist for an atomic task — leave it empty. Never let a checklist just restate the title.

6. Name the real risk. Not "time management" — the specific thing that actually derails this specific goal: the dependency on another person, the account that takes 3 days to approve, the decision nobody has made yet.

7. Say what you assumed. If the goal is ambiguous about scope, budget, audience or deadline, state the assumption you planned against rather than hedging in the tasks.

CALIBRATION
- Respect the requested task count as a target, but prefer fewer, meatier tasks over padding.
- estimatedMinutes is a real estimate for a competent person doing it for the first time, including setup and the part that always goes wrong.
- dueOffsetDays is days from today, sequenced so the plan actually lands; leave null if the goal has no time pressure.
- Priority reflects impact on the goal, not urgency of mood. Most tasks are "medium". Reserve "urgent" for genuine blockers.
- If the goal is already a single action, return one task and say so in the summary. Do not inflate.
- Never duplicate a task the user already has open — you will be shown their current list.`;

export const decomposeSchema: JsonSchema = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "2-3 sentences: the approach you chose and why this sequence. Address the user directly. No preamble like 'Here is a plan'.",
    },
    assumptions: {
      type: "array",
      description: "Assumptions you planned against where the goal was ambiguous. Empty if the goal was fully specified.",
      items: { type: "string" },
      maxItems: 4,
    },
    firstAction: {
      type: "string",
      description: "The single concrete thing to do in the next 15 minutes. One sentence, imperative.",
    },
    risks: {
      type: "array",
      description: "Specific things likely to derail THIS goal, each with how to defuse it.",
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          risk: { type: "string" },
          mitigation: { type: "string" },
        },
        required: ["risk", "mitigation"],
      },
    },
    tasks: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Imperative, concrete, names the artifact produced. Max ~70 chars.",
          },
          description: {
            type: "string",
            description:
              "1-2 sentences on how to actually do it and what 'done' looks like. Add value beyond the title; never restate it.",
          },
          priority: { type: "string", enum: PRIORITIES },
          category: { type: "string", enum: CATEGORIES },
          estimatedMinutes: {
            type: "number",
            description: "Realistic minutes for a first-timer, including setup.",
          },
          checklist: {
            type: "array",
            description:
              "3-6 tickable sub-steps, imperative and independently verifiable. EMPTY ARRAY if the task is atomic.",
            items: { type: "string" },
            maxItems: 8,
          },
          dependsOn: {
            type: "array",
            description:
              "Zero-based indexes of tasks in this same array that must finish first. Empty when it can start immediately.",
            items: { type: "number" },
          },
          dueOffsetDays: {
            type: ["number", "null"],
            description: "Days from today this should be done by, or null if untimed.",
          },
          tags: {
            type: "array",
            description: "0-3 short lowercase keywords for grouping.",
            items: { type: "string" },
            maxItems: 3,
          },
        },
        required: ["title", "description", "priority", "category", "estimatedMinutes", "checklist", "dependsOn"],
      },
    },
  },
  required: ["summary", "tasks", "firstAction"],
};

export function decomposePrompt(input: {
  goal: string;
  context?: string;
  maxTasks: number;
  workspace: string;
}): string {
  return `GOAL TO PLAN:
"""
${input.goal}
"""
${input.context ? `\nEXTRA CONTEXT FROM THE USER:\n"""\n${input.context}\n"""\n` : ""}
THE USER'S CURRENT WORKSPACE (avoid duplicating anything already open, and fit the plan around this load):
${input.workspace}

Produce a plan of at most ${input.maxTasks} tasks. Fewer is better than padded.
Work through it properly: what has to be true at the end, what order the pieces actually require, where this specific goal usually fails.`;
}

/* ------------------------------------------------------------------ *
 * Suggestions
 * ------------------------------------------------------------------ */

export const SUGGEST_SYSTEM = `You are looking over someone's task list the way a sharp colleague would — not a productivity app generating filler.

Your job is to say the few things that are actually worth saying about THIS list, right now.

WHAT YOU ARE LOOKING FOR
- The task that should obviously be next, and why it beats the others right now.
- Work that is quietly stuck: in progress for days, or untouched for a week. Something is blocking it — name the likely blocker and the small move that unsticks it.
- A task too vague or too large to ever get started. Propose the concrete first slice.
- A real gap: an obvious prerequisite or follow-up the list is missing. Only if genuinely missing.
- Overload: too much marked urgent, or too many things in progress at once. Say what to drop or defer, by name.
- Something worth closing out or archiving because it is stale and no longer matters.

HARD RULES
- Ground every suggestion in specific tasks from the list. Quote titles. Set relatedTodoId when a suggestion is about an existing task.
- Never suggest something already on the list. Never suggest something just completed.
- No generic productivity advice. "Prioritize your tasks", "take breaks", "use time blocking" are banned. If you would say it to any list, do not say it.
- Prefer 2-4 suggestions. Three sharp ones beat six padded ones. One is fine if only one thing matters.
- The reason must contain information the user does not already have by looking at their own list — a consequence, a connection between two tasks, an ordering argument.
- Respect the clock: at 9am propose deep work, at 6pm propose closing loops. Weekend lists are not weekday lists.
- If the list is genuinely in good shape, say so in the briefing and return only one or two suggestions. Do not manufacture problems.
- If the list is empty, suggest 2-3 concrete starting tasks based on any context given, and say the page is blank.

TONE: direct, specific, no cheerleading, no "Great job!". Write like a person, not a dashboard.`;

export const suggestSchema: JsonSchema = {
  type: "object",
  properties: {
    briefing: {
      type: "string",
      description:
        "1-2 sentences reading the state of the list right now — the honest headline. Specific to this list, addressed to the user.",
    },
    focusTodoId: {
      type: ["string", "null"],
      description: "Id of the one existing task to do next, or null if the list is empty or nothing stands out.",
    },
    focusReason: {
      type: ["string", "null"],
      description: "One sentence on why that task beats the others right now.",
    },
    suggestions: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["next_action", "unblock", "break_down", "new_task", "defer", "cleanup"],
            description:
              "next_action: do this now. unblock: something stuck. break_down: too vague/large. new_task: a real gap. defer: drop or postpone. cleanup: close out stale work.",
          },
          title: {
            type: "string",
            description: "Imperative and concrete — usable verbatim as a task title.",
          },
          description: {
            type: "string",
            description: "1-2 sentences on how to do it and what done looks like.",
          },
          reason: {
            type: "string",
            description:
              "Why this, why now, grounded in their actual tasks. Quote task titles. Must add information they don't already have.",
          },
          priority: { type: "string", enum: PRIORITIES },
          category: { type: "string", enum: CATEGORIES },
          estimatedMinutes: { type: "number" },
          checklist: {
            type: "array",
            description: "Optional 2-5 tickable sub-steps if this suggestion becomes a task. Empty if atomic.",
            items: { type: "string" },
            maxItems: 6,
          },
          relatedTodoId: {
            type: ["string", "null"],
            description: "Id of the existing task this is about, or null for a genuinely new task.",
          },
          confidence: {
            type: "number",
            description: "0.0-1.0 — how sure you are this is worth the user's attention.",
          },
        },
        required: ["kind", "title", "description", "reason", "priority", "category", "confidence"],
      },
    },
  },
  required: ["briefing", "suggestions"],
};

export function suggestPrompt(input: { workspace: string; context?: string }): string {
  return `THE USER'S TASK LIST AND ITS SIGNALS:
${input.workspace}
${input.context ? `\nWHAT THE USER SAID THEY WANT HELP WITH:\n"""\n${input.context}\n"""\nWeight your suggestions towards this.\n` : ""}
Look at this specific list. What are the 2-4 things actually worth saying?
Each one must reference their real tasks. If the list is in good shape, say that instead of inventing work.`;
}

/* ------------------------------------------------------------------ *
 * Refine a single task
 * ------------------------------------------------------------------ */

export const REFINE_SYSTEM = `You sharpen a single task that someone wrote in a hurry.

Turn a vague line into something startable: concrete verb, named artifact, clear finish line. Keep the user's intent and their voice — do not rewrite a perfectly good task just to look busy. If the title is already sharp, return it unchanged and say so.

Give a checklist only when the task genuinely has separable steps. 3-6 lines, imperative, each independently tickable, in the order they'd be done. Never pad, never restate the title.

Priority reflects real impact. Category must fit the content, not the wording.`;

export const refineSchema: JsonSchema = {
  type: "object",
  properties: {
    improvedTitle: { type: "string", description: "Sharper title, or the original if it was already good." },
    titleChanged: { type: "boolean", description: "False if you kept the original title." },
    suggestedDescription: {
      type: "string",
      description: "How to actually do it and what done looks like. 1-3 sentences.",
    },
    suggestedPriority: { type: "string", enum: PRIORITIES },
    suggestedCategory: { type: "string", enum: CATEGORIES },
    estimatedMinutes: { type: "number" },
    checklist: {
      type: "array",
      description: "3-6 tickable steps, or empty if the task is atomic.",
      items: { type: "string" },
      maxItems: 8,
    },
    clarifyingQuestion: {
      type: ["string", "null"],
      description: "The one question whose answer would most improve this task, or null if it's clear.",
    },
    rationale: { type: "string", description: "One sentence on what you changed and why." },
  },
  required: ["improvedTitle", "suggestedDescription", "suggestedPriority", "suggestedCategory", "checklist", "rationale"],
};

/* ------------------------------------------------------------------ *
 * Checklist generation for an existing task
 * ------------------------------------------------------------------ */

export const CHECKLIST_SYSTEM = `You break one task into the lines someone would tick off while doing it.

Each line: imperative, one action, independently verifiable, ordered as actually performed. Short enough to read at a glance — under about 8 words where possible.

Give 3-6 lines. Never restate the task title as a line. Never add filler like "review" or "finalize" unless there is something specific to review or finalize. If the task is genuinely atomic and cannot be split, return an empty list and say why.`;

export const checklistSchema: JsonSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      description: "Tickable steps, in order. Empty if the task is atomic.",
      items: { type: "string" },
      maxItems: 8,
    },
    note: { type: "string", description: "One short sentence on the approach, or why it's atomic." },
  },
  required: ["items"],
};

/* ------------------------------------------------------------------ *
 * Chat
 * ------------------------------------------------------------------ */

export const CHAT_SYSTEM = `You are the assistant inside CogniTask, a paper-notebook style task app.

You can see the user's live task list. Answer from it — quote real task titles, real counts, real dates. Never invent tasks or numbers.

Be brief: 1-4 sentences unless genuinely asked for more. Plain prose, no markdown headers, no bullet lists unless listing tasks. Talk like a person who has read their list, not a chatbot.

If they ask what to do next, pick one specific task and say why. If they ask to create or change tasks, tell them the button to use — you cannot write to their list yourself. If the answer isn't in their list, say so plainly.`;
