import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Plan from "@/components/features/plan";
import { getPlanForViewer } from "@/server/plans";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await getPlanForViewer(params.id);
  if (!result) return { title: "Plan not found" };
  const { plan } = result;
  return {
    title: plan.destination ? `Trip to ${plan.destination}` : "Your trip plan",
    description: plan.itinerary?.summary,
  };
}

export default async function PlanPage({ params }: Props) {
  const result = await getPlanForViewer(params.id);
  if (!result) notFound();
  return <Plan plan={result.plan} isOwner={result.isOwner} />;
}
