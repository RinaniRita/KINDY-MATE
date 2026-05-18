import { ChildLayout } from "@/components/child/ChildLayout";
import { MissionDetail } from "@/components/child/ChildExperience";
import { demoChild } from "@/lib/mock-data";

export default async function MissionDetailPage({ params }: { params: Promise<{ missionId: string }> }) {
  const { missionId } = await params;
  return (
    <ChildLayout childId={demoChild.id}>
      <MissionDetail missionId={missionId} />
    </ChildLayout>
  );
}
