import { AppShell } from "@/components/common/AppShell";
import { OnboardingStep } from "@/components/onboarding/OnboardingStep";
import { parentRoutes } from "@/lib/routes";

export default function ParentOnboardingPage() {
  return (
    <AppShell nav={parentRoutes} subtitle="Thiết lập do phụ huynh dẫn dắt" title="Khu phụ huynh">
      <OnboardingStep
        body="Phụ huynh xác nhận vai trò quản lý, consent và nguyên tắc trẻ không tự tạo tài khoản độc lập."
        nextHref="/onboarding/child-profile"
        title="Thiết lập phụ huynh"
      />
    </AppShell>
  );
}
