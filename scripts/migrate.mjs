// Applies pending SQL migrations from ./migrations. Run by CI before each deploy.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await migrate(drizzle(client), { migrationsFolder: "./migrations" });
  console.log("Migrations up to date");
} finally {
  await client.end();
}
