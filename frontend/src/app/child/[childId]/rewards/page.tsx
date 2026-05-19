import { redirect } from "next/navigation";

type Params = Promise<{ childId: string }>;

export default async function RewardsPage({ params }: { params: Params }) {
  const { childId } = await params;
  redirect(`/child/${childId}/entertainment`);
}
