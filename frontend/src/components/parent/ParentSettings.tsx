"use client";

import { useState, useEffect } from "react";
import { Panel } from "@/components/common/Cards";
import { apiGet, apiPatch, apiDelete } from "@/lib/api";
import { readAuthSession } from "@/lib/auth";

type AuditEntry = {
  id: number;
  action_type: string;
  action_label: string;
  child_nickname: string;
  description: string;
  created_at: string;
};

type ChildOption = { id: string; nickname: string };

/* ───── PIN Management ───── */
function PinSection() {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const session = readAuthSession();
  const hasPinConfigured = session?.user?.pin_configured;

  async function handleChangePin() {
    setStatus("");
    if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      setStatus("❌ Mã PIN phải từ 4-6 chữ số.");
      return;
    }
    if (newPin !== confirmPin) {
      setStatus("❌ Mã PIN xác nhận không khớp.");
      return;
    }
    setSaving(true);
    try {
      await apiPatch("/auth/me/", { parent_pin: newPin });
      setStatus("✅ Đã cập nhật mã PIN thành công!");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err) {
      setStatus(`❌ ${err instanceof Error ? err.message : "Lỗi cập nhật PIN."}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPinByPassword() {
    setStatus("");
    if (!currentPin) {
      setStatus("❌ Vui lòng nhập mật khẩu tài khoản để xác thực.");
      return;
    }
    if (newPin.length < 4 || !/^\d+$/.test(newPin)) {
      setStatus("❌ Mã PIN mới phải từ 4-6 chữ số.");
      return;
    }
    setSaving(true);
    try {
      await apiPatch("/auth/me/", { password: currentPin, parent_pin: newPin });
      setStatus("✅ Đã reset và thiết lập mã PIN mới!");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err) {
      setStatus(`❌ ${err instanceof Error ? err.message : "Xác thực thất bại."}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel eyebrow="🔐 Bảo mật" title="Quản lý mã PIN bảo vệ trẻ em">
      <p className="text-xs font-bold text-slate-500 mb-4">
        Mã PIN dùng để bảo vệ khu vực trẻ em. Khi trẻ muốn thoát về bảng phụ huynh, cần nhập mã PIN.
        {hasPinConfigured
          ? " Bạn đã thiết lập PIN."
          : " Bạn chưa thiết lập PIN (mặc định: 1234)."}
      </p>

      <div className="grid gap-4">
        {hasPinConfigured && (
          <label className="grid gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
            Mật khẩu tài khoản (để xác thực reset)
            <input
              type="password"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              placeholder="Nhập mật khẩu tài khoản"
              className="min-h-11 rounded-xl border border-slate-200 bg-white/70 px-4 font-bold text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        )}
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
          Mã PIN mới (4-6 chữ số)
          <input
            type="password"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="VD: 5678"
            maxLength={6}
            className="min-h-11 rounded-xl border border-slate-200 bg-white/70 px-4 font-bold text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
          Xác nhận PIN mới
          <input
            type="password"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            placeholder="Nhập lại PIN"
            maxLength={6}
            className="min-h-11 rounded-xl border border-slate-200 bg-white/70 px-4 font-bold text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <div className="flex gap-3">
          <button
            onClick={hasPinConfigured ? handleResetPinByPassword : handleChangePin}
            disabled={saving}
            type="button"
            className="bubbly-btn rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 px-5 py-3 text-xs font-black text-white shadow-md disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : hasPinConfigured ? "🔄 Reset & Đổi PIN" : "🔒 Thiết lập PIN"}
          </button>
        </div>

        {status && (
          <div className={`rounded-xl p-3 text-xs font-bold ${status.startsWith("✅") ? "bg-emerald-50 border border-emerald-100 text-emerald-700" : "bg-rose-50 border border-rose-100 text-rose-700"}`}>
            {status}
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ───── Child Data Management ───── */
function DataManagement() {
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [exportData, setExportData] = useState<object | null>(null);
  const [status, setStatus] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    apiGet<ChildOption[]>("/children/", []).then((data) => {
      setChildren(data);
      if (data.length > 0) setSelectedId(data[0].id);
    });
  }, []);

  const selectedChild = children.find((c) => c.id === selectedId);

  async function handleExport() {
    setStatus("");
    try {
      const data = await apiGet(`/activity/children/${selectedId}/export/`, null);
      setExportData(data);
      setStatus("✅ Dữ liệu đã được xuất thành công. Bạn có thể sao chép JSON bên dưới.");
    } catch (err) {
      setStatus(`❌ ${err instanceof Error ? err.message : "Lỗi xuất dữ liệu."}`);
    }
  }

  async function handleDelete() {
    if (deleteConfirmText !== selectedChild?.nickname) {
      setStatus("❌ Tên trẻ nhập không đúng. Vui lòng nhập chính xác để xác nhận.");
      return;
    }
    try {
      await apiDelete(`/activity/children/${selectedId}/delete/`);
      setStatus("✅ Đã xóa vĩnh viễn toàn bộ dữ liệu. Trang sẽ tải lại.");
      setConfirmDelete(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setStatus(`❌ ${err instanceof Error ? err.message : "Lỗi xóa dữ liệu."}`);
    }
  }

  return (
    <Panel eyebrow="📦 Dữ liệu trẻ" title="Xuất & Xóa dữ liệu (GDPR/COPPA)">
      <p className="text-xs font-bold text-slate-500 mb-4">
        Phụ huynh có toàn quyền xuất hoặc xóa vĩnh viễn dữ liệu của con theo quy định bảo vệ dữ liệu trẻ em.
      </p>

      {children.length > 0 && (
        <select
          className="mb-4 min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 outline-none w-full"
          onChange={(e) => { setSelectedId(e.target.value); setExportData(null); setConfirmDelete(false); }}
          value={selectedId}
        >
          {children.map((c) => (
            <option key={c.id} value={c.id}>{c.nickname}</option>
          ))}
        </select>
      )}

      <div className="flex gap-3 flex-wrap">
        <button onClick={handleExport} type="button" className="bubbly-btn rounded-xl bg-blue-500 text-white px-5 py-3 text-xs font-black shadow-md">
          📥 Xuất dữ liệu JSON
        </button>
        <button onClick={() => setConfirmDelete(!confirmDelete)} type="button" className="bubbly-btn rounded-xl bg-rose-500 text-white px-5 py-3 text-xs font-black shadow-md">
          🗑️ Xóa vĩnh viễn
        </button>
      </div>

      {confirmDelete && (
        <div className="mt-4 p-4 rounded-xl border-2 border-rose-200 bg-rose-50">
          <p className="text-xs font-black text-rose-700 mb-2">
            ⚠️ Hành động này KHÔNG THỂ HOÀN TÁC. Nhập tên &quot;{selectedChild?.nickname}&quot; để xác nhận:
          </p>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={`Nhập "${selectedChild?.nickname}"`}
            className="min-h-11 w-full rounded-xl border border-rose-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none"
          />
          <button
            onClick={handleDelete}
            disabled={deleteConfirmText !== selectedChild?.nickname}
            type="button"
            className="mt-3 bubbly-btn rounded-xl bg-rose-600 text-white px-5 py-2.5 text-xs font-black shadow-md disabled:opacity-40"
          >
            Xác nhận xóa vĩnh viễn
          </button>
        </div>
      )}

      {exportData && (
        <div className="mt-4">
          <textarea
            readOnly
            value={JSON.stringify(exportData, null, 2)}
            className="w-full h-48 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-700"
          />
        </div>
      )}

      {status && (
        <div className={`mt-3 rounded-xl p-3 text-xs font-bold ${status.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {status}
        </div>
      )}
    </Panel>
  );
}

/* ───── Audit Log ───── */
function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<AuditEntry[]>("/activity/audit-log/", []).then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  return (
    <Panel eyebrow="📋 Nhật ký" title="Lịch sử thao tác phụ huynh (Audit Log)">
      <p className="text-xs font-bold text-slate-500 mb-4">
        Mọi thay đổi quan trọng (đổi PIN, duyệt/chặn nội dung, xóa dữ liệu, thay đổi luật) đều được ghi nhận.
      </p>

      {loading ? (
        <p className="py-4 text-center text-xs font-bold text-slate-400">🔄 Đang tải...</p>
      ) : logs.length === 0 ? (
        <p className="py-4 text-center text-xs font-bold text-slate-400">Chưa có lịch sử thao tác.</p>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <th className="pb-2">Thời gian</th>
                <th className="pb-2">Hành động</th>
                <th className="pb-2">Trẻ</th>
                <th className="pb-2">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs text-slate-600">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="py-3 font-bold text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("vi-VN")}
                  </td>
                  <td className="py-3">
                    <span className="rounded-lg bg-indigo-50 border border-indigo-100 px-2 py-1 text-[10px] font-black text-indigo-600">
                      {log.action_label}
                    </span>
                  </td>
                  <td className="py-3 font-bold">{log.child_nickname}</td>
                  <td className="py-3 text-slate-500">{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/* ───── Main Settings Page ───── */
export function ParentSettings() {
  return (
    <div className="grid gap-6 py-4">
      <PinSection />
      <DataManagement />
      <AuditLog />
    </div>
  );
}
