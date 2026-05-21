import { ParentLayout } from "@/components/parent/ParentLayout";
import { ParentChildDetail } from "@/components/parent/ParentChildDetail";

export default async function ChildDetailPage({
  params,
}: {
  params: { childId: string };
}) {
  const { childId } = params;

  return (
    <ParentLayout>
      <ParentChildDetail childId={childId} />
    </ParentLayout>
  );
}
