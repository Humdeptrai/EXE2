import { useEffect, useState } from "react";
import { profileSkillService, type ProfileSkill } from "../../../services/profileSkillService";
import UserNotice from "../../../components/feedback/UserNotice";
import { getApiErrorMessage } from "../../auth/utils/apiError";
const labels = { PENDING: "Chờ ADMIN duyệt", APPROVED: "Đã duyệt", REJECTED: "Không được duyệt" };
export default function ProfileSkills({ selected, toggle }: { selected: string[]; toggle: (name: string) => void }) {
  const [catalog, setCatalog] = useState<ProfileSkill[]>([]);
  const [proposals, setProposals] = useState<ProfileSkill[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.all([profileSkillService.catalog(), profileSkillService.mine()]).then(([list, mine]) => { if (active) { setCatalog(list); setProposals(mine); } })
      .catch(e => { if (active) setError(getApiErrorMessage(e, "Không tải được danh mục. Hãy tải lại trang.")); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function propose() {
    if (busy || !name.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try { const item = await profileSkillService.propose(name.trim()); setProposals(items => [item, ...items]); setName(""); setMessage("Đã gửi đề xuất. Bạn sẽ nhận thông báo khi ADMIN xử lý."); }
    catch (e) { setError(getApiErrorMessage(e, "Không thể gửi đề xuất.")); }
    finally { setBusy(false); }
  }
  const choices = [...new Set([...catalog.map(s => s.name), ...selected])];
  return <fieldset className="min-w-0">
    <legend className="text-sm font-extrabold">Kỹ năng & sở thích <span className="font-medium text-slate-400">Không bắt buộc · tối đa 8</span></legend>
    {loading && <p className="mt-2 text-xs text-slate-500">Đang tải danh mục…</p>}
    <div className="mt-3 flex flex-wrap gap-2">{choices.map(tag => <button key={tag} type="button" onClick={() => toggle(tag)} aria-pressed={selected.includes(tag)} className={`min-h-10 rounded-full border px-3 py-2 text-sm font-bold ${selected.includes(tag) ? "border-[#007f95] bg-[#007f95] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-[#87c4ce]"}`}>{selected.includes(tag) ? "✓ " : "+ "}{tag}</button>)}</div>
    <details className="mt-4 rounded-xl border border-slate-200 p-3 text-sm">
      <summary className="cursor-pointer font-bold text-[#007f95]">Đề xuất kỹ năng / sở thích mới</summary>
      <p className="mt-2 text-xs leading-5 text-slate-500">Chưa thấy lựa chọn phù hợp? Gửi đề xuất để ADMIN duyệt và thêm vào danh mục chung.</p>
      <label className="mt-3 block text-xs font-bold">Tên đề xuất<input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void propose(); } }} minLength={2} maxLength={40} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-base font-medium" placeholder="Ví dụ: Chăm sóc cây cảnh" /></label>
      <button type="button" disabled={busy || name.trim().length < 2} onClick={() => void propose()} className="mt-3 min-h-10 rounded-xl bg-[#007f95] px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50">{busy ? "Đang gửi…" : "Gửi đề xuất"}</button>
      {proposals.length > 0 && <ul className="mt-4 space-y-2">{proposals.map(s => <li key={s.id} className="rounded-lg bg-slate-50 p-3"><div className="flex flex-wrap justify-between gap-2"><strong>{s.name}</strong><span className={`text-xs font-bold ${s.status === "REJECTED" ? "text-red-600" : s.status === "APPROVED" ? "text-emerald-700" : "text-amber-700"}`}>{labels[s.status]}</span></div>{s.rejectionReason && <p className="mt-1 break-words text-xs text-slate-600">Lý do: {s.rejectionReason}</p>}</li>)}</ul>}
    </details>
    {error && <UserNotice error message={error} className="mt-3" />}{message && <UserNotice tone="success" message={message} className="mt-3" />}
  </fieldset>;
}
