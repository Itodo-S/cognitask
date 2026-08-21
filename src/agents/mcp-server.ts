import { z } from "zod";
import { todoHandlers } from "./handlers/todo-handlers.js";
import { planningHandlers } from "./handlers/planning-handlers.js";
import { smartHandlers } from "./handlers/smart-handlers.js";

type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
}>;

export const toolHandlers: Record<string, { schema: z.ZodTypeAny; handler: ToolHandler }> = {
  ...todoHandlers,
  ...planningHandlers,
  ...smartHandlers,
};
