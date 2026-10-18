"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Bus,
  Camera,
  Drama,
  ExternalLink,
  Landmark,
  Loader2,
  MapPin,
  Mountain,
  Palette,
  RefreshCw,
  ShoppingBag,
  Trees,
  Utensils,
  Waves,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { regenerateDay } from "@/server/ai";
import { formatMoney, mapsUrl, type Category, type ItineraryDay } from "@/lib/itinerary";
import { cn } from "@/lib/utils";

const icons: Record<Category, LucideIcon> = {
  food: Utensils,
  sightseeing: Camera,
  nature: Trees,
  culture: Drama,
  history: Landmark,
  art: Palette,
  nightlife: Wine,
  shopping: ShoppingBag,
  adventure: Mountain,
  relaxation: Waves,
  transport: Bus,
  other: MapPin,
};

interface DayCardProps {
  planId: string;
  dayIndex: number;
  day: ItineraryDay;
  destination: string;
  currency: string;
  canEdit: boolean;
}

function dayLabel(date: string) {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? date : format(d, "EEEE, MMM d");
}

export default function DayCard({ planId, dayIndex, day, destination, currency, canEdit }: DayCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dayTotal = day.activities.reduce((s, a) => s + a.estimatedCost, 0);

  function regenerate() {
    setError(null);
    startTransition(async () => {
      const result = await regenerateDay(planId, dayIndex, note.trim() || undefined);
      if (result.ok) {
        setEditing(false);
        setNote("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section
      id={`day-${day.day}`}
      className={cn("scroll-mt-20 rounded-xl border p-5 sm:p-6 print:break-inside-avoid", pending && "opacity-60")}
      aria-busy={pending}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            Day {day.day} · {dayLabel(day.date)}
          </p>
          <h2 className="mt-1 text-xl font-semibold">{day.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
            {formatMoney(dayTotal, currency)}
          </span>
          {canEdit && !editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              disabled={pending}
              className="print:hidden"
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Regenerate day
            </Button>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-4 flex flex-col gap-2 rounded-lg bg-secondary/50 p-3 sm:flex-row print:hidden">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !pending && regenerate()}
            placeholder="Any requests? e.g. more food, less walking (optional)"
            maxLength={200}
            disabled={pending}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={regenerate} disabled={pending} className="h-9">
              {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
              {pending ? "Regenerating…" : "Regenerate"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending} className="h-9">
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <ol className="mt-5 space-y-5 border-l pl-5">
        {day.activities.map((a, i) => {
          const Icon = icons[a.category] ?? MapPin;
          return (
            <li key={`${a.time}-${i}`} className="relative">
              <span className="absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full border bg-background">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </span>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="font-medium">
                  <span className="mr-2 font-mono text-sm text-muted-foreground">{a.time}</span>
                  {a.name}
                </h3>
                <span className="text-sm text-muted-foreground">
                  {a.estimatedCost > 0 ? formatMoney(a.estimatedCost, currency) : "Free"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
              <a
                href={mapsUrl(a.location, destination)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-sky-400 hover:underline"
              >
                <MapPin className="h-3 w-3" /> {a.location}
                <ExternalLink className="h-3 w-3 print:hidden" />
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
