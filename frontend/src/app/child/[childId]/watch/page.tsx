import { ChildLayout } from "@/components/child/ChildLayout";
import { EntertainmentPage } from "@/components/child/EntertainmentPage";

type Params = Promise<{ childId: string }>;

export default async function WatchPage({ params }: { params: Params }) {
  const { childId } = await params;
  return (
    <ChildLayout childId={childId}>
      <EntertainmentPage
        childId={childId}
        allowedCategories={["kham_pha_khoa_hoc", "phim_hoat_hinh"]}
        zoneLabel="TV"
        zoneTitle="TV của Milo chỉ mở những nội dung êm và có ích."
        zoneDescription="Ở đây cậu có thể xem khoa học, khám phá hoặc video giáo dục phù hợp."
      />
    </ChildLayout>
  );
}
