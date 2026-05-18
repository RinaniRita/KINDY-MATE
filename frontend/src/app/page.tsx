import { AppShell } from "@/components/common/AppShell";
import { ChildJourney, FeatureGrid, Hero, ParentReviews, WhyChooseUs } from "@/components/public/MarketingSections";
import { publicRoutes } from "@/lib/routes";

export default function HomePage() {
  return (
    <AppShell nav={publicRoutes} subtitle="Chuyển đổi thời gian màn hình có phụ huynh kiểm soát" title="Kindy-Mate">
      <Hero />
      <FeatureGrid />
      <WhyChooseUs />
      <ChildJourney />
      <ParentReviews />
    </AppShell>
  );
}
