import { InfoPage } from "@/components/public/InfoPage";

export default function AboutPage() {
  return (
    <InfoPage
      title="Kindy-Mate là gì?"
      items={[
        ["Định vị", "Một hệ thống do phụ huynh dẫn dắt, có hỗ trợ cá nhân hóa, giúp chuyển thời gian màn hình sẵn có thành hoạt động phát triển."],
        ["Người dùng", "Phụ huynh là chủ tài khoản và người quyết định. Trẻ là người tham gia trong các luồng được hướng dẫn."],
        ["Không phải", "Không phải người trông trẻ tự động, không phải trò chuyện tự do, không thay thế phụ huynh hoặc giáo viên."],
        ["Thiết bị", "Thiết kế cho thiết bị phụ huynh, tablet gia đình hoặc thiết bị dùng chung có giám sát."],
      ]}
    />
  );
}
