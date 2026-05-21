export const publicRoutes = [
  { href: "/", label: "Trang chủ" },
  { href: "/features", label: "Tính năng" },
  { href: "/about", label: "Giới thiệu" },
  { href: "/safety", label: "An toàn" },
  { href: "/sdg-impact", label: "Tác động SDG" },
  { href: "/auth/login", label: "Đăng nhập" },
  { href: "/auth/register", label: "Đăng ký" },
];

export const parentRoutes = [
  { href: "/parent/dashboard", label: "Tổng quan" },
  { href: "/parent/reports", label: "Báo cáo" },
  { href: "/parent/rules", label: "Luật bảo vệ" },
  { href: "/parent/settings", label: "Cài đặt" },
  { href: "/parent/content-approval", label: "Duyệt nội dung" },
];

export const childRoutes = (childId: string) => [
  { href: `/child/${childId}/home`, label: "Phòng ngủ" },
  { href: `/child/${childId}/study`, label: "Học tập" },
  { href: `/child/${childId}/watch`, label: "Giải trí" },
  { href: `/child/${childId}/move`, label: "Vận động" },
  { href: `/child/${childId}/create`, label: "Sáng tạo" },
  { href: `/child/${childId}/mascot`, label: "Mascot" },
  { href: `/child/${childId}/milo`, label: "Milo AI" },
  { href: `/child/${childId}/missions`, label: "Nhiệm vụ" },
  { href: `/child/${childId}/rewards`, label: "Quà tặng" },
  { href: `/child/${childId}/entertainment`, label: "Giải trí số" },
];
