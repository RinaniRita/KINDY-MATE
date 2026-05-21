"use client";

import Link from "next/link";

import { Panel } from "@/components/common/Cards";

const faqs = [
  {
    title: "Giới hạn thời lượng phiên là gì?",
    body: "Đây là tổng thời gian cho một lần dùng app của con. Hết mốc này thì phiên sẽ kết thúc và app quay về màn hình khóa hoặc chọn hồ sơ.",
  },
  {
    title: "Giới hạn tổng thời gian màn hình là gì?",
    body: "Đây là tổng số phút con được dùng các hoạt động có màn hình trong một phiên. Khi chạm mốc này, con chỉ còn các hoạt động rời màn hình hoặc kết thúc phiên.",
  },
  {
    title: "Giới hạn thời gian màn hình liên tục là gì?",
    body: "Đây là số phút con được nhìn màn hình liên tiếp trước khi app yêu cầu nghỉ hoặc chuyển sang hoạt động không dùng màn hình.",
  },
  {
    title: "Thời gian nghỉ giữa các lần nhìn màn hình là gì?",
    body: "Đây là khoảng nghỉ tối thiểu trước khi con quay lại hoạt động có màn hình sau một quãng nhìn liên tục.",
  },
  {
    title: "Nên dùng preset nào?",
    body: "Ít màn hình phù hợp khi muốn ưu tiên hoạt động ngoài màn hình. Cân bằng phù hợp cho ngày thường. Ưu tiên học tập phù hợp khi cần thêm thời gian cho các hoạt động học có mục tiêu rõ ràng.",
  },
  {
    title: "Tạm dừng khẩn cấp để làm gì?",
    body: "Khi bật, app sẽ tạm dừng việc bắt đầu phiên mới cho tới khi phụ huynh kiểm tra lại cấu hình. Phù hợp khi cần dừng nhanh để xem lại giới hạn thời gian hoặc nội dung được phép.",
  },
];

export function ParentProfileFaqs() {
  return (
    <div className="grid gap-6">
      <Panel eyebrow="Giải thích" title="Giải thích các giới hạn thời gian">
        <div className="grid gap-4">
          {faqs.map((item) => (
            <div key={item.title} className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-base font-black text-slate-800">{item.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex justify-start">
        <Link
          href="/parent/profile"
          className="inline-flex min-h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm"
        >
          Quay về hồ sơ phụ huynh
        </Link>
      </div>
    </div>
  );
}
