import { z } from "zod";
import { config } from "dotenv";

config();

const envSchema = z.object({
  DATABASE_URL: z.string().default("./cognitask.db"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("*"),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000),
  // Which client to use. "auto" prefers the free-tier chain (Groq→Gemini) and
  // falls back to the Anthropic/AgentRouter path when no free key is present.
  AI_PROVIDER: z.enum(["auto", "groq", "gemini", "anthropic"]).default("auto"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_BASE_URL: z.string().optional(),
  GROQ_MODEL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_BASE_URL: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_BASE_URL: z.string().optional(),
  ANTHROPIC_AUTH_TOKEN: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
  CLAUDE_MODEL: z.string().optional(),
  CLAUDE_MAX_TURNS: z.coerce.number().default(30),
  CLAUDE_PERMISSION_MODE: z.enum(["default", "acceptEdits", "bypassPermissions"]).default("acceptEdits"),
  CLAUDE_CWD: z.string().optional(),
});

export const env = envSchema.parse(process.env);
