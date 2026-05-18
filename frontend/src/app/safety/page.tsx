import { InfoPage } from "@/components/public/InfoPage";

export default function SafetyPage() {
  return (
    <InfoPage
      title="An toàn từ thiết kế"
      items={[
        ["Không trò chuyện tự do", "Bạn dẫn đường chỉ hướng dẫn nhiệm vụ trong luồng có giới hạn, không hỏi bí mật hoặc dữ liệu cá nhân."],
        ["Quản trị nội dung", "Mỗi nội dung có độ tuổi phù hợp, trạng thái duyệt, tình trạng bản quyền, mức kích thích và ghi chú an toàn."],
        ["Privacy", "Dùng nickname/avatar mặc định, không yêu cầu ảnh thật, địa chỉ, trường học hoặc số điện thoại trẻ."],
        ["Trạng thái bị chặn", "Khi bị chặn, trẻ nhận lời nhắn thân thiện và được hướng sang nhiệm vụ tăng trưởng."],
      ]}
    />
  );
}
