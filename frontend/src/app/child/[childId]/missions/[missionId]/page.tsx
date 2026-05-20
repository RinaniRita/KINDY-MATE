import { ChildLayout } from "@/components/child/ChildLayout";
import { MissionDetail } from "@/components/child/ChildExperience";

type Params = Promise<{ childId: string; missionId: string }>;

export default async function MissionDetailPage({ params }: { params: Params }) {
  const { childId, missionId } = await params;
  return (
    <ChildLayout childId={childId}>
      <MissionDetail childId={childId} missionId={missionId} />
    </ChildLayout>
  );
}
