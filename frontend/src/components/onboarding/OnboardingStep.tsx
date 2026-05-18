import Link from "next/link";

import { Panel } from "@/components/common/Cards";

export function OnboardingStep({
  body,
  nextHref,
  title,
}: {
  title: string;
  body: string;
  nextHref: string;
}) {
  return (
    <Panel eyebrow="Onboarding" title={title}>
      <p className="text-sm font-semibold leading-7 text-[#52677a]">{body}</p>
      <Link className="mt-5 inline-flex rounded-lg bg-[#5fcfb4] px-5 py-3 text-sm font-black text-white" href={nextHref}>
        Tiếp tục
      </Link>
    </Panel>
  );
}
