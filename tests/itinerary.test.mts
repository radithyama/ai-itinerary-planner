import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDayPrompt,
  buildItineraryPrompt,
  formatMoney,
  itineraryJsonSchema,
  itinerarySchema,
  jsonGenerationConfig,
  legacyHtmlToLines,
  totalCost,
  tripDates,
  tripLength,
  tripRequestSchema,
  type TripRequest,
} from "../lib/itinerary.ts";

const request: TripRequest = {
  startDate: "2026-12-30",
  endDate: "2027-01-02",
  budget: 1500,
  currency: "USD",
  travelers: 2,
  pace: "balanced",
  activities: ["Food", "Culture"],
  destination: "Kyoto",
};

const sample = {
  destination: "Kyoto, Japan",
  summary: "Temples and food.",
  estimatedTotalCost: 0,
  days: [
    {
      day: 1,
      date: "2026-12-30",
      title: "Higashiyama",
      activities: [
        { time: "09:00", name: "Kiyomizu-dera", description: "Temple.", location: "Kiyomizu-dera", estimatedCost: 8, category: "culture" },
        { time: "12:30", name: "Lunch", description: "Udon.", location: "Gion", estimatedCost: 30, category: "food" },
      ],
    },
    {
      day: 2,
      date: "2026-12-31",
      title: "Arashiyama",
      activities: [
        { time: "08:00", name: "Bamboo grove", description: "Walk.", location: "Arashiyama", estimatedCost: 0, category: "teleport" },
      ],
    },
  ],
  tips: ["Get an IC card."],
};

test("tripLength and tripDates are inclusive and cross month/year boundaries", () => {
  assert.equal(tripLength("2026-12-30", "2027-01-02"), 4);
  assert.equal(tripLength("2026-10-18", "2026-10-18"), 1);
  assert.deepEqual(tripDates("2026-12-30", "2027-01-02"), ["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
});

test("tripLength ignores DST changes", () => {
  // Europe/US DST transitions happen in late March / early November.
  assert.equal(tripLength("2026-03-27", "2026-03-31"), 5);
  assert.equal(tripLength("2026-10-30", "2026-11-03"), 5);
});

test("tripRequestSchema accepts a valid request", () => {
  assert.equal(tripRequestSchema.safeParse(request).success, true);
});

test("tripRequestSchema rejects end before start, long trips and bad dates", () => {
  assert.equal(tripRequestSchema.safeParse({ ...request, endDate: "2026-12-29" }).success, false);
  assert.equal(tripRequestSchema.safeParse({ ...request, endDate: "2027-02-01" }).success, false);
  assert.equal(tripRequestSchema.safeParse({ ...request, startDate: "2026-12-30T17:00:00.000Z" }).success, false);
  assert.equal(tripRequestSchema.safeParse({ ...request, activities: [] }).success, false);
  assert.equal(tripRequestSchema.safeParse({ ...request, budget: 0 }).success, false);
});

test("itinerarySchema falls back for unknown categories and sums costs", () => {
  const parsed = itinerarySchema.parse(sample);
  assert.equal(parsed.days[1].activities[0].category, "other");
  assert.equal(totalCost(parsed), 38);
});

test("itinerarySchema rejects an itinerary with no days", () => {
  assert.equal(itinerarySchema.safeParse({ ...sample, days: [] }).success, false);
});

test("buildItineraryPrompt lists every date and wraps user input as data", () => {
  const prompt = buildItineraryPrompt(request);
  assert.match(prompt, /2026-12-30, 2026-12-31, 2027-01-01, 2027-01-02/);
  assert.match(prompt, /<destination>Kyoto<\/destination>/);
  assert.match(prompt, /<interests>Food, Culture<\/interests>/);
  assert.match(prompt, /1500 USD/);
});

test("buildItineraryPrompt asks the model to choose when no destination is given", () => {
  const prompt = buildItineraryPrompt({ ...request, destination: undefined });
  assert.match(prompt, /not chosen yet/);
  assert.doesNotMatch(prompt, /<destination>/);
});

test("buildDayPrompt keeps the day number and lists other days", () => {
  const prompt = buildDayPrompt(request, itinerarySchema.parse(sample), 1, "more food");
  assert.match(prompt, /Replace day 2 \(2026-12-31/);
  assert.match(prompt, /Day 1: Kiyomizu-dera; Lunch/);
  assert.match(prompt, /<request>more food<\/request>/);
});

test("formatMoney formats per currency", () => {
  assert.equal(formatMoney(1500, "USD"), "$1,500");
  assert.equal(formatMoney(2500000, "IDR").replace(/\s/g, " "), "IDR 2,500,000");
});

test("legacyHtmlToLines strips markup, including scripts and handlers", () => {
  const html = '<b>Day 1</b><ul><li>Visit &amp; eat</li><li><img src=x onerror="alert(1)">Museum</li></ul><script>alert(2)</script>';
  assert.deepEqual(legacyHtmlToLines(html), ["Day 1", "• Visit & eat", "• Museum"]);
});

test("jsonGenerationConfig uses responseMimeType + responseJsonSchema (responseFormat.text.mimeType is rejected)", () => {
  const config = jsonGenerationConfig(itineraryJsonSchema);
  assert.deepEqual(Object.keys(config).sort(), ["responseJsonSchema", "responseMimeType"]);
  assert.equal(config.responseMimeType, "application/json");
  assert.equal(config.responseJsonSchema, itineraryJsonSchema);
});
