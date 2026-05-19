import { ChildLayout } from "@/components/child/ChildLayout";
import { MissionList } from "@/components/child/MissionList";

type Params = Promise<{ childId: string }>;

export default async function StudyPage({ params }: { params: Params }) {
  const { childId } = await params;
  return (
    <ChildLayout childId={childId}>
      <MissionList
        childId={childId}
        allowedCategories={["hoc_hanh", "doc_sach", "ky_nang_song"]}
        zoneLabel="Bàn học"
        zoneTitle="Bàn học đang mở những việc nhỏ cho cậu."
        zoneDescription="Ở đây có quiz, đọc ngắn và những việc thực hành vừa sức."
      />
    </ChildLayout>
  );
}
