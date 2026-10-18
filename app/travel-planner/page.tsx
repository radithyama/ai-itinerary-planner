import TravelPlannerForm from "@/components/features/travel-planner-form";

export const metadata = { title: "Plan a trip" };

export default function TravelPlannerPage({ searchParams }: { searchParams: { destination?: string } }) {
  const destination = typeof searchParams.destination === "string" ? searchParams.destination.slice(0, 100) : "";
  return (
    <main className="flex flex-1 justify-center px-4 py-8 sm:py-12">
      <TravelPlannerForm initialDestination={destination} />
    </main>
  );
}
