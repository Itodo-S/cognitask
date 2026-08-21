import { z } from "zod";
import { statsService } from "../../services/stats.service.js";
import {
  decomposeGoalToolSchema,
  analyzeProductivityToolSchema,
} from "../tools/planning-tools.schema.js";

type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
}>;

export const planningHandlers: Record<string, { schema: z.ZodTypeAny; handler: ToolHandler }> = {
  decompose_goal: {
    schema: decomposeGoalToolSchema,
    handler: async (args) => {
      const parsed = decomposeGoalToolSchema.parse(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                goal: parsed.goal,
                status: "ready_for_sdk_integration",
                message:
                  "When the Claude Agent SDK is added, this tool will decompose the goal into structured tasks using Claude's reasoning.",
              },
              null,
              2
            ),
          },
        ],
      };
    },
  },
  analyze_productivity: {
    schema: analyzeProductivityToolSchema,
    handler: async () => {
      const dashboard = await statsService.getDashboard();
      return {
        content: [{ type: "text", text: JSON.stringify(dashboard, null, 2) }],
      };
    },
  },
};
