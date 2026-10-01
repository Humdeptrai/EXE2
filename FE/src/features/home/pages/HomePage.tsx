import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import { useAuth } from "../../../context/AuthContext";
import { jobService } from "../../../services/jobService";
import type { DiscoverySummary, JobManagementSummary } from "../../../types/job";

const emptySummary: JobManagementSummary = { active: 0, completed: 0, draft: 0 };
const emptyDiscoverySummary: DiscoverySummary = { saved: 0, interested: 0, veryInterested: 0, skipped: 0, matching: 0 };

const providerActions = [
  { to: "/discover", title: "Khám phá công việc", description: "Chọn việc phù hợp với bạn.", icon: "briefcase" as const },
  { to: "/saved", title: "Danh sách của tôi", description: "Việc đã lưu và kết nối của bạn.", icon: "bookmark" as const },
];

export default function HomePage() {
  const { user } = useAuth();
  const providerMode = user?.currentMode === "PROVIDER";
  const [summary, setSummary] = useState<JobManagementSummary>(emptySummary);
  const [discoverySummary, setDiscoverySummary] = useState<DiscoverySummary>(emptyDiscoverySummary);

  useEffect(() => {
    let active = true;
    if (providerMode) {
      jobService.getDiscoverySummary()
        .then((result) => { if (active) setDiscoverySummary(result); })
        .catch(() => { if (active) setDiscoverySummary(emptyDiscoverySummary); });
    } else {
      jobService.getSummary()
        .then((result) => { if (active) setSummary(result); })
        .catch(() => { if (active) setSummary(emptySummary); });
    }
    return () => { active = false; };
  }, [providerMode]);

  return (
    <div className="hf-page hf-page-home space-y-4 sm:space-y-5">
      <section className="hf-home-hero overflow-hidden rounded-3xl bg-gradient-to-br from-[#006f84] via-[#008da2] to-[#42aab5] p-5 text-white shadow-[0_20px_55px_rgba(0,111,132,0.2)] sm:p-8">
        <div className="hf-home-hero-copy max-w-2xl">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/75 sm:text-xs sm:tracking-[0.18em]">
            {providerMode ? "Bạn đang ở chế độ nhận việc" : "Bạn đang ở chế độ thuê việc"}
          </p>
          <h1 className="mt-3 break-words text-2xl font-extrabold leading-tight sm:text-4xl">Xin chào, {user?.fullName}!</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/85 sm:text-base sm:leading-7">
            {providerMode
              ? "Một công việc phù hợp đang chờ bạn."
              : "Bạn cần hỗ trợ việc gì hôm nay?"}
          </p>
          <Link
            to={providerMode ? (user?.profileCompleted ? "/discover" : "/profile") : "/jobs/new"}
            className="mt-5 inline-flex min-h-11 max-w-full items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-extrabold text-[#007f95] shadow-sm transition hover:-translate-y-0.5 sm:mt-6 sm:px-5 sm:py-3"
          >
            <AppIcon name={providerMode ? (user?.profileCompleted ? "briefcase" : "edit") : "plus"} className="h-4 w-4 shrink-0" />
            <span className="truncate">{providerMode ? (user?.profileCompleted ? "Khám phá công việc" : "Hoàn thiện hồ sơ") : "Đăng công việc mới"}</span>
          </Link>
        </div>
        <img className="hf-home-hero-image" src="/images/handsfree-community.webp" alt="Minh họa cộng đồng hỗ trợ việc nhà, mua đồ và chăm thú cưng" width="720" height="540" decoding="async" />
      </section>

      {!user?.profileCompleted && (
        <section className="flex flex-col gap-4 rounded-3xl border border-[#b9dde3] bg-[#eff9fb] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="font-extrabold text-[#006f84]">Hồ sơ của bạn chưa hoàn tất</p>
            <p className="mt-1 text-sm leading-6 text-[#526b72]">Thêm giới thiệu, khu vực và kỹ năng của bạn.</p>
          </div>
          <Link to="/profile" className="min-h-11 shrink-0 rounded-xl bg-[#007f95] px-4 py-2.5 text-center text-sm font-extrabold text-white">Cập nhật ngay</Link>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#799097] sm:text-xs sm:tracking-[0.16em]">Bắt đầu nhanh</p>
            <h2 className="mt-1 text-lg font-extrabold sm:text-xl">{providerMode ? "Không gian nhận việc" : "Không gian thuê việc"}</h2>
          </div>
          
        </div>

        {providerMode ? (
          <div className="grid gap-4 md:grid-cols-2">
            {providerActions.map((action) => (
              <Link key={action.to} to={action.to} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9bcbd2] sm:p-5">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f5f7] text-[#007f95]"><AppIcon name={action.icon} className="h-6 w-6" /></div>
                <h3 className="mt-5 text-lg font-extrabold">{action.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{action.description}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Link to="/jobs/new" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9bcbd2] sm:p-5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f5f7] text-[#007f95]"><AppIcon name="plus" className="h-6 w-6" /></div>
              <h3 className="mt-5 text-lg font-extrabold">Đăng một công việc</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Thêm nhu cầu, lịch và ảnh của bạn.</p>
            </Link>
            <Link to="/posts" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9bcbd2] sm:p-5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f5f7] text-[#007f95]"><AppIcon name="list" className="h-6 w-6" /></div>
              <h3 className="mt-5 text-lg font-extrabold">Quản lý bài đăng</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Bản nháp, ứng viên và tiến độ.</p>
            </Link>
            <Link to="/candidates" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9bcbd2] sm:p-5 md:col-span-2">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f5f7] text-[#007f95]"><AppIcon name="users" className="h-6 w-6" /></div>
              <h3 className="mt-5 text-lg font-extrabold">Duyệt ứng viên</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Xem hồ sơ, chọn người phù hợp.</p>
            </Link>
          </div>
        )}
      </section>

      <section className="hf-home-stats grid grid-cols-1 gap-3 min-[420px]:grid-cols-3 sm:gap-4">
        {(providerMode
          ? [[String(discoverySummary.saved), "Đã lưu"], [String(discoverySummary.interested + discoverySummary.veryInterested), "Đang quan tâm"], [String(discoverySummary.matching), "Đã kết nối"]]
          : [[String(summary.active), "Đang đăng"], [String(summary.draft), "Bản nháp"], [String(summary.completed), "Đã kết thúc"]]
        ).map(([value, label]) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm sm:p-5">
            <p className="text-2xl font-extrabold text-[#007f95]">{value}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
