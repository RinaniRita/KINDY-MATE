import Link from "next/link";
import { Panel } from "@/components/common/Cards";

function MascotIllustration() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px] overflow-hidden rounded-[3rem] border border-white bg-gradient-to-tr from-blue-100 to-indigo-100 p-8 shadow-2xl animate-float">
      {/* Decorative background shapes */}
      <div className="absolute -left-6 -top-6 h-32 w-32 rounded-full bg-yellow-200/50 blur-xl" />
      <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-emerald-200/50 blur-xl" />
      
      {/* Floating Sparkles */}
      <div className="absolute left-10 top-12 text-2xl animate-pulse">✨</div>
      <div className="absolute right-12 bottom-16 text-3xl animate-bounce-gentle">⭐</div>
      <div className="absolute right-8 top-24 text-lg">🎈</div>
      
      {/* Active Mission Pill */}
      <div className="absolute right-6 top-8 rounded-full bg-white/90 px-4 py-2 text-xs font-black text-emerald-600 shadow-lg border border-emerald-100 backdrop-blur-sm transition hover:scale-105">
        🚀 +8 điểm đọc sách
      </div>

      {/* Daily Progress Card */}
      <div className="absolute bottom-8 left-8 rounded-2xl bg-white/90 p-4 shadow-xl border border-white/60 backdrop-blur-sm transition hover:scale-105">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nhiệm vụ hôm nay</p>
        <p className="mt-1 text-base font-black text-slate-800">📚 Đọc sách 4 phút</p>
      </div>

      {/* Bouncing, cute SVG Mascot Milo */}
      <div className="absolute left-1/2 top-1/2 flex h-52 w-52 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-emerald-400 to-teal-400 shadow-xl border-4 border-white">
        <div className="relative h-40 w-40 rounded-[2rem] bg-white flex flex-col items-center justify-center shadow-inner overflow-hidden">
          
          {/* Mascot Cheeks */}
          <div className="absolute left-6 top-20 h-4 w-6 rounded-full bg-pink-200/80 blur-[1px]" />
          <div className="absolute right-6 top-20 h-4 w-6 rounded-full bg-pink-200/80 blur-[1px]" />

          {/* Animated Eyes */}
          <div className="flex gap-10 mt-2">
            <div className="relative h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center">
              <div className="absolute top-1 left-1 h-2.5 w-2.5 rounded-full bg-white" />
              <div className="absolute bottom-1.5 right-1.5 h-1 w-1 rounded-full bg-white" />
            </div>
            <div className="relative h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center">
              <div className="absolute top-1 left-1 h-2.5 w-2.5 rounded-full bg-white" />
              <div className="absolute bottom-1.5 right-1.5 h-1 w-1 rounded-full bg-white" />
            </div>
          </div>

          {/* Sweet Smile */}
          <div className="mt-4 h-4 w-10 border-b-4 border-slate-800 rounded-full animate-bounce-gentle" />

          {/* Mascot Ears */}
          <div className="absolute -left-3 top-10 h-12 w-8 rounded-l-full bg-emerald-100 border-l-4 border-emerald-400" />
          <div className="absolute -right-3 top-10 h-12 w-8 rounded-r-full bg-emerald-100 border-r-4 border-emerald-400" />
          
          {/* Little Astronaut Helmet Ribbon */}
          <div className="absolute top-2 w-full flex justify-center">
            <span className="bg-amber-400 text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-wider border border-white">
              MILO
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] py-8">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-600 border border-emerald-100 shadow-sm">
          <span>🛡️</span>
          <span>Dành Cho Phụ Huynh & Thiết Bị Gia Đình</span>
        </div>
        
        <h1 className="max-w-4xl text-5xl font-black leading-[1.05] tracking-tight text-slate-800 sm:text-6xl md:text-7xl">
          Biến thời gian màn hình thành
          <span className="block mt-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 bg-clip-text text-transparent">
            Học tập, Đọc sách & Vận động
          </span>
        </h1>
        
        <p className="max-w-2xl text-lg font-semibold leading-relaxed text-slate-500">
          Kindy-Mate giúp phụ huynh thiết lập ranh giới thông minh, giúp trẻ rèn luyện tinh thần chủ động thông qua các nhiệm vụ bổ ích để đổi lại những giờ giải trí lành mạnh có giới hạn.
        </p>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center pt-2">
          <Link
            className="bubbly-btn rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 px-8 py-5 text-center text-sm font-black text-white shadow-xl shadow-emerald-100 hover:shadow-emerald-200"
            href="/auth/register"
          >
            Tạo tài khoản phụ huynh ➔
          </Link>
          <Link
            className="bubbly-btn rounded-2xl bg-gradient-to-r from-blue-400 to-indigo-400 px-8 py-5 text-center text-sm font-black text-white shadow-xl shadow-blue-100 hover:shadow-blue-200"
            href="/features"
          >
            Khám phá tính năng
          </Link>
        </div>
      </div>
      
      <MascotIllustration />
    </section>
  );
}

