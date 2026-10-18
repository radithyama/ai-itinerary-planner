import { format } from "date-fns";
import type { PlanRow } from "@/db/schema";
import { formatMoney, tripLength } from "@/lib/itinerary";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Globe, Plus } from "lucide-react";

interface PlansListProps {
  plans: PlanRow[];
}

const day = (d: string) => new Date(`${d}T00:00:00`);

export default function PlansList({ plans }: PlansListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <Link href="/travel-planner" className="group">
        <Card className="flex h-full min-h-40 cursor-pointer flex-col items-center justify-center gap-2 border-dashed text-muted-foreground transition ease-in-out duration-300 hover:-translate-y-1 hover:bg-primary/10 hover:text-foreground">
          <Plus className="size-10" />
          <span className="font-medium">Plan a new trip</span>
        </Card>
      </Link>
      {plans.map((plan) => {
        const days = tripLength(plan.startDate, plan.endDate);
        return (
          <Link key={plan.id} href={`/plan/${plan.id}`}>
            <Card className="h-full cursor-pointer hover:bg-primary/10 transition ease-in-out duration-300 hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-2 text-lg leading-snug">
                  {plan.destination ?? "Trip plan"}
                  {plan.isPublic && <Globe className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-label="Shared" />}
                </CardTitle>
                <CardDescription>
                  {format(day(plan.startDate), "MMM d")} – {format(day(plan.endDate), "MMM d, yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-secondary px-2.5 py-1">
                    {days} day{days === 1 ? "" : "s"}
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-1">
                    {formatMoney(plan.budget, plan.currency)}
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-1">
                    {plan.travelers} {plan.travelers === 1 ? "traveler" : "travelers"}
                  </span>
                </div>
                {plan.activities && plan.activities.length > 0 && (
                  <p className="line-clamp-1 text-sm text-muted-foreground">{plan.activities.join(" · ")}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
