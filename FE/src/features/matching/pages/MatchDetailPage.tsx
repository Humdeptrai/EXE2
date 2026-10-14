import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../../config/axios";
import type { ApiResponse } from "../../../types/api";
import type { JobMatch, MatchUser } from "../../../types/matching";
import type { JobPost } from "../../../types/job";
import type { UserReputation } from "../../../types/rating";
import UserNotice from "../../../components/feedback/UserNotice";
import IdentityImageViewer from "../../../components/feedback/IdentityImageViewer";
import PrivateIdentityImage from "../../identity/components/PrivateIdentityImage";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import { formatVnd, budgetLabel, formatJobDate } from "../../jobs/utils/jobFormat";

type Detail = { match: JobMatch; job: JobPost; profile: MatchUser; reputation: UserReputation; perspective: "CONSUMER" | "PROVIDER" };
const date = (value: string | null) => value ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "Chưa có";
const button = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#007f95] px-4 py-2 text-sm font-bold text-white";
export default function MatchDetailPage() {
  const { matchId } = useParams();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError("");
    api.get<ApiResponse<Detail>>(`/matches/${matchId}/detail`, { signal: controller.signal })
      .then(r => setData(r.data.result)).catch(e => { if (!controller.signal.aborted) setError(getApiErrorMessage(e, "Không thể xem kết nối. Cả hai bên cần hoàn tất thanh toán.")); });
    return () => controller.abort();
  }, [matchId, revision]);
  return <main className="mx-auto w-full max-w-6xl space-y-5 px-3 py-5 text-slate-800 sm:px-6 sm:py-8">
    <Link to={data?.perspective === "CONSUMER" ? "/candidates" : "/saved?tab=MATCHING"} className="inline-flex min-h-11 items-center text-sm font-bold text-[#007f95]">← Danh sách kết nối</Link>
    <header><p className="text-xs font-bold uppercase tracking-widest text-[#007f95]">Kết nối của bạn</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">Hồ sơ & chi tiết công việc</h1><p className="mt-2 text-sm text-slate-500">Thông tin dành riêng cho hai bên đã hoàn tất phí kết nối.</p></header>
    {error && <><UserNotice message={error} error /><button className={button} onClick={() => setRevision(v => v + 1)}>Thử lại</button></>}
    {!data && !error && <p role="status">Đang tải chi tiết…</p>}
    {data && <>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"><strong>✓ Hai bên đã thanh toán đầy đủ</strong><span>Kết nối lúc {date(data.match.connectionSucceededAt)}</span></section>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="min-w-0 space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-4"><div className="w-20 shrink-0">{data.profile.avatarUrl ? <IdentityImageViewer src={data.profile.avatarUrl} alt={`Ảnh đại diện ${data.profile.fullName}`} className="h-20 w-20 rounded-2xl object-cover" /> : <div className="grid h-20 w-20 place-items-center rounded-2xl bg-cyan-50 text-2xl font-black text-[#007f95]">{data.profile.fullName.charAt(0)}</div>}</div><div className="min-w-0"><p className="text-xs font-bold text-[#007f95]">{data.perspective === "CONSUMER" ? "Người nhận việc" : "Người thuê"}</p><h2 className="mt-1 break-words text-xl font-black">{data.profile.fullName}</h2></div></div>
          <dl className="space-y-4 break-words text-sm">{[["Nơi ở", data.profile.location], ["Điện thoại", data.profile.phone], ["Email", data.profile.email], ["Giới thiệu", data.profile.bio]].map(([label, value]) => <div key={label}><dt className="font-bold text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap">{value || "Chưa cập nhật"}</dd></div>)}</dl>
          <div><h3 className="text-sm font-bold text-slate-500">Kỹ năng</h3><div className="mt-2 flex flex-wrap gap-2">{data.profile.tags.length ? data.profile.tags.map(tag => <span key={tag} className="max-w-full break-words rounded-xl bg-cyan-50 px-3 py-2 text-sm text-[#007f95]">{tag}</span>) : <span className="text-sm">Chưa cập nhật</span>}</div></div>
          <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">{([['Đánh giá thuê người', data.reputation.asConsumer], ['Đánh giá nhận việc', data.reputation.asProvider]] as const).map(([label, rating]) => <div key={label} className="rounded-2xl bg-slate-50 p-3"><h3 className="text-xs font-bold text-slate-500">{label}</h3><strong className="mt-2 block text-lg text-[#007f95]">{rating.ratingCount ? `★ ${Number(rating.averageRating).toFixed(1)}/5` : "Chưa có đánh giá"}</strong><p className="text-xs text-slate-500">{rating.ratingCount} lượt đánh giá</p></div>)}</div>
          {data.profile.verifiedFaceUrl && <div><h3 className="mb-2 text-sm font-bold">Selfie đã xác minh</h3><PrivateIdentityImage path={data.profile.verifiedFaceUrl} alt="Selfie đã xác minh của đối tác" /></div>}
        </section>
        <section className="min-w-0 space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div><p className="text-xs font-bold text-[#007f95]">{data.job.category.name}</p><h2 className="mt-2 break-words text-xl font-black">{data.job.title}</h2><p className="mt-3 text-lg font-black text-[#007f95]">{formatVnd(data.job.budgetAmount)} · {budgetLabel(data.job.budgetType)}</p></div>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">{[["Bắt đầu", formatJobDate(data.job.scheduledDate, data.job.startTime)], ["Dự kiến kết thúc", data.match.expectedEndAt ? date(data.match.expectedEndAt) : data.job.expectedEndAt?.replace("T", " ") || "Chưa cập nhật"], ["Địa điểm", data.job.location], ["Số người cần", `${data.job.requiredWorkers} người`]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="font-bold text-slate-500">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl>
          <div><h3 className="font-bold">Mô tả & yêu cầu</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{data.job.description}</p></div>
          {data.job.media.length > 0 && <div className="grid grid-cols-2 gap-3">{data.job.media.filter(m => m.contentType.startsWith("image/")).map(m => <IdentityImageViewer key={m.id} src={m.url} alt={m.originalName} className="aspect-[4/3] w-full rounded-xl object-cover" />)}</div>}
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4"><Link className={button} to={`/messages/match/${matchId}`}>Nhắn tin</Link><Link className={button + " !bg-amber-50 !text-amber-800"} to={`/matches/${matchId}/rating`}>Xem / viết đánh giá</Link><Link className={button + " !bg-slate-100 !text-slate-700"} to={`/reports?targetType=MATCH&targetId=${matchId}`}>Báo cáo đối tác</Link></div>
          <p className="text-xs leading-5 text-slate-500">Đánh giá mở từ {date(data.match.ratingOpensAt)} đến {date(data.match.ratingClosesAt)}. Thời gian hiển thị theo giờ Việt Nam.</p>
        </section>
      </div>
    </>}
  </main>;
}
