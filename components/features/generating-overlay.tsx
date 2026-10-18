"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

function steps(destination?: string) {
  const place = destination || "the perfect destination";
  return [
    `Finding the best places in ${place}…`,
    "Matching activities to your interests…",
    "Grouping stops by neighborhood…",
    "Balancing your budget…",
    "Adding local tips…",
    "Almost there, polishing your itinerary…",
  ];
}

export default function GeneratingOverlay({ destination }: { destination?: string }) {
  const messages = steps(destination);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, messages.length - 1)), 3500);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-black/90 px-4 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
        <h2 className="text-2xl font-bold md:text-3xl">Planning your trip</h2>
        <div className="h-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-neutral-300"
            >
              {messages[step]}
            </motion.p>
          </AnimatePresence>
        </div>
        <p className="text-xs text-neutral-500">This usually takes 10 to 30 seconds.</p>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-neutral-800 p-4">
            <div className="mb-4 h-4 w-1/2 animate-pulse rounded bg-neutral-800" />
            {[0, 1, 2].map((j) => (
              <div key={j} className="mb-3 space-y-2">
                <div className="h-3 w-3/4 animate-pulse rounded bg-neutral-800" />
                <div className="h-3 w-full animate-pulse rounded bg-neutral-900" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
