import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useNotifications } from "../../../context/NotificationContext";
import { useFeedback } from "../../../components/feedback/FeedbackContext";
import UserNotice from "../../../components/feedback/UserNotice";
import { reportService } from "../../../services/reportService";
import { reportStatuses, reportTargets, type Report, type ReportTarget } from "../../../types/report";
import { getApiErrorMessage } from "../../auth/utils/apiError";
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
function validateFiles(files: File[]): string {
  if (files.filter(f => imageTypes.has(f.type)).length > 5 || files.filter(f => f.type === "video/mp4").length > 1) return "Chỉ đính kèm tối đa 5 ảnh và 1 video.";
  if (files.some(f => !imageTypes.has(f.type) && f.type !== "video/mp4")) return "Ảnh phải là JPEG, PNG hoặc WebP; video phải là MP4.";
  if (files.some(f => !f.size || f.size > (f.type === "video/mp4" ? 100 : 5) * 1024 * 1024)) return "Mỗi ảnh tối đa 5 MB và video tối đa 100 MB; tệp không được rỗng.";
  return "";
}
export default function ReportsPage() {
  const { user } = useAuth(); const { confirm } = useFeedback(); const { subscribeNotifications } = useNotifications();
  const [query] = useSearchParams(); const navigate = useNavigate();
  const [type, setType] = useState<ReportTarget>((query.get("targetType") as ReportTarget) || "SUPPORT");
  const [target, setTarget] = useState(query.get("targetId") || user?.id || "");
  const [reason, setReason] = useState(""); const [links, setLinks] = useState(""); const [files, setFiles] = useState<File[]>([]);
  const [items, setItems] = useState<Report[]>([]); const [page, setPage] = useState(0); const [last, setLast] = useState(true);
  const [busy, setBusy] = useState(false); const lock = useRef(false); const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    try { const result = await reportService.mine(page, signal); if (!signal?.aborted) { setItems(result.content); setLast(result.last); } }
    catch (e) { if (!signal?.aborted) setError(getApiErrorMessage(e, "Không tải được báo cáo.")); }
  }, [page]);
  useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => void load(controller.signal), 0); return () => { clearTimeout(timer); controller.abort(); }; }, [load]);
  useEffect(() => subscribeNotifications(n => { if (["REPORT_RESOLVED", "REPORT_REJECTED"].includes(n.type)) void load(); }), [subscribeNotifications, load]);
  async function warn(message: string) { await confirm({ title: "Chưa thể gửi báo cáo", message, danger: true, acknowledgeOnly: true, confirmLabel: "Tôi đã hiểu" }); }
  async function addFiles(incoming: File[]) {
    const combined = [...files, ...incoming]; const message = validateFiles(combined);
    if (message) await warn(message); else setFiles(combined);
  }
  async function submit() {
    if (lock.current) return;
    const values = links.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    let invalidLink = values.length > 5;
    for (const value of values) {
      try { const url = new URL(value); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || value.length > 2000) invalidLink = true; }
      catch { invalidLink = true; }
    }
    const validation = !target.trim() ? "Vui lòng nhập mã đối tượng cần báo cáo." : !reason.trim() ? "Vui lòng nhập nội dung báo cáo." : reason.trim().length > 2000 ? "Nội dung tối đa 2.000 ký tự." : invalidLink ? "Chỉ gửi tối đa 5 link HTTP/HTTPS hợp lệ, mỗi link một dòng." : validateFiles(files);
    if (validation) { await warn(validation); return; }
    lock.current = true; setBusy(true); setProgress(0); setError("");
    try { const result = await reportService.create({ targetType: type, targetId: target.trim(), reason: reason.trim(), links: values }, files, setProgress); navigate(`/reports/${result.id}`); }
    catch (e) { setError(getApiErrorMessage(e, "Không thể gửi báo cáo.")); }
    finally { lock.current = false; setBusy(false); }
  }
  const field = "mt-2 min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base font-medium outline-none focus:border-[#007f95] disabled:bg-slate-50";
  return <div className="hf-page hf-page-reports mx-auto max-w-3xl space-y-5 pb-6">
    <div><h1 className="text-2xl font-black">Báo cáo và hỗ trợ</h1><p className="mt-2 text-sm leading-6 text-slate-500">Gửi nội dung để bộ phận hỗ trợ xem xét. Ảnh, video và link đều không bắt buộc.</p></div>
    {error && <UserNotice message={error} error />}
    <form noValidate onSubmit={e => { e.preventDefault(); void submit(); }} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <label className="block text-sm font-extrabold">Đối tượng<select disabled={busy} value={type} onChange={e => setType(e.target.value as ReportTarget)} className={field}>{Object.entries(reportTargets).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="block text-sm font-extrabold">Mã đối tượng<input disabled={busy} value={target} onChange={e => setTarget(e.target.value)} className={field} /><span className="mt-2 block text-xs font-medium text-slate-500">Được điền sẵn khi mở từ bài đăng hoặc matching.</span></label>
      <label className="block text-sm font-extrabold">Nội dung báo cáo<textarea disabled={busy} maxLength={2000} rows={5} value={reason} onChange={e => setReason(e.target.value)} className={`${field} min-h-32 py-3`} /><span className="mt-1 block text-right text-xs font-medium text-slate-400">{reason.length}/2.000</span></label>
      <section className="space-y-3 rounded-2xl border border-dashed border-[#b9dde3] bg-[#f2fafb] p-4"><h2 className="font-extrabold text-[#007f95]">Bằng chứng (tùy chọn)</h2><p className="text-xs leading-6 text-slate-600">Tối đa 5 ảnh, mỗi ảnh 5 MB; 1 video MP4 tối đa 100 MB. Chỉ bạn và bộ phận quản trị được xem.</p>
        <label className="block text-sm font-bold">Thêm ảnh / video<input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4" disabled={busy} onChange={e => { const selected = Array.from(e.target.files || []); e.target.value = ""; void addFiles(selected); }} className="mt-2 block w-full min-w-0 text-sm file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-[#007f95] file:px-3 file:font-bold file:text-white" /></label>
        {files.map((file, i) => <div key={`${file.name}-${i}`} className="flex min-w-0 items-start justify-between gap-3 rounded-xl bg-white p-3"><p className="min-w-0 break-words text-xs text-slate-600">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p><button type="button" disabled={busy} onClick={() => setFiles(current => current.filter((_, index) => index !== i))} className="min-h-11 shrink-0 px-2 text-xs font-bold text-red-600">Xóa</button></div>)}
        <label className="block text-sm font-bold">Link bằng chứng<textarea disabled={busy} value={links} onChange={e => setLinks(e.target.value)} maxLength={10004} rows={3} placeholder="https://… (mỗi link một dòng, tối đa 5 link)" className={`${field} py-3`} /></label>
      </section>
      {busy && <div role="status"><p className="mb-2 text-sm font-bold text-[#007f95]">{progress === 100 ? "Đã tải lên; đang lưu báo cáo và bằng chứng…" : files.length ? `Đang gửi bằng chứng… ${progress}%` : "Đang gửi báo cáo…"}</p><progress value={progress} max={100} className="h-2 w-full accent-[#007f95]" /></div>}
      <button disabled={busy} className="min-h-12 w-full rounded-xl bg-[#007f95] font-extrabold text-white disabled:opacity-50">{busy ? "Đang gửi…" : "Gửi báo cáo"}</button>
    </form>
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black">Báo cáo của bạn</h2><button type="button" onClick={() => void load()} className="min-h-11 text-sm font-bold text-[#007f95]">Làm mới</button></div>
      {!items.length && <p className="py-5 text-sm text-slate-500">Chưa có báo cáo trên trang này.</p>}
      {items.map(r => <article key={r.id} className="space-y-2 border-b border-slate-100 py-4"><p className="text-sm font-bold text-[#007f95]">{reportTargets[r.targetType]} · {reportStatuses[r.status]}</p><p className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{r.reason}</p>{r.resolution && <p className="line-clamp-2 text-sm text-slate-600">Phản hồi: {r.resolution}</p>}<Link to={`/reports/${r.id}`} className="inline-flex min-h-11 items-center text-sm font-extrabold text-[#007f95]">Xem toàn bộ nội dung và phản hồi →</Link></article>)}
      <div className="mt-4 flex items-center justify-between gap-3"><button type="button" disabled={!page} onClick={() => setPage(p => p - 1)} className="min-h-11 px-3 text-sm font-bold disabled:opacity-40">Trước</button><span className="text-sm">Trang {page + 1}</span><button type="button" disabled={last} onClick={() => setPage(p => p + 1)} className="min-h-11 px-3 text-sm font-bold disabled:opacity-40">Tiếp</button></div>
    </section>
  </div>;
}
