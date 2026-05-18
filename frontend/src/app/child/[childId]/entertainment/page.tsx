import { ChildLayout } from "@/components/child/ChildLayout";
import { RewardShop } from "@/components/child/ChildExperience";
import { demoChild } from "@/lib/mock-data";

export default function EntertainmentPage() {
  return (
    <ChildLayout childId={demoChild.id}>
      <RewardShop />
    </ChildLayout>
  );
}