export function FeatureGrid() {
  const items = [
    {
      icon: "🛡️",
      title: "Phụ huynh kiểm soát",
      body: "Thiết lập giới hạn ngày, danh mục nội dung, quyền micro/camera và tạm dừng giải trí tức thì.",
      color: "from-blue-50 to-indigo-50 border-blue-100/50"
    },
    {
      icon: "📚",
      title: "Nhiệm vụ tăng trưởng",
      body: "Trẻ chủ động chọn nhiệm vụ đọc sách, đố vui học tập, vận động vui nhộn hoặc sáng tạo nghệ thuật.",
      color: "from-emerald-50 to-teal-50 border-emerald-100/50"
    },
    {
      icon: "⭐",
      title: "Điểm thưởng an toàn",
      body: "Điểm chỉ đổi quà định mức; hoàn toàn không có hộp quà ngẫu nhiên, gacha hay giao dịch mua hàng.",
      color: "from-amber-50 to-orange-50 border-amber-100/50"
    },
    {
      icon: "📊",
      title: "Bảng theo dõi cân bằng",
      body: "Xem báo cáo chi tiết về học tập, vận động và giải trí kèm gợi ý điều chỉnh tinh tế từ AI.",
      color: "from-violet-50 to-purple-50 border-violet-100/50"
    }
  ];

  return (
    <section className="mt-16">
      <div className="text-center max-w-3xl mx-auto mb-10">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Hệ sinh thái thông minh Kindy-Mate</h2>
        <p className="mt-2 text-slate-500 font-semibold">Tạo dựng thói quen số lành mạnh, vui vẻ và tuyệt đối an toàn cho con trẻ.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => (
          <Panel 
            key={item.title} 
            className={`interactive-card bg-gradient-to-br ${item.color} relative overflow-hidden`}
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md text-2xl animate-float-slow">
              {item.icon}
            </div>
            <h3 className="text-xl font-black text-slate-800">{item.title}</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">{item.body}</p>
          </Panel>
        ))}
      </div>
    </section>
  );
}

export function ChildJourney() {
  const steps = [
    { num: "1", label: "Chọn nhiệm vụ", desc: "Đọc sách, Toán học, Squats..." },
    { num: "2", label: "Hoàn thành", desc: "AI / Hệ thống kiểm tra" },
    { num: "3", label: "Nhận điểm tích lũy", desc: "Cộng vào ví điểm an toàn" },
    { num: "4", label: "Đổi quà định mức", desc: "Xem video, đổi mũ mascot" }
  ];

  return (
    <section className="mt-16 rounded-[2.5rem] bg-gradient-to-br from-teal-400/10 via-emerald-400/5 to-transparent p-8 sm:p-12 border border-emerald-100">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div className="space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Luồng Trải Nghiệm Của Trẻ</p>
          <h2 className="text-3xl font-black tracking-tight text-slate-850 sm:text-4xl">Ngắn, rõ ràng và không gây áp lực số.</h2>
          <p className="text-sm font-semibold leading-relaxed text-slate-500">
            Trẻ không có quyền truy cập trò chuyện tự do với AI. Mọi bước đi đều tuân theo các khung nội dung và nhiệm vụ đã được phụ huynh phê duyệt trước đó.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {steps.map((step) => (
            <div 
              className="group relative rounded-2xl bg-white p-5 shadow-sm border border-slate-100 transition-all duration-300 hover:shadow-md hover:border-emerald-200/50" 
              key={step.label}
            >
              <div className="absolute right-4 top-4 text-xs font-black text-slate-200 group-hover:text-emerald-100 transition-colors">
                STEP {step.num}
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 font-black text-sm mb-3">
                {step.num}
              </div>
              <h4 className="font-black text-slate-800">{step.label}</h4>
              <p className="text-xs font-bold text-slate-400 mt-1">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
