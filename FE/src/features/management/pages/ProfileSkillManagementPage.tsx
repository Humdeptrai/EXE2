import { useEffect, useState } from "react";
import { profileSkillService, type ProfileSkill } from "../../../services/profileSkillService";
import type { PageResponse } from "../../../types/job";
import { FilterBar, PageHeading, Pagination, StatusBadge, useOperatorFilters } from "../components/OperatorUi";
import OperatorModal from "../components/OperatorModal";
import UserNotice from "../../../components/feedback/UserNotice";
import { getApiErrorMessage } from "../../auth/utils/apiError";
const labels = { PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Đã từ chối" };
export default function ProfileSkillManagementPage() {
  const filters = useOperatorFilters();
  const [data, setData] = useState<PageResponse<ProfileSkill> | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [reject, setReject] = useState<ProfileSkill | null>(null);
  const [reason, setReason] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) setLoading(true); });
    profileSkillService.list(filters.search, filters.state, filters.page).then(result => { if (active) { setData(result); setError(""); } })
      .catch(e => { if (active) { setData(null); setError(getApiErrorMessage(e, "Không thể tải danh mục.")); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters.search, filters.state, filters.page, revision]);
  async function act(task: () => Promise<unknown>, message: string) {
    if (busy) return; setBusy(true); setError(""); setSuccess("");
    try { await task(); setSuccess(message); setRevision(x => x + 1); setReject(null); setReason(""); }
    catch (e) { setError(getApiErrorMessage(e, "Không thể xử lý. Hãy tải lại để kiểm tra trạng thái.")); }
    finally { setBusy(false); }
  }
  return <>
    <PageHeading title="Kỹ năng & sở thích" description="Quản lý danh mục chung và duyệt đề xuất của người dùng." />
    {error && <UserNotice error message={error} />}{success && <UserNotice tone="success" message={success} />}
    <section className="op-card op-table-card"><form className="op-table-toolbar" onSubmit={e => { e.preventDefault(); void act(async () => { await profileSkillService.add(name.trim()); setName(""); }, "Đã thêm vào danh mục."); }}>
      <label className="op-search"><span className="sr-only">Tên kỹ năng / sở thích mới</span><input value={name} minLength={2} maxLength={40} required placeholder="Thêm kỹ năng / sở thích…" onChange={e => setName(e.target.value)} /></label><button className="op-button primary" disabled={busy || name.trim().length < 2}>Thêm vào danh mục</button>
    </form></section>
    <section className="op-card op-table-card">
      <FilterBar {...filters} state={filters.state} onApply={filters.apply} options={labels} total={data?.totalElements} placeholder="Tìm tên kỹ năng / sở thích…" />
      {loading ? <p className="p-5 text-sm text-slate-500">Đang tải danh mục…</p> : !data?.content.length ? <p className="p-5 text-sm text-slate-500">Không có đề xuất phù hợp.</p> : <ul className="divide-y divide-slate-100">{data.content.map(s => <li key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><h2 className="break-words text-sm font-extrabold text-slate-800">{s.name}</h2><p className="mt-1 text-xs text-slate-500">{s.submittedName ? `Đề xuất bởi ${s.submittedName}` : "Danh mục hệ thống"} · {s.createdAt && new Date(s.createdAt).toLocaleDateString("vi-VN")}</p>{s.rejectionReason && <p className="mt-2 break-words text-xs text-red-700">Lý do từ chối: {s.rejectionReason}</p>}</div>
        <div className="flex shrink-0 flex-wrap items-center gap-2"><StatusBadge value={s.status} label={labels[s.status]} />{s.status === "PENDING" && <><button className="op-button primary" disabled={busy} onClick={() => void act(() => profileSkillService.review(s.id, true), "Đã duyệt và thông báo cho người đề xuất.")}>Duyệt</button><button className="op-button danger" disabled={busy} onClick={() => { setReject(s); setReason(""); }}>Từ chối</button></>}</div>
      </li>)}</ul>}
      {data && <Pagination page={filters.page} last={data.last} total={data.totalElements} loading={loading || busy} onPage={filters.setPage} />}
    </section>
    {reject && <OperatorModal title={`Từ chối: ${reject.name}`} onClose={() => { if (!busy) setReject(null); }}><form onSubmit={e => { e.preventDefault(); void act(() => profileSkillService.review(reject.id, false, reason.trim()), "Đã từ chối và thông báo lý do cho người đề xuất."); }}>
      {error && <UserNotice error message={error} />}
      <label className="block text-sm font-bold">Lý do từ chối<textarea required maxLength={300} value={reason} onChange={e => setReason(e.target.value)} rows={4} className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-base" /></label><p className="mt-2 text-xs text-slate-500">Người đề xuất sẽ nhận được lý do này.</p><button disabled={busy || !reason.trim()} className="op-button danger mt-4">{busy ? "Đang xử lý…" : "Xác nhận từ chối"}</button>
    </form></OperatorModal>}
  </>;
}
