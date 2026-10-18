import { SignUp } from "@clerk/nextjs";
import { withBasePath } from "@/lib/base-path";

export const metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <main className="flex flex-1 justify-center items-center px-4 py-10">
      <SignUp routing="hash" signInUrl={withBasePath("/sign-in")} />
    </main>
  );
}
