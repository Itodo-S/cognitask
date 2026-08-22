import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";
import { env } from "../config/env.js";

const client = postgres(env.DATABASE_URL, { prepare: false });
export const db = drizzle(client, { schema });
export { schema };
