import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Plane } from "lucide-react";
import PlansList from "@/components/features/plans-list";
import { Button } from "@/components/ui/button";
import { getPlansByUser } from "@/server/plans";

export const metadata = { title: "My trips" };

const examples = ["Kyoto", "Bali", "Lisbon"];

export default async function PlansPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const plans = await getPlansByUser(userId);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">My trips</h1>
          <p className="mt-1 text-muted-foreground">
            {plans.length ? `${plans.length} plan${plans.length === 1 ? "" : "s"}, newest first.` : "Your saved itineraries will show up here."}
          </p>
        </div>
      </div>

      {plans.length ? (
        <PlansList plans={plans} />
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
          <Plane className="h-10 w-10 text-muted-foreground" />
          <h2 className="text-xl font-semibold">No trips yet</h2>
          <p className="max-w-sm text-muted-foreground">
            Pick your dates, budget and interests and we'll draft a day-by-day plan in under a minute.
          </p>
          <Button asChild>
            <Link href="/travel-planner">Plan my first trip</Link>
          </Button>
          <div className="flex flex-wrap justify-center gap-2 pt-2 text-sm">
            <span className="text-muted-foreground">or try</span>
            {examples.map((d) => (
              <Link
                key={d}
                href={`/travel-planner?destination=${encodeURIComponent(d)}`}
                className="rounded-full border px-3 py-0.5 hover:bg-accent"
              >
                {d}
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
