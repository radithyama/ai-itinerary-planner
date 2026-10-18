"use client";

import { useEffect, useState } from "react";

import { z } from "zod";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import { AlertCircle, Check, Minus, Plus, Sparkles, X } from "lucide-react";

import { CalendarIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { generateTripItinerary } from "@/server/ai";
import { CURRENCIES, MAX_TRIP_DAYS, PACES, type TripRequest } from "@/lib/itinerary";
import GeneratingOverlay from "./generating-overlay";

const activities = [
  "Food",
  "Hiking",
  "Nature",
  "Culture",
  "History",
  "Art",
  "Nightlife",
  "Beaches",
  "Shopping",
  "Adventure",
  "Wellness",
  "Photography",
];

const paceLabels: Record<(typeof PACES)[number], { label: string; hint: string }> = {
  relaxed: { label: "Relaxed", hint: "2-3 stops a day" },
  balanced: { label: "Balanced", hint: "3-4 stops a day" },
  packed: { label: "Packed", hint: "5+ stops a day" },
};

const formSchema = z
  .object({
    surprise: z.boolean(),
    destination: z.string().trim().max(100),
    dates: z.object(
      { from: z.date().optional(), to: z.date().optional() },
      { required_error: "Choose your travel dates" }
    ),
    travelers: z.number().int().min(1).max(20),
    pace: z.enum(PACES),
    budget: z
      .number({ required_error: "Enter your budget", invalid_type_error: "Enter your budget" })
      .int("Use a whole number")
      .min(1, "Enter your budget"),
    currency: z.enum(CURRENCIES),
    activities: z.array(z.string()).min(1, "Pick at least one thing you'd like to do"),
  })
  .superRefine((v, ctx) => {
    if (!v.surprise && !v.destination) {
      ctx.addIssue({ code: "custom", path: ["destination"], message: "Where are you going? Or let us surprise you." });
    }
    if (!v.dates.from) {
      ctx.addIssue({ code: "custom", path: ["dates"], message: "Choose your travel dates" });
    } else if (differenceInCalendarDays(v.dates.to ?? v.dates.from, v.dates.from) + 1 > MAX_TRIP_DAYS) {
      ctx.addIssue({ code: "custom", path: ["dates"], message: `Trips can be at most ${MAX_TRIP_DAYS} days` });
    }
  });

type FormValues = z.infer<typeof formSchema>;

function toRequest(v: FormValues): TripRequest {
  const from = v.dates.from!;
  return {
    // Calendar days, formatted in the traveler's own timezone (toISOString would shift them to UTC).
    startDate: format(from, "yyyy-MM-dd"),
    endDate: format(v.dates.to ?? from, "yyyy-MM-dd"),
    budget: v.budget,
    currency: v.currency,
    travelers: v.travelers,
    pace: v.pace,
    activities: v.activities,
    destination: v.surprise ? undefined : v.destination,
  };
}

function useIsWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    setWide(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setWide(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return wide;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border p-5 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default function TravelPlannerForm({ initialDestination = "" }: { initialDestination?: string }) {
  const router = useRouter();
  const wide = useIsWide();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customActivity, setCustomActivity] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      surprise: false,
      destination: initialDestination,
      dates: { from: undefined, to: undefined },
      travelers: 2,
      pace: "balanced",
      budget: undefined,
      currency: "USD",
      activities: [],
    },
  });

  const surprise = form.watch("surprise");
  const destination = form.watch("destination");
  const selected = form.watch("activities");
  const today = startOfDay(new Date());

  async function onSubmit(values: FormValues) {
    setError(null);
    setIsLoading(true);
    try {
      const result = await generateTripItinerary(toRequest(values));
      if (result.ok) {
        // Keep the overlay up until the plan page has loaded.
        router.push(`/plan/${result.data.id}`);
        return;
      }
      setError(result.error);
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Check your connection and try again.");
    }
    setIsLoading(false);
  }

  function toggleActivity(name: string) {
    const next = selected.includes(name) ? selected.filter((a) => a !== name) : [...selected, name];
    form.setValue("activities", next, { shouldValidate: form.formState.isSubmitted });
  }

  function addCustomActivity() {
    const name = customActivity.trim().slice(0, 40);
    if (name && !selected.some((a) => a.toLowerCase() === name.toLowerCase()) && selected.length < 12) {
      form.setValue("activities", [...selected, name], { shouldValidate: form.formState.isSubmitted });
    }
    setCustomActivity("");
  }

  const customSelected = selected.filter((a) => !activities.includes(a));

  return (
    <>
      {isLoading && <GeneratingOverlay destination={surprise ? undefined : destination} />}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-2xl space-y-6 pb-28 sm:pb-0">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold md:text-4xl">Plan a trip</h1>
            <p className="text-muted-foreground">Tell us the basics and we'll build a day-by-day itinerary.</p>
          </div>

          <Section title="Where">
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <FormControl>
                      <Input
                        {...field}
                        disabled={surprise}
                        placeholder={surprise ? "We'll pick somewhere great" : "e.g. Kyoto, Bali, Lisbon"}
                        autoComplete="off"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant={surprise ? "default" : "outline"}
                      aria-pressed={surprise}
                      onClick={() => {
                        form.setValue("surprise", !surprise);
                        form.clearErrors("destination");
                      }}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Surprise me
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section title="When">
            <FormField
              control={form.control}
              name="dates"
              render={({ field }) => {
                const { from, to } = field.value ?? {};
                const days = from ? differenceInCalendarDays(to ?? from, from) + 1 : 0;
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Travel dates</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start pl-3 text-left font-normal sm:w-[320px]",
                              !from && "text-muted-foreground"
                            )}
                          >
                            {from ? (
                              `${format(from, "PP")} – ${format(to ?? from, "PP")}`
                            ) : (
                              <span>Pick your dates</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={{ from, to }}
                          onSelect={(range) => field.onChange({ from: range?.from, to: range?.to })}
                          numberOfMonths={wide ? 2 : 1}
                          disabled={{ before: today }}
                          defaultMonth={from ?? today}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      {days > 0
                        ? `${days} day${days === 1 ? "" : "s"} · ${days - 1} night${days - 1 === 1 ? "" : "s"}`
                        : `Up to ${MAX_TRIP_DAYS} days.`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </Section>

          <Section title="Who & how">
            <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
              <FormField
                control={form.control}
                name="travelers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Travelers</FormLabel>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Fewer travelers"
                        disabled={field.value <= 1}
                        onClick={() => field.onChange(field.value - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-6 text-center text-lg font-semibold" aria-live="polite">
                        {field.value}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="More travelers"
                        disabled={field.value >= 20}
                        onClick={() => field.onChange(field.value + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pace</FormLabel>
                    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Pace">
                      {PACES.map((p) => (
                        <button
                          key={p}
                          type="button"
                          role="radio"
                          aria-checked={field.value === p}
                          onClick={() => field.onChange(p)}
                          className={cn(
                            "rounded-md border px-2 py-2 text-left transition-colors",
                            field.value === p ? "border-primary bg-primary/10" : "hover:bg-accent"
                          )}
                        >
                          <span className="block text-sm font-medium">{paceLabels[p].label}</span>
                          <span className="block text-xs text-muted-foreground">{paceLabels[p].hint}</span>
                        </button>
                      ))}
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </Section>

          <Section title="Budget">
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Currency</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c} className="bg-background">
                            {c}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="sr-only">Budget</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                        }
                        placeholder="Total budget"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-[0.8rem] text-muted-foreground">
              For the whole group, not counting flights to get there.
            </p>
          </Section>

          <Section title="Interests">
            <FormField
              control={form.control}
              name="activities"
              render={() => (
                <FormItem>
                  <FormLabel className="sr-only">Activities</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {activities.map((a) => {
                      const on = selected.includes(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleActivity(a)}
                          className={cn(
                            "inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition-colors",
                            on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
                          )}
                        >
                          {on && <Check className="mr-1 h-3.5 w-3.5" />}
                          {a}
                        </button>
                      );
                    })}
                    {customSelected.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleActivity(a)}
                        aria-label={`Remove ${a}`}
                        className="inline-flex items-center rounded-full border border-primary bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                      >
                        {a}
                        <X className="ml-1 h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Input
                      value={customActivity}
                      onChange={(e) => setCustomActivity(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomActivity();
                        }
                      }}
                      placeholder="Something else? e.g. coffee, surfing"
                      maxLength={40}
                    />
                    <Button type="button" variant="outline" onClick={addCustomActivity} disabled={!customActivity.trim()}>
                      Add
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">{error}</div>
              <Button type="submit" size="sm" variant="outline">
                Try again
              </Button>
            </div>
          )}

          <div className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t bg-background/95 p-4 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
            <Button type="submit" disabled={isLoading} className="flex-1 sm:flex-none">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate itinerary
            </Button>
            <Button asChild variant="outline">
              <Link href="/plans">Cancel</Link>
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}

