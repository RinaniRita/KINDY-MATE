import { ChildrenManager } from "@/components/parent/ParentControls";
import { ParentLayout } from "@/components/parent/ParentLayout";

export default function ChildrenPage() {
  return (
    <ParentLayout>
      <ChildrenManager />
    </ParentLayout>
  );
}
