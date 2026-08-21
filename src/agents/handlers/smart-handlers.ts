import { z } from "zod";
import { todoService } from "../../services/todo.service.js";
import { quickAddToolSchema } from "../tools/smart-tools.schema.js";

type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
}>;

export const smartHandlers: Record<string, { schema: z.ZodTypeAny; handler: ToolHandler }> = {
  quick_add: {
    schema: quickAddToolSchema,
    handler: async (args) => {
      const parsed = quickAddToolSchema.parse(args);
      const todo = await todoService.create({ title: parsed.text });
      return {
        content: [{ type: "text", text: JSON.stringify(todo, null, 2) }],
      };
    },
  },
};
