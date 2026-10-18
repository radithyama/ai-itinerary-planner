import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
config({ path: ".env.local" }); // or .env.local

// Connects lazily on the first query, so importing this during `next build` is safe.
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
export const db = drizzle(pool);
