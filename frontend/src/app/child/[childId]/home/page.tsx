import { ChildHome } from "@/components/child/ChildExperience";
import { ChildLayout } from "@/components/child/ChildLayout";
import { demoChild } from "@/lib/mock-data";

export default function ChildHomePage() {
  return (
    <ChildLayout childId={demoChild.id}>
      <ChildHome />
    </ChildLayout>
  );
}
