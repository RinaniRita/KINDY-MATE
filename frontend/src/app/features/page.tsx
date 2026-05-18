import { InfoPage } from "@/components/public/InfoPage";

export default function FeaturesPage() {
  return (
    <InfoPage
      title="Tính năng cốt lõi"
      items={[
        ["Phụ huynh kiểm soát", "Hồ sơ trẻ, giới hạn ngày, danh mục được phép, quyền micro/camera và tạm dừng khẩn cấp."],
        ["Nhiệm vụ tăng trưởng", "Nhiệm vụ đọc, học, vận động, sáng tạo và nhìn lại nhẹ để nhận điểm."],
        ["Reward economy", "Đổi điểm lấy giải trí giới hạn hoặc mascot customization, không loot box hoặc real-money child purchase."],
        ["Bảng tổng quan", "Phụ huynh xem cân bằng hoạt động, cảnh báo nhẹ nhàng, gợi ý điều chỉnh và nhật ký tối thiểu cần thiết."],
      ]}
    />
  );
}
