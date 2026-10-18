import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <Compass className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-3xl font-bold">We couldn't find that trip</h1>
      <p className="max-w-md text-muted-foreground">
        The link may be wrong, the plan may have been deleted, or its owner hasn't shared it.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/plans">My trips</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </main>
  );
}
