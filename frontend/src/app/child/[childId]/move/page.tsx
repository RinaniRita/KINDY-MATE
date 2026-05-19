import { ChildLayout } from "@/components/child/ChildLayout";
import { MissionList } from "@/components/child/MissionList";

type Params = Promise<{ childId: string }>;

export default async function MovePage({ params }: { params: Params }) {
  const { childId } = await params;
  return (
    <ChildLayout childId={childId}>
      <MissionList
        childId={childId}
        allowedCategories={["van_dong"]}
        zoneLabel="Thảm tập"
        zoneTitle="Thảm tập đang chờ cậu vận động một chút."
        zoneDescription="Chỉ vài phút nhảy, duỗi người hoặc làm theo động tác nhẹ là được rồi."
      />
    </ChildLayout>
  );
}
