import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

let pool: Pool | undefined;
let transactionalDb: ReturnType<typeof drizzle<typeof schema>> | undefined;

/**
 * Use only for writes that need a real multi-statement transaction
 * (e.g. saving a programme + its ordered exercises atomically) —
 * the default `getDb()` client (neon-http) doesn't support transactions.
 */
export function getTransactionalDb() {
  if (!transactionalDb) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED! });
    transactionalDb = drizzle(pool, { schema });
  }
  return transactionalDb;
}
