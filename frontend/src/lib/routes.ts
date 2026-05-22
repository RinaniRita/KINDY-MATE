export const publicRoutes = [{ href: "/auth/register", label: "Đăng ký" }];

export const parentRoutes = [
  { href: "/parent/dashboard", label: "Tổng quan" },
  { href: "/parent/children", label: "Con của tôi" },
  { href: "/parent/reports", label: "Báo cáo" },
];

export const childRoutes = (childId: string) => [
  { href: `/child/${childId}/home`, label: "Phòng của con" },
  { href: `/child/${childId}/study`, label: "Bàn học" },
  { href: `/child/${childId}/watch`, label: "TV" },
  { href: `/child/${childId}/move`, label: "Thảm tập" },
  { href: `/child/${childId}/create`, label: "Góc vẽ" },
  { href: `/child/${childId}/mascot`, label: "Tủ đồ" },
  { href: `/child/${childId}/milo`, label: "Milo" },
];
