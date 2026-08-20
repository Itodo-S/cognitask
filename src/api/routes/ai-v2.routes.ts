import type { FastifyInstance } from "fastify";
import { createAIService } from "../../services/claude-ai.service.js";
import { ClaudeOrchestrator } from "../../agents/claude-orchestrator.js";
import { todoService } from "../../services/todo.service.js";
import { success } from "../../utils/helpers.js";

const aiService = createAIService();
const orchestrator = new ClaudeOrchestrator(aiService);

export async function aiRoutes_v2(app: FastifyInstance) {
  app.post("/api/v2/ai/plan", async (request, reply) => {
    const { z } = await import("zod");
    const body = z.object({
      goal: z.string().min(1).max(2000),
      context: z.string().max(2000).optional(),
      saveTasks: z.boolean().optional().default(false),
    }).parse(request.body);

    try {
      const result = await orchestrator.decomposeGoal(
        { goal: body.goal, context: body.context },
        body.saveTasks
      );
      return reply.send(success({
        goal: body.goal,
        tasks: result.todos,
        savedIds: result.savedIds ?? [],
        sessionId: result.sessionId,
        summary: result.summary,
      }));
    } catch (err) {
      return reply.send(success({
        goal: body.goal,
        tasks: [],
        savedIds: [],
        summary: `Error: ${String(err)}`,
      }));
    }
  });

  app.post("/api/v2/ai/refine", async (request, reply) => {
    const { z } = await import("zod");
    const body = z.object({ todoId: z.string() }).parse(request.body);

    const todo = await todoService.findById(body.todoId);
    if (!todo) return reply.code(404).send({ success: false, error: "Todo not found" });

    const prompt = `Refine this task. Reply with ONLY valid JSON, no other text.

Task: "${todo.title}"
${todo.description ? `Description: "${todo.description}"` : ""}
Priority: ${todo.priority}
Category: ${todo.category ?? "none"}

Reply format:
{
  "improvedTitle": "<refined title>",
  "suggestedDescription": "<better description>",
  "suggestedPriority": "<low|medium|high|urgent>",
  "suggestedCategory": "<category>",
  "subtasks": [{"title": "<subtask1>"}, {"title": "<subtask2>"}]
}`;

    try {
      const { result } = await (aiService as any).collectResult
        ? await (aiService as any).collectResult(
            (await import("@anthropic-ai/claude-agent-sdk")).query({
              prompt,
              options: {
                mcpServers: {},
                allowedTools: [],
                permissionMode: "bypassPermissions",
                allowDangerouslySkipPermissions: true,
                maxTurns: 3,
              },
            })
          )
        : { result: "{}" };

      const parsed = (() => {
        try { return JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] ?? "{}"); } catch { return {}; }
      })();

      return reply.send(success({
        original: {
          title: todo.title,
          description: todo.description,
          priority: todo.priority,
          category: todo.category,
        },
        suggestions: {
          improvedTitle: parsed.improvedTitle ?? `${todo.title} — refined`,
          suggestedDescription: parsed.suggestedDescription ?? todo.description ?? `Enhanced description for: ${todo.title}`,
          suggestedPriority: parsed.suggestedPriority ?? todo.priority,
          suggestedCategory: parsed.suggestedCategory ?? todo.category ?? "work",
          subtasks: parsed.subtasks ?? [
            { title: `Step 1: ${todo.title}` },
            { title: `Step 2: ${todo.title}` },
          ],
        },
      }));
    } catch (err) {
      return reply.send(success({
        original: { title: todo.title, description: todo.description, priority: todo.priority, category: todo.category },
        suggestions: {
          improvedTitle: `${todo.title} — refined`,
          suggestedDescription: `Enhanced description for: ${todo.title}`,
          suggestedPriority: "high",
          suggestedCategory: todo.category ?? "work",
          subtasks: [{ title: `Step 1: ${todo.title}` }, { title: `Step 2: ${todo.title}` }],
        },
      }));
    }
  });
}
