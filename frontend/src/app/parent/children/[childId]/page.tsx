import { ParentLayout } from "@/components/parent/ParentLayout";
import { ParentChildDetail } from "@/components/parent/ParentChildDetail";

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;

  return (
    <ParentLayout>
      <ParentChildDetail childId={childId} />
    </ParentLayout>
  );
}
