import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, Lightbulb, Users, Wallet } from "lucide-react";
import { Button } from "../ui/button";
import type { PlanRow } from "@/db/schema";
import { formatMoney, legacyHtmlToLines, tripLength } from "@/lib/itinerary";
import { cn } from "@/lib/utils";
import PlanActions from "./plan-actions";
import DayCard from "./day-card";

interface PlanProps {
  plan: PlanRow;
  isOwner: boolean;
}

// Plan dates are calendar days; parse as local midnight so they never shift a day.
const day = (d: string) => new Date(`${d}T00:00:00`);

export default function Plan({ plan, isOwner }: PlanProps) {
  const itinerary = plan.itinerary;
  const days = tripLength(plan.startDate, plan.endDate);
  const spent = itinerary?.estimatedTotalCost ?? 0;
  const ratio = plan.budget > 0 ? spent / plan.budget : 0;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      {isOwner && (
        <Link
          href="/plans"
          className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground print:hidden"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> My trips
        </Link>
      )}

      <header className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 space-y-2">
            <h1 className="text-3xl font-bold md:text-4xl">
              {plan.destination ? `Your trip to ${plan.destination}` : "Your Trip Plan"}
            </h1>
            {itinerary?.summary && <p className="max-w-2xl text-muted-foreground">{itinerary.summary}</p>}
          </div>
          <PlanActions planId={plan.id} isOwner={isOwner} isPublic={plan.isPublic} />
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border p-4">
            <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <CalendarDays className="h-4 w-4" /> Dates
            </dt>
            <dd className="mt-1 font-medium">
              {format(day(plan.startDate), "MMM d")} – {format(day(plan.endDate), "MMM d, yyyy")}
            </dd>
            <dd className="text-sm text-muted-foreground">
              {days} day{days === 1 ? "" : "s"}
            </dd>
          </div>
          <div className="rounded-xl border p-4">
            <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Users className="h-4 w-4" /> Travelers
            </dt>
            <dd className="mt-1 font-medium">
              {plan.travelers} {plan.travelers === 1 ? "person" : "people"}
            </dd>
            <dd className="text-sm text-muted-foreground">
              {plan.pace.charAt(0).toUpperCase() + plan.pace.slice(1)} pace
            </dd>
          </div>
          <div className="rounded-xl border p-4">
            <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Wallet className="h-4 w-4" /> Budget
            </dt>
            {itinerary ? (
              <>
                <dd className="mt-1 font-medium">
                  {formatMoney(spent, plan.currency)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    of {formatMoney(plan.budget, plan.currency)}
                  </span>
                </dd>
                <dd className="mt-2">
                  <div
                    className="h-2 overflow-hidden rounded-full bg-secondary"
                    role="meter"
                    aria-valuenow={Math.round(ratio * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Estimated cost against budget"
                  >
                    <div
                      className={cn("h-full rounded-full", ratio > 1 ? "bg-amber-500" : "bg-emerald-500")}
                      style={{ width: `${Math.min(ratio, 1) * 100}%` }}
                    />
                  </div>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {ratio > 1
                      ? `${formatMoney(spent - plan.budget, plan.currency)} over budget`
                      : `${formatMoney(plan.budget - spent, plan.currency)} left for flights, hotels & extras`}
                  </span>
                </dd>
              </>
            ) : (
              <dd className="mt-1 font-medium">{formatMoney(plan.budget, plan.currency)}</dd>
            )}
          </div>
        </dl>
      </header>

      {itinerary ? (
        <>
          {itinerary.days.length > 1 && (
            <nav
              aria-label="Days"
              className="sticky top-0 z-30 -mx-4 mt-8 flex gap-2 overflow-x-auto bg-background/95 px-4 py-3 backdrop-blur print:hidden"
            >
              {itinerary.days.map((d) => (
                <a
                  key={d.day}
                  href={`#day-${d.day}`}
                  className="shrink-0 rounded-full border px-3 py-1 text-sm hover:bg-accent"
                >
                  Day {d.day}
                </a>
              ))}
            </nav>
          )}

          <div className="mt-6 space-y-6">
            {itinerary.days.map((d, i) => (
              <DayCard
                key={`${d.day}-${d.title}`}
                planId={plan.id}
                dayIndex={i}
                day={d}
                destination={itinerary.destination}
                currency={plan.currency}
                canEdit={isOwner}
              />
            ))}
          </div>

          {itinerary.tips.length > 0 && (
            <section className="mt-8 rounded-xl border p-6 print:break-inside-avoid">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Lightbulb className="h-5 w-5 text-amber-400" /> Good to know
              </h2>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {itinerary.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        // Plans created before structured output: show the old HTML as plain text.
        <section className="mt-8 space-y-2 rounded-xl border p-6">
          {legacyHtmlToLines(plan.text ?? "").map((line, i) => (
            <p key={i} className={line.startsWith("•") ? "pl-4 text-muted-foreground" : "pt-3 font-semibold"}>
              {line}
            </p>
          ))}
        </section>
      )}

      <div className="mt-10 flex flex-wrap gap-3 print:hidden">
        <Button asChild>
          <Link href="/travel-planner">Plan another trip</Link>
        </Button>
        {isOwner && (
          <Button asChild variant="outline">
            <Link href="/plans">Back to my trips</Link>
          </Button>
        )}
      </div>
    </main>
  );
}
