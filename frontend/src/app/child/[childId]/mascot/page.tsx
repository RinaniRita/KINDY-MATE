import { ChildLayout } from "@/components/child/ChildLayout";
import { MascotPage } from "@/components/child/ChildExperience";
import { demoChild } from "@/lib/mock-data";

export default function MascotRoutePage() {
  return (
    <ChildLayout childId={demoChild.id}>
      <MascotPage />
    </ChildLayout>
  );
}
