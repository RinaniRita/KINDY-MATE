import { Metric, Panel } from "@/components/common/Cards";
import { demoDashboard, demoRules } from "@/lib/mock-data";

export function ParentDashboard() {
  const capPercent = Math.min((demoDashboard.entertainmentMinutesToday / demoRules.dailyCapMinutes) * 100, 100);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] py-4">
      {/* Development Balance Section */}
      <Panel eyebrow="Theo Dõi Hoạt Động" title="Cân bằng phát triển công nghệ">
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <Metric label="✏️ Thời gian Học" value={`${demoDashboard.learningMinutes} phút`} variant="green" />
          <Metric label="📚 Thời gian Đọc" value={`${demoDashboard.readingMinutes} phút`} variant="blue" />
          <Metric label="🏃 Thời gian Vận động" value={`${demoDashboard.movementMinutes} phút`} variant="yellow" />
          <Metric 
            label="⏱️ Giải trí hôm nay" 
            value={`${demoDashboard.entertainmentMinutesToday}/${demoRules.dailyCapMinutes} phút`} 
            variant="rose" 
          />
        </div>

        {/* Entertainment Cap Slider Progress bar */}
        <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-slate-100/60 shadow-inner">
          <div className="mb-3 flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-wider">
            <span>Tiến trình hạn mức giải trí ngày</span>
            <span className="text-rose-500 font-bold">{Math.round(capPercent)}% Đã Dùng</span>
          </div>
          
          <div className="h-4 w-full overflow-hidden rounded-full bg-slate-200/60 border border-slate-200">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400 transition-all duration-1000 shadow-md" 
              style={{ width: `${capPercent}%` }} 
            />
          </div>

          <p className="mt-3 text-[10px] font-bold text-slate-400 leading-normal">
            ⚙️ Hạn mức này tự động reset vào lúc 00:00 mỗi ngày. Phụ huynh có thể thay đổi luật tại tab Cài đặt luật bất kỳ lúc nào.
          </p>
        </div>
      </Panel>

      {/* Gentle Guidance & Alerts Section */}
      <Panel eyebrow="Đồng hành cùng con" title="Gợi ý tinh tế từ Milo AI">
        <div className="space-y-4 mt-2">
          {demoDashboard.alerts.map((alert, index) => {
            const styles = [
              "bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border-blue-100/80 text-blue-800",
              "bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border-emerald-100/80 text-emerald-800",
              "bg-gradient-to-r from-slate-50/80 to-slate-100/50 border-slate-250 text-slate-700"
            ];
            const icons = ["💡", "🛡️", "🌟"];

            return (
              <div 
                className={`flex gap-3 rounded-2xl border p-5 text-sm font-bold leading-relaxed shadow-sm transition hover:shadow-md ${styles[index % styles.length]}`} 
                key={alert}
              >
                <span className="text-xl shrink-0">{icons[index % icons.length]}</span>
                <div>
                  <p className="text-xs font-black uppercase text-slate-400 mb-0.5">Mẹo đồng hành #{index + 1}</p>
                  <p>{alert}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6">
          <div className="flex items-center gap-3 bg-amber-50/50 border border-amber-100/60 rounded-2xl p-4">
            <span className="text-2xl animate-float-slow">⚖️</span>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">
              <strong className="text-amber-800 block">Triết lý thiết kế Kindy-Mate:</strong>
              Milo hướng đến việc hỗ trợ phụ huynh điều hướng thời gian số thông minh của trẻ, không chẩn đoán y tế, không đánh giá đạo đức và không gán nhãn lười biếng.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
