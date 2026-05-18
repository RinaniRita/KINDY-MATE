import { ChildLayout } from "@/components/child/ChildLayout";
import { RewardShop } from "@/components/child/ChildExperience";

type Params = Promise<{ childId: string }>;

export default async function EntertainmentPage({ params }: { params: Params }) {
  const { childId } = await params;
  return (
    <ChildLayout childId={childId}>
      <RewardShop childId={childId} />
    </ChildLayout>
  );
}
