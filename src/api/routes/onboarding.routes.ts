import type { FastifyInstance } from "fastify";
import { success } from "../../utils/helpers.js";

export async function onboardingRoutes(app: FastifyInstance) {
  // GET /api/onboarding/checklist — onboarding progress
  app.get("/api/onboarding/checklist", async (_request, reply) => {
    return reply.send(
      success({
        steps: [
          { id: "create_first_todo", label: "Create your first todo", completed: false },
          { id: "set_priority", label: "Set a priority on a todo", completed: false },
          { id: "add_subtask", label: "Add a subtask", completed: false },
          { id: "use_ai_decompose", label: "Try AI goal decomposition", completed: false },
          { id: "create_tag", label: "Create a tag", completed: false },
          { id: "set_due_date", label: "Set a due date", completed: false },
          { id: "use_keyboard_shortcut", label: "Use a keyboard shortcut", completed: false },
          { id: "export_data", label: "Export your data", completed: false },
          { id: "use_focus_mode", label: "Try focus mode", completed: false },
          { id: "create_project", label: "Create a project", completed: false },
        ],
        totalSteps: 10,
      })
    );
  });

  // POST /api/onboarding/complete-step — mark step complete
  app.post("/api/onboarding/complete-step", async (request, reply) => {
    const { z } = await import("zod");
    const body = z.object({ stepId: z.string() }).parse(request.body);
    return reply.send(success({ stepId: body.stepId, completed: true }, "Step marked complete"));
  });

  // GET /api/onboarding/tips — getting started tips
  app.get("/api/onboarding/tips", async (_request, reply) => {
    return reply.send(
      success([
        { tip: "Use natural language in the AI quick-add to auto-categorize tasks", category: "ai" },
        { tip: "Try the daily plan feature to prioritize your day", category: "productivity" },
        { tip: "Set up keyboard shortcuts for faster navigation", category: "efficiency" },
        { tip: "Use the Eisenhower matrix view to prioritize by urgency and importance", category: "organization" },
        { tip: "Create projects to group related todos together", category: "organization" },
        { tip: "Track your habits with the habit tracker", category: "wellness" },
        { tip: "Use focus mode for deep work sessions", category: "productivity" },
        { tip: "Export your data regularly as backup", category: "data" },
      ])
    );
  });
}
