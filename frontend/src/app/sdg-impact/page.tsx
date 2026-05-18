import { InfoPage } from "@/components/public/InfoPage";

export default function SdgImpactPage() {
  return (
    <InfoPage
      title="SDG impact"
      items={[
        ["SDG 4", "Khuyến khích đọc, học, luyện tư duy và cá nhân hóa nhiệm vụ từ content bank đã duyệt."],
        ["SDG 3", "Giảm thời gian thụ động kéo dài bằng vận động ngắn, cooldown và daily cap."],
        ["SDG 10", "Có thể hỗ trợ gia đình bận rộn tiếp cận hoạt động học tập có cấu trúc, nhưng không tuyên bố quá mức."],
        ["Cách đo", "Bảng tổng quan tập trung vào cân bằng: học, đọc, vận động, giải trí, điểm đã nhận/đã dùng và cảnh báo nhẹ nhàng."],
      ]}
    />
  );
}
