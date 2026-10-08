import UserNotice from "../../../components/feedback/UserNotice";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AppIcon } from "../../../components/ui/AppIcon";
import { useAuth } from "../../../context/AuthContext";
import { ratingService } from "../../../services/ratingService";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import type { UpdateProfileRequest } from "../../../types/auth";
import type { UserReputation } from "../../../types/rating";

const AVAILABLE_TAGS = [
  "Dọn dẹp",
  "Giao hàng",
  "Chăm thú cưng",
  "Sửa chữa",
  "Gia sư",
  "Thiết kế",
  "Nấu ăn",
  "Hỗ trợ sự kiện",
  "Có phương tiện",
  "Làm việc nhanh",
  "Cẩn thận",
  "Linh hoạt",
];

function emptyForm(): UpdateProfileRequest {
  return { fullName: "", phone: "", avatarUrl: "", bio: "", location: "", tags: [] };
}

export default function ProfilePage() {
  const { user, updateProfile, uploadAvatar, deleteAvatar, logout } = useAuth();
  const [editing, setEditing] = useState(!user?.profileCompleted);
  const [form, setForm] = useState<UpdateProfileRequest>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [reputation, setReputation] = useState<UserReputation | null>(null);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => {
      setForm({
        fullName: user.fullName || "",
        phone: user.phone || "",
        avatarUrl: user.avatarUrl || "",
        bio: user.bio || "",
        location: user.location || "",
        tags: user.tags || [],
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void ratingService.getUserReputation(user.id)
      .then((result) => { if (active) setReputation(result); })
      .catch(() => { if (active) setReputation(null); });
    return () => { active = false; };
  }, [user?.id]);

  const completedItems = useMemo(() => [
    Boolean(form.fullName.trim()),
    Boolean(form.location.trim()),
    Boolean(form.bio.trim()),
    form.tags.length > 0,
  ], [form]);
  const progress = completedItems.filter(Boolean).length * 25;

  function setField<K extends keyof UpdateProfileRequest>(field: K, value: UpdateProfileRequest[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleTag(tag: string) {
    setMessage(null);
    setForm((current) => {
      if (current.tags.includes(tag)) {
        return { ...current, tags: current.tags.filter((item) => item !== tag) };
      }
      if (current.tags.length >= 8) {
        setMessage({ type: "error", text: "Bạn chỉ được chọn tối đa 8 kỹ năng hoặc sở thích." });
        return current;
      }
      return { ...current, tags: [...current.tags, tag] };
    });
  }


  async function handleAvatarChange(file: File | undefined) {
    if (!file) return;
    if (!(["image/jpeg", "image/png", "image/webp"] as const).includes(file.type as "image/jpeg" | "image/png" | "image/webp")) {
      setMessage({ type: "error", text: "Ảnh đại diện chỉ hỗ trợ JPEG, PNG hoặc WEBP." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Ảnh đại diện không được vượt quá 5 MB." });
      return;
    }
    setAvatarSaving(true);
    setMessage(null);
    try {
      const updated = await uploadAvatar(file);
      setField("avatarUrl", updated.avatarUrl || "");
      setMessage({ type: "success", text: "Đã cập nhật ảnh đại diện." });
    } catch (error) {
      setMessage({ type: "error", text: getApiErrorMessage(error, "Không thể tải ảnh đại diện lúc này.") });
    } finally {
      setAvatarSaving(false);
    }
  }

  async function handleDeleteAvatar() {
    setAvatarSaving(true);
    setMessage(null);
    try {
      await deleteAvatar();
      setField("avatarUrl", "");
      setMessage({ type: "success", text: "Đã xóa ảnh đại diện." });
    } catch (error) {
      setMessage({ type: "error", text: getApiErrorMessage(error, "Không thể xóa ảnh đại diện lúc này.") });
    } finally {
      setAvatarSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateProfile({
        ...form,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        avatarUrl: form.avatarUrl.trim(),
        bio: form.bio.trim(),
        location: form.location.trim(),
      });
      setMessage({ type: "success", text: updated.profileCompleted ? "Hồ sơ đã hoàn tất và sẵn sàng cho matching." : "Đã lưu thông tin hồ sơ." });
      setEditing(false);
    } catch (error) {
      setMessage({ type: "error", text: getApiErrorMessage(error, "Không thể cập nhật hồ sơ lúc này.") });
    } finally {
      setSaving(false);
    }
  }

  const initials = user?.fullName
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="hf-page hf-page-profile grid min-w-0 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <a className="hf-face-entry" href="/face-comparison" style={{ gridColumn: "1 / -1", padding: "16px 20px", borderRadius: 16, background: "#eaf7f9", color: "#006b82", fontWeight: 600 }}>Xác thực danh tính → Quét khuôn mặt & CCCD</a>
      <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-24 bg-gradient-to-r from-[#007f95] to-[#66bdc6] sm:h-36" />
        <div className="px-4 pb-5 sm:px-8 sm:pb-6">
          <div className="-mt-11 flex min-w-0 flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-end gap-3 sm:gap-4">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Ảnh đại diện" className="h-20 w-20 shrink-0 rounded-full border-4 border-white bg-white object-cover shadow-md sm:h-28 sm:w-28" />
              ) : (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 border-white bg-[#dff3f6] text-xl font-extrabold text-[#007f95] shadow-md sm:h-28 sm:w-28 sm:text-2xl">
                  {initials || "HF"}
                </div>
              )}
              <div className="min-w-0 pb-1">
                <h1 className="break-words text-xl font-extrabold leading-tight sm:text-3xl">{user?.fullName}</h1>
                <p className="mt-1 flex min-w-0 items-start gap-1.5 text-xs font-bold leading-5 text-slate-500 sm:text-sm">
                  <AppIcon name="location" className="mt-0.5 h-4 w-4 shrink-0" />
                  {user?.location || "Chưa cập nhật khu vực"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setEditing((value) => !value); setMessage(null); }}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#007f95] px-4 py-2.5 text-sm font-extrabold text-white sm:w-auto"
            >
              <AppIcon name="edit" className="h-4 w-4" />
              {editing ? "Đóng chỉnh sửa" : "Chỉnh sửa hồ sơ"}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl bg-[#f5f8fb] px-1 py-3 text-center sm:mt-6 sm:px-2 sm:py-4">
            <div><p className="text-lg font-extrabold text-[#007f95] sm:text-xl">{reputation?.overall.successfulMatchCount ?? 0}</p><p className="px-1 text-[9px] font-bold leading-3 text-slate-500 min-[380px]:text-[10px] sm:text-[11px]">Kết nối thành công</p></div>
            <div><p className="text-lg font-extrabold text-[#007f95] sm:text-xl">{reputation?.overall.averageRating == null ? "—" : `${reputation.overall.averageRating.toFixed(1)}★`}</p><p className="px-1 text-[9px] font-bold leading-3 text-slate-500 min-[380px]:text-[10px] sm:text-[11px]">Độ tin cậy</p></div>
            <div><p className="text-lg font-extrabold text-[#007f95] sm:text-xl">{reputation?.overall.ratingCount ?? 0}</p><p className="px-1 text-[9px] font-bold leading-3 text-slate-500 min-[380px]:text-[10px] sm:text-[11px]">Đánh giá</p></div>
          </div>

          {!editing && (
            <div className="mt-7 space-y-6">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-[0.12em] text-slate-400">Giới thiệu</h2>
                <p className="mt-2 whitespace-pre-line leading-7 text-slate-600">{user?.bio || "Bạn chưa thêm phần giới thiệu bản thân."}</p>
              </div>
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-[0.12em] text-slate-400">Kỹ năng & sở thích</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {user?.tags.length ? user.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#e7f5f7] px-3 py-1.5 text-sm font-bold text-[#007f95]">{tag}</span>
                  )) : <p className="text-sm text-slate-500">Chưa có kỹ năng hoặc sở thích nào.</p>}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold text-slate-400">Email</p><p className="mt-1 break-all font-bold">{user?.email || "Không có"}</p></div>
                <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold text-slate-400">Số điện thoại</p><p className="mt-1 font-bold">{user?.phone || "Chưa cập nhật"}</p></div>
              </div>
            </div>
          )}

          {editing && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5 sm:mt-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-extrabold">Họ và tên *
                  <input value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} maxLength={100} required className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-medium outline-none focus:border-[#007f95] focus:ring-2 focus:ring-[#cbe9ed]" />
                </label>
                <label className="block text-sm font-extrabold">Số điện thoại
                  <input value={form.phone} onChange={(e) => setField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="0901234567" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-medium outline-none focus:border-[#007f95] focus:ring-2 focus:ring-[#cbe9ed]" />
                </label>
              </div>
              <label className="block text-sm font-extrabold">Khu vực hoạt động *
                <input value={form.location} onChange={(e) => setField("location", e.target.value)} maxLength={120} placeholder="Ví dụ: Quận 9, TP. Hồ Chí Minh" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-medium outline-none focus:border-[#007f95] focus:ring-2 focus:ring-[#cbe9ed]" />
              </label>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-extrabold">Ảnh đại diện</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">JPEG, PNG hoặc WEBP · tối đa 5 MB. Khi Cloudinary được bật, ảnh sẽ được lưu trên CDN.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#007f95] px-4 py-2 text-sm font-extrabold text-white ${avatarSaving ? "pointer-events-none opacity-60" : ""}`}>
                    {avatarSaving ? "Đang xử lý..." : "Chọn ảnh"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={avatarSaving} onChange={(event) => void handleAvatarChange(event.target.files?.[0])} />
                  </label>
                  {user?.avatarUrl && (
                    <button type="button" disabled={avatarSaving} onClick={() => void handleDeleteAvatar()} className="min-h-11 rounded-xl border border-red-200 px-4 py-2 text-sm font-extrabold text-red-600 disabled:opacity-50">
                      Xóa ảnh
                    </button>
                  )}
                </div>
              </div>
              <label className="block text-sm font-extrabold">Giới thiệu bản thân *
                <textarea value={form.bio} onChange={(e) => setField("bio", e.target.value)} maxLength={500} rows={5} placeholder="Chia sẻ ngắn về kinh nghiệm, cách làm việc và thời gian bạn thường rảnh..." className="mt-2 min-h-32 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-medium leading-6 outline-none focus:border-[#007f95] focus:ring-2 focus:ring-[#cbe9ed]" />
                <span className="mt-1 block text-right text-xs font-bold text-slate-400">{form.bio.length}/500</span>
              </label>
              <fieldset>
                <legend className="text-sm font-extrabold">Kỹ năng & sở thích * <span className="font-medium text-slate-400">(tối đa 8)</span></legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {AVAILABLE_TAGS.map((tag) => {
                    const selected = form.tags.includes(tag);
                    return (
                      <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`min-h-11 rounded-full border px-3 py-2 text-sm font-bold transition ${selected ? "border-[#007f95] bg-[#007f95] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-[#87c4ce]"}`}>
                        {selected ? "✓ " : "+ "}{tag}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {message && <UserNotice message={message.text} tone={message.type} />}

              <button disabled={saving} className="min-h-12 w-full rounded-xl bg-[#007f95] px-5 py-3.5 font-extrabold text-white shadow-[0_10px_25px_rgba(0,127,149,0.2)] disabled:opacity-60">
                {saving ? "Đang lưu..." : "Lưu hồ sơ"}
              </button>
            </form>
          )}

          {!editing && message && <UserNotice message={message.text} tone={message.type} />}
        </div>
      </section>

      <aside className="min-w-0 space-y-4 sm:space-y-5">
        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="font-extrabold">Mức độ hoàn thiện</h2><span className="font-extrabold text-[#007f95]">{progress}%</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#007f95] transition-all" style={{ width: `${progress}%` }} /></div>
          <div className="mt-4 space-y-3 text-sm">
            {[
              ["Họ và tên", completedItems[0]],
              ["Khu vực", completedItems[1]],
              ["Giới thiệu", completedItems[2]],
              ["Ít nhất 1 kỹ năng", completedItems[3]],
            ].map(([label, done]) => (
              <div key={String(label)} className="flex items-center gap-2">
                <span className={`grid h-5 w-5 place-items-center rounded-full text-xs font-extrabold ${done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{done ? "✓" : "·"}</span>
                <span className={done ? "font-bold text-slate-700" : "text-slate-400"}>{String(label)}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-xl bg-[#f0f8fa] p-3 text-xs leading-5 text-[#526b72]">Thêm ảnh và số điện thoại để hồ sơ dễ nhận diện hơn. Đây là thông tin tùy chọn.</p>
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-extrabold">Nghiệp vụ chế độ</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Chuyển chế độ chỉ thay đổi trải nghiệm hiện tại. Quyền hệ thống và các công việc đang hoạt động không bị mất.</p>
        </section>

        <button type="button" onClick={() => void logout()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-3 font-extrabold text-red-600 lg:hidden">
          <AppIcon name="logout" className="h-5 w-5" /> Đăng xuất
        </button>
      </aside>
    </div>
  );
}
