import { ChildLayout } from "@/components/child/ChildLayout";
import { MissionList } from "@/components/child/MissionList";

type Params = Promise<{ childId: string }>;

export default async function CreatePage({ params }: { params: Params }) {
  const { childId } = await params;
  return (
    <ChildLayout childId={childId}>
      <MissionList
        childId={childId}
        allowedCategories={["sang_tao"]}
        zoneLabel="Góc vẽ"
        zoneTitle="Góc vẽ đang mở ra những ý tưởng mới."
        zoneDescription="Cậu có thể tô, vẽ hoặc làm một hoạt động sáng tạo thật ngắn ở đây."
      />
    </ChildLayout>
  );
}
