import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import React from "react";
import { GiAstronautHelmet } from 'react-icons/gi';
import Link from 'next/link';
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className='w-full dark:bg-black py-6 print:hidden'>
      <div className='w-11/12 mx-auto flex justify-between items-center gap-4'>
        <Link href={'/'}>
            <h4 className='text-white text-2xl font-bold flex items-center'>
              <GiAstronautHelmet className='mr-4' />
              Planit
            </h4>
        </Link>
        <nav className='flex items-center gap-2 sm:gap-4'>
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="outline">Sign in</Button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <Button asChild variant="ghost">
            <Link href="/plans">My trips</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/travel-planner"><Plus className="mr-1 h-4 w-4" />Plan a trip</Link>
          </Button>
          <UserButton userProfileUrl='/profile'/>
        </SignedIn>
        </nav>
      </div>
    </header>
  );
}
