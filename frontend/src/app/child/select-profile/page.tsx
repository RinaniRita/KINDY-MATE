import Link from "next/link";

import { AppShell } from "@/components/common/AppShell";
import { Panel } from "@/components/common/Cards";
import { demoChild } from "@/lib/mock-data";
import { publicRoutes } from "@/lib/routes";

export default function SelectProfilePage() {
  return (
    <AppShell nav={publicRoutes} subtitle="Chuyển sang khu trẻ em từ phiên phụ huynh" title="Khu trẻ em">
      <Panel eyebrow="Khu trẻ em" title="Chọn hồ sơ trẻ">
        <p className="text-sm font-semibold leading-7 text-[#52677a]">
          Khu trẻ em được mở từ phiên phụ huynh. Trẻ không thấy bảng tổng quan, cài đặt hoặc hàng chờ duyệt nội dung.
        </p>
        <Link
          className="mt-5 inline-flex rounded-lg bg-[#8dccf5] px-5 py-3 text-sm font-black text-[#17324d]"
          href={`/child/${demoChild.id}/home`}
        >
          Vào hồ sơ {demoChild.nickname}
        </Link>
      </Panel>
    </AppShell>
  );
}
