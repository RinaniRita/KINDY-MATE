import { ChildLayout } from "@/components/child/ChildLayout";
import { MascotPage } from "@/components/child/ChildExperience";

type Params = Promise<{ childId: string }>;

export default async function MascotRoutePage({ params }: { params: Params }) {
  const { childId } = await params;
  return (
    <ChildLayout childId={childId}>
      <MascotPage />
    </ChildLayout>
  );
}
