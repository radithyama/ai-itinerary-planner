"use server";

import { db } from "@/db/drizzle";
import { plans } from "@/db/schema";
import {
  buildDayPrompt,
  buildItineraryPrompt,
  CURRENCIES,
  daySchema,
  dayJsonSchema,
  itineraryJsonSchema,
  itinerarySchema,
  PACES,
  totalCost,
  tripRequestSchema,
  type TripRequest,
} from "@/lib/itinerary";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { countPlansSince, getOwnedPlan } from "./plans";
import { generateJson, GeminiError } from "./gemini";

// Errors thrown from server actions are masked in production, so actions return a result instead.
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const DAILY_PLAN_LIMIT = Number(process.env.PLANIT_DAILY_LIMIT ?? 10);

// Day regenerations don't create rows, so they are limited in memory (one app instance).
const DAILY_REGEN_LIMIT = 30;
const regenUsage = new Map<string, { day: string; n: number }>();

function failure(e: unknown, fallback: string): { ok: false; error: string } {
  console.error(e);
  if (e instanceof GeminiError && e.status === 429) {
    return { ok: false, error: "The AI planner is busy right now. Please try again in a minute." };
  }
  return { ok: false, error: fallback };
}

export async function generateTripItinerary(input: TripRequest): Promise<ActionResult<{ id: string }>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Please sign in to plan a trip." };

  const parsed = tripRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your trip details." };
  }
  const req = parsed.data;

  const since = new Date(Date.now() - 86_400_000);
  if ((await countPlansSince(userId, since)) >= DAILY_PLAN_LIMIT) {
    return { ok: false, error: `You've reached today's limit of ${DAILY_PLAN_LIMIT} plans. Try again tomorrow.` };
  }

  try {
    const itinerary = await generateJson(buildItineraryPrompt(req), itineraryJsonSchema, itinerarySchema);
    itinerary.estimatedTotalCost = totalCost(itinerary);

    const [plan] = await db
      .insert(plans)
      .values({
        itinerary,
        destination: itinerary.destination,
        activities: req.activities,
        travelers: req.travelers,
        pace: req.pace,
        currency: req.currency,
        userId,
        budget: req.budget,
        startDate: req.startDate,
        endDate: req.endDate,
      })
      .returning({ id: plans.id });

    revalidatePath("/plans");
    return { ok: true, data: { id: plan.id } };
  } catch (e) {
    return failure(e, "We couldn't generate your plan. Please try again.");
  }
}

export async function regenerateDay(
  planId: string,
  dayIndex: number,
  note?: string
): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Please sign in first." };

  const plan = await getOwnedPlan(planId, userId);
  const itinerary = plan?.itinerary;
  if (!plan || !itinerary || !itinerary.days[dayIndex]) return { ok: false, error: "Plan not found." };

  const today = new Date().toISOString().slice(0, 10);
  const usage = regenUsage.get(userId);
  const used = usage?.day === today ? usage.n : 0;
  if (used >= DAILY_REGEN_LIMIT) return { ok: false, error: "You've regenerated a lot today. Try again tomorrow." };
  regenUsage.set(userId, { day: today, n: used + 1 });

  const req: TripRequest = {
    startDate: plan.startDate,
    endDate: plan.endDate,
    budget: plan.budget,
    currency: (CURRENCIES as readonly string[]).includes(plan.currency) ? (plan.currency as TripRequest["currency"]) : "USD",
    travelers: plan.travelers,
    pace: (PACES as readonly string[]).includes(plan.pace) ? (plan.pace as TripRequest["pace"]) : "balanced",
    activities: plan.activities ?? [],
    destination: itinerary.destination,
  };

  try {
    const day = await generateJson(buildDayPrompt(req, itinerary, dayIndex, note), dayJsonSchema, daySchema);
    const original = itinerary.days[dayIndex];
    const days = itinerary.days.map((d, i) => (i === dayIndex ? { ...day, day: original.day, date: original.date } : d));
    const updated = { ...itinerary, days };
    updated.estimatedTotalCost = totalCost(updated);

    await db
      .update(plans)
      .set({ itinerary: updated })
      .where(and(eq(plans.id, planId), eq(plans.userId, userId)));

    revalidatePath(`/plan/${planId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return failure(e, "We couldn't regenerate that day. Please try again.");
  }
}

export async function setPlanVisibility(planId: string, isPublic: boolean): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Please sign in first." };

  const updated = await db
    .update(plans)
    .set({ isPublic })
    .where(and(eq(plans.id, planId), eq(plans.userId, userId)))
    .returning({ id: plans.id });
  if (!updated.length) return { ok: false, error: "Plan not found." };

  revalidatePath(`/plan/${planId}`);
  return { ok: true, data: undefined };
}

export async function deletePlan(planId: string): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Please sign in first." };

  const deleted = await db
    .delete(plans)
    .where(and(eq(plans.id, planId), eq(plans.userId, userId)))
    .returning({ id: plans.id });
  if (!deleted.length) return { ok: false, error: "Plan not found." };

  revalidatePath("/plans");
  return { ok: true, data: undefined };
}
