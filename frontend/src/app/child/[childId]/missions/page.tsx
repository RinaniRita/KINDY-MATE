import { ChildLayout } from "@/components/child/ChildLayout";
import { MissionList } from "@/components/child/ChildExperience";
import { demoChild } from "@/lib/mock-data";

export default function MissionsPage() {
  return (
    <ChildLayout childId={demoChild.id}>
      <MissionList />
    </ChildLayout>
  );
}
