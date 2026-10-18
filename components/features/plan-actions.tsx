"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Globe, Lock, Printer, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deletePlan, setPlanVisibility } from "@/server/ai";
import { withBasePath } from "@/lib/base-path";

interface PlanActionsProps {
  planId: string;
  isOwner: boolean;
  isPublic: boolean;
}

export default function PlanActions({ planId, isOwner, isPublic }: PlanActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function copyLink() {
    const url = `${window.location.origin}${withBasePath(`/plan/${planId}`)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function share() {
    setError(null);
    startTransition(async () => {
      if (!isPublic) {
        const result = await setPlanVisibility(planId, true);
        if (!result.ok) return setError(result.error);
        router.refresh();
      }
      await copyLink();
    });
  }

  function makePrivate() {
    setError(null);
    startTransition(async () => {
      const result = await setPlanVisibility(planId, false);
      if (!result.ok) return setError(result.error);
      router.refresh();
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deletePlan(planId);
      if (!result.ok) {
        setConfirmDelete(false);
        return setError(result.error);
      }
      router.push("/plans");
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end print:hidden">
      <div className="flex flex-wrap gap-2">
        {isOwner ? (
          <Button size="sm" onClick={share} disabled={pending}>
            {copied ? <Check className="mr-1 h-4 w-4" /> : <Share2 className="mr-1 h-4 w-4" />}
            {copied ? "Link copied" : "Share"}
          </Button>
        ) : (
          <Button size="sm" onClick={copyLink}>
            {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
            {copied ? "Link copied" : "Copy link"}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" /> Print / PDF
        </Button>
        {isOwner && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            disabled={pending}
            aria-label="Delete plan"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOwner && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {isPublic ? (
            <>
              <Globe className="h-3 w-3" /> Anyone with the link can view.
              <button onClick={makePrivate} disabled={pending} className="underline hover:text-foreground">
                Make private
              </button>
            </>
          ) : (
            <>
              <Lock className="h-3 w-3" /> Only you can see this plan.
            </>
          )}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this plan?</DialogTitle>
            <DialogDescription>This can't be undone. Shared links will stop working.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {pending ? "Deleting…" : "Delete plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
