import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main className="flex flex-1 justify-center items-center px-4 py-10">
      <SignIn routing="hash" signUpUrl="/sign-up" />
    </main>
  );
}
