import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { reportService } from "../../../services/reportService";
import type { Report } from "../../../types/report";
import { useNotifications } from "../../../context/NotificationContext";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import UserNotice from "../../../components/feedback/UserNotice";
import ReportDetailContent from "../components/ReportDetailContent";
export default function ReportDetailPage() {
  const { reportId = "" } = useParams();
  const { subscribeNotifications } = useNotifications();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (signal?: AbortSignal) => {
    try { const result = await reportService.detail(reportId, signal); if (!signal?.aborted) { setReport(result); setError(""); } }
    catch (e) { if (!signal?.aborted) setError(getApiErrorMessage(e, "Không thể mở báo cáo.")); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [reportId]);
  useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => void load(controller.signal), 0); return () => { clearTimeout(timer); controller.abort(); }; }, [load]);
  useEffect(() => subscribeNotifications(n => { if (n.referenceId === reportId && ["REPORT_RESOLVED", "REPORT_REJECTED"].includes(n.type)) void load(); }), [subscribeNotifications, reportId, load]);
  return <div className="hf-page mx-auto max-w-3xl space-y-5 pb-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link to="/reports" className="inline-flex min-h-11 items-center text-sm font-extrabold text-[#007f95]">← Báo cáo của bạn</Link><button type="button" onClick={() => void load()} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#007f95]">Làm mới</button></div>
    <h1 className="text-2xl font-black">Chi tiết báo cáo</h1>
    {error && <UserNotice message={error} error />}
    {loading ? <p role="status">Đang tải báo cáo…</p> : report && <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><ReportDetailContent report={report} /></section>}
  </div>;
}
