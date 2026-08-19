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
});

export const env = envSchema.parse(process.env);
