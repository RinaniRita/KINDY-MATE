import { ChildLayout } from "@/components/child/ChildLayout";
import { VideoPlayerPage } from "@/components/child/VideoPlayerPage";

type Params = Promise<{ childId: string }>;

export default async function PlayerRoute({ params }: { params: Params }) {
  const { childId } = await params;
  return (
    <ChildLayout childId={childId}>
      <VideoPlayerPage childId={childId} />
    </ChildLayout>
  );
}
