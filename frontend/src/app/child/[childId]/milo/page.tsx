import { ChildLayout } from "@/components/child/ChildLayout";
import { MiloHub } from "@/components/child/MiloHub";

type Params = Promise<{ childId: string }>;

export default async function MiloPage({ params }: { params: Params }) {
  const { childId } = await params;
  return (
    <ChildLayout childId={childId}>
      <MiloHub childId={childId} />
    </ChildLayout>
  );
}
