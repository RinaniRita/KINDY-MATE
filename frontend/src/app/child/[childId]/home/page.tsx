import { ChildHome } from "@/components/child/ChildExperience";
import { ChildLayout } from "@/components/child/ChildLayout";

type Params = Promise<{ childId: string }>;

export default async function ChildHomePage({ params }: { params: Params }) {
  const { childId } = await params;
  return (
    <ChildLayout childId={childId}>
      <ChildHome childId={childId} />
    </ChildLayout>
  );
}
