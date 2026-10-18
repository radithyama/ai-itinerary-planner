import "server-only";

import { db } from "@/db/drizzle";
import { plans, type PlanRow } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";

const uuid = z.string().uuid();

/**
 * Returns the plan if the viewer owns it or it has been shared; otherwise null.
 * Wrapped in cache() so generateMetadata and the page share one query per request.
 */
export const getPlanForViewer = cache(async function getPlanForViewer(
  id: string
): Promise<{ plan: PlanRow; isOwner: boolean } | null> {
  if (!uuid.safeParse(id).success) return null;

  const [plan] = await db.select().from(plans).where(eq(plans.id, id));
  if (!plan) return null;

  const { userId } = await auth();
  const isOwner = !!userId && plan.userId === userId;
  if (!isOwner && !plan.isPublic) return null;
  return { plan, isOwner };
});

export async function getOwnedPlan(id: string, userId: string) {
  if (!uuid.safeParse(id).success) return null;
  const [plan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.id, id), eq(plans.userId, userId)));
  return plan ?? null;
}

export async function getPlansByUser(userId: string) {
  return db
    .select()
    .from(plans)
    .where(eq(plans.userId, userId))
    .orderBy(desc(plans.createdAt));
}

export async function countPlansSince(userId: string, since: Date) {
  const [row] = await db
    .select({ n: count() })
    .from(plans)
    .where(and(eq(plans.userId, userId), gte(plans.createdAt, since)));
  return row?.n ?? 0;
}
