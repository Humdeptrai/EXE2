import type { Report } from "../../../types/report";
import { reportStatuses, reportTargets } from "../../../types/report";
import ReportEvidenceGallery from "./ReportEvidenceGallery";
export default function ReportDetailContent({ report }: { report: Report }) {
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#e7f5f7] px-3 py-1 text-xs font-extrabold text-[#007f95]">{reportStatuses[report.status]}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{reportTargets[report.targetType]}</span></div>
    <dl className="grid gap-2 text-sm text-slate-600"><div><dt className="font-bold">Mã báo cáo</dt><dd className="break-all">{report.id}</dd></div><div><dt className="font-bold">Mã đối tượng</dt><dd className="break-all">{report.targetId}</dd></div><div><dt className="font-bold">Ngày gửi</dt><dd>{new Date(report.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</dd></div>{report.assignedName && <div><dt className="font-bold">Người nhận xử lý</dt><dd>{report.assignedName}</dd></div>}</dl>
    <section><h3 className="font-extrabold">Nội dung báo cáo</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{report.reason}</p></section>
    <section className="rounded-2xl border border-[#c5e4e8] bg-[#f2fafb] p-4"><h3 className="font-extrabold text-[#007f95]">Phản hồi / lý do xử lý</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{report.resolution || "Bộ phận hỗ trợ chưa có kết quả xử lý. Bạn có thể quay lại để kiểm tra."}</p>{report.resolvedAt && <p className="mt-3 text-xs text-slate-500">Cập nhật: {new Date(report.resolvedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>}</section>
    <ReportEvidenceGallery evidence={report.evidence} links={report.links} />
  </div>;
}
