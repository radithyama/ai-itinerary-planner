// Applies pending SQL migrations from ./migrations. Run by CI before each deploy.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

await migrate(drizzle(neon(process.env.DATABASE_URL)), { migrationsFolder: "./migrations" });
console.log("Migrations up to date");
