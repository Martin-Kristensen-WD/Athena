import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { seedCatalog } from "./lib/catalog";

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

const ADMIN_EMAIL = "martin.kristensen@aller.com";

async function main() {
  console.log("Seeding metric and exercise catalog...");
  await seedCatalog(db);

  console.log(`Granting admin role to ${ADMIN_EMAIL} (if the account exists)...`);
  await db
    .update(schema.users)
    .set({ role: "admin" })
    .where(eq(schema.users.email, ADMIN_EMAIL));

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
