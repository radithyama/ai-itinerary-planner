import { db } from "@/db/drizzle";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/health          -> process is up
// GET /api/health?deep=1   -> also checks config and the database (used by the deploy smoke test)
export async function GET(req: Request) {
  const version = process.env.APP_VERSION ?? "dev";
  if (!new URL(req.url).searchParams.has("deep")) {
    return NextResponse.json({ status: "ok", version });
  }

  const checks: Record<string, boolean> = {
    gemini: !!process.env.GEMINI_API_KEY,
    clerk: !!process.env.CLERK_SECRET_KEY,
    database: false,
  };
  try {
    await db.execute(sql`select 1`);
    checks.database = true;
  } catch (e) {
    console.error("Health check database error", e);
  }

  const healthy = Object.values(checks).every(Boolean);
  return NextResponse.json({ status: healthy ? "ok" : "degraded", version, checks }, { status: healthy ? 200 : 503 });
}
