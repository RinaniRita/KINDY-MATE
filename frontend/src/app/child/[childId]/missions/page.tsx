import { ChildLayout } from "@/components/child/ChildLayout";
import { MissionList } from "@/components/child/ChildExperience";

type Params = Promise<{ childId: string }>;

export default async function MissionsPage({ params }: { params: Params }) {
  const { childId } = await params;
  return (
    <ChildLayout childId={childId}>
      <MissionList childId={childId} />
    </ChildLayout>
  );
}
