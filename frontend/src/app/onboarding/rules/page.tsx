import { AppShell } from "@/components/common/AppShell";
import { OnboardingStep } from "@/components/onboarding/OnboardingStep";
import { parentRoutes } from "@/lib/routes";

export default function RulesOnboardingPage() {
  return (
    <AppShell nav={parentRoutes} subtitle="Thiết lập luật an toàn" title="Khu phụ huynh">
      <OnboardingStep
        body="Đặt giới hạn giải trí mỗi ngày, danh mục được phép, thời gian nghỉ, quyền micro/camera và nút tạm dừng trước khi trẻ vào app."
        nextHref="/parent/dashboard"
        title="Thiết lập luật phụ huynh"
      />
    </AppShell>
  );
}
