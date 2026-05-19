import { ChildLayout } from "@/components/child/ChildLayout";
import { EntertainmentPage } from "@/components/child/EntertainmentPage";

type Params = Promise<{ childId: string }>;

export default async function EntertainmentRoutePage({ params }: { params: Params }) {
  const { childId } = await params;
  return (
    <ChildLayout childId={childId}>
      <EntertainmentPage childId={childId} />
    </ChildLayout>
  );
}
