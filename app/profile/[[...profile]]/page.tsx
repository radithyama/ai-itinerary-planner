import { UserProfile } from "@clerk/nextjs";

export const metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <main className="flex flex-1 justify-center px-4 py-10">
      <UserProfile routing="hash" />
    </main>
  );
}
