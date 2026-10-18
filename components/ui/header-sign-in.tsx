"use client";

import { SignInButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/base-path";

// Signing in from the landing page goes straight to the planner; anywhere else
// (e.g. a shared plan) brings the user back to the page they were on.
export default function HeaderSignIn() {
  const pathname = usePathname();
  const target = withBasePath(pathname === "/" ? "/travel-planner" : pathname);
  return (
    <SignInButton mode="modal" forceRedirectUrl={target} signUpForceRedirectUrl={target}>
      <Button variant="outline">Sign in</Button>
    </SignInButton>
  );
}
