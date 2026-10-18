"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { SignedIn } from "@clerk/nextjs";
import { globeConfig, sampleArcs } from "@/data/globe-arcs";

const World = dynamic(() => import("../components/ui/globe").then((m) => m.World), {
  ssr: false,
});

const examples = ["Kyoto", "Bali", "Lisbon", "Cape Town"];

export default function Page() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-5 dark:bg-black relative w-full overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="flex flex-col justify-center items-center gap-3 px-4 z-50"
      >
        <h2 className="text-center text-xl md:text-4xl font-bold text-black dark:text-white">
          AI Travel Itinerary Planner
        </h2>
        <p className="text-center text-base md:text-lg font-normal text-neutral-700 dark:text-neutral-200 max-w-md mt-2 mx-auto">
          Plan it, make an unforgettable trip of your life.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild disabled={isLoading}>
            <Link href="/travel-planner" onClick={() => setIsLoading(true)} aria-disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                </>
              ) : (
                "Plan my trip"
              )}
            </Link>
          </Button>
          <SignedIn>
            <Button asChild variant="outline">
              <Link href="/plans">Continue to my trips</Link>
            </Button>
          </SignedIn>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-2 text-sm">
          <span className="text-neutral-500">Try</span>
          {examples.map((d) => (
            <Link
              key={d}
              href={`/travel-planner?destination=${encodeURIComponent(d)}`}
              className="rounded-full border border-neutral-800 px-3 py-0.5 text-neutral-300 hover:bg-neutral-900"
            >
              {d}
            </Link>
          ))}
        </div>
      </motion.div>
      <div className="max-w-7xl mx-auto w-full relative overflow-hidden h-[24rem] md:h-[40rem] px-4">
        <div className="absolute w-full bottom-0 inset-x-0 h-40 bg-gradient-to-b pointer-events-none select-none from-transparent dark:to-black  z-40" />
        <div className="absolute w-full h-full z-20">
          <World data={sampleArcs} globeConfig={globeConfig} />
        </div>
      </div>
      <div className="flex flex-col justify-center items-center">
        <p className="text-center text-base md:text-sm font-normal text-neutral-700 max-w-md mt-10 mx-auto">
        © {new Date().getFullYear()} Radithya Mirza Aribowo
        </p>
      </div>
    </div>
  );
}
