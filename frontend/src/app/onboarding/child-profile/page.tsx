import { AppShell } from "@/components/common/AppShell";
import { OnboardingStep } from "@/components/onboarding/OnboardingStep";
import { parentRoutes } from "@/lib/routes";

export default function ChildProfileOnboardingPage() {
  return (
    <AppShell nav={parentRoutes} subtitle="Tạo hồ sơ trẻ" title="Khu phụ huynh">
      <OnboardingStep
        body="Tạo hồ sơ bằng nickname, tuổi, avatar và sở thích. Không yêu cầu tên thật, ảnh thật hoặc thông tin nhận dạng."
        nextHref="/onboarding/rules"
        title="Tạo hồ sơ trẻ"
      />
    </AppShell>
  );
}
