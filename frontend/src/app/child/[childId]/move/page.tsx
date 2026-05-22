import { ChildLayout } from "@/components/child/ChildLayout";
import { MoveDashboard } from "@/components/child/MoveDashboard";

type Params = Promise<{ childId: string }>;

export default async function MovePage({ params }: { params: Params }) {
  const { childId } = await params;
  return (
    <ChildLayout childId={childId}>
      <MoveDashboard childId={childId} />
    </ChildLayout>
  );
}
