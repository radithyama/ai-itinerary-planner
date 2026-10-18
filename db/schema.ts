import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { Itinerary } from "@/lib/itinerary";

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // HTML from the pre-Gemini generator. New plans use `itinerary` instead.
    text: text("text"),
    itinerary: jsonb("itinerary").$type<Itinerary>(),
    destination: text("destination"),
    activities: text("activities").array(),
    travelers: integer("travelers").notNull().default(1),
    pace: text("pace").notNull().default("balanced"),
    currency: text("currency").notNull().default("USD"),
    isPublic: boolean("is_public").notNull().default(false),
    budget: integer("budget").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    userId: text("user_id"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    userIdx: index("plans_user_id_created_at_idx").on(t.userId, t.createdAt),
  })
);

export type PlanRow = typeof plans.$inferSelect;
