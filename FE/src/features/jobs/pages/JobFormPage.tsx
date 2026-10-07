import { useFeedback } from "../../../components/feedback/FeedbackContext";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ImageViewer from "../../../components/ui/ImageViewer";
import VndInput from "../../../components/ui/VndInput";
import { AppIcon } from "../../../components/ui/AppIcon";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import { jobService } from "../../../services/jobService";
import type { BudgetType, JobCategory, JobPost, JobUpsertRequest } from "../../../types/job";

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface FormState {
  title: string;
  categoryId: string;
  description: string;
  scheduledDate: string;
  startTime: string;
  location: string;
  budgetAmount: string;
  budgetType: BudgetType;
  requiredWorkers: string;
}

const initialForm: FormState = {
  title: "",
  categoryId: "",
  description: "",
  scheduledDate: "",
  startTime: "",
  location: "",
  budgetAmount: "",
  budgetType: "HOURLY",
  requiredWorkers: "1",
};

const categoryEmoji: Record<string, string> = {
  HOUSEHOLD: "🏠",
  PET_CARE: "🐾",
  DELIVERY: "🛵",
  REPAIR: "🛠️",
  STUDY: "📚",
};

function toDateInputValue(value: Date): string {
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function jobToForm(job: JobPost): FormState {
  return {
    title: job.title,
    categoryId: job.category.id,
    description: job.description,
    scheduledDate: job.scheduledDate,
    startTime: job.startTime.slice(0, 5),
    location: job.location,
    budgetAmount: String(job.budgetAmount),
    budgetType: job.budgetType,
    requiredWorkers: String(job.requiredWorkers),
  };
}

export default function JobFormPage() {
  const { confirm } = useFeedback();
  const { jobId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(jobId);
  const [persistedJobId, setPersistedJobId] = useState<string | null>(jobId || null);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [job, setJob] = useState<JobPost | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState<"DRAFT" | "PUBLISH" | null>(null);
  const savingRef = useRef(false);
  const [savingLabel, setSavingLabel] = useState("Đang lưu bài...");
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);

  const previews = useMemo(
    () => newFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [newFiles],
  );

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [loadedCategories, loadedJob] = await Promise.all([
          jobService.getCategories(),
          jobId ? jobService.getMineById(jobId) : Promise.resolve(null),
        ]);
        if (!active) return;
        setCategories(loadedCategories);
        if (loadedJob) {
          setJob(loadedJob);
          setForm(jobToForm(loadedJob));
        }
      } catch (error) {
        if (active) setMessage({ type: "error", text: getApiErrorMessage(error, "Không thể tải biểu mẫu công việc.") });
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [jobId]);

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;

    const invalidType = selected.find((file) => !ALLOWED_IMAGE_TYPES.has(file.type));
    if (invalidType) {
      setMessage({ type: "error", text: "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP." });
      return;
    }
    const tooLarge = selected.find((file) => file.size > MAX_IMAGE_BYTES);
    if (tooLarge) {
      setMessage({ type: "error", text: `Ảnh ${tooLarge.name} vượt quá 5 MB.` });
      return;
    }
    const existingCount = job?.media.length || 0;
    if (existingCount + newFiles.length + selected.length > MAX_IMAGES) {
      setMessage({ type: "error", text: "Mỗi bài đăng chỉ được có tối đa 5 hình ảnh." });
      return;
    }
    setNewFiles((current) => [...current, ...selected]);
    setMessage(null);
  }

  async function removeExistingMedia(mediaId: string) {
    const currentJobId = persistedJobId;
    if (!currentJobId || !await confirm({ title: "Xóa hình ảnh", message: "Xóa hình ảnh này khỏi bài đăng?", confirmLabel: "Xóa ảnh", danger: true })) return;
    try {
      await jobService.deleteMedia(currentJobId, mediaId);
      setJob((current) => current ? { ...current, media: current.media.filter((media) => media.id !== mediaId) } : current);
    } catch (error) {
      setMessage({ type: "error", text: getApiErrorMessage(error, "Không thể xóa hình ảnh.") });
    }
  }

  function buildPayload(): JobUpsertRequest {
    return {
      title: form.title.trim(),
      categoryId: form.categoryId,
      description: form.description.trim(),
      scheduledDate: form.scheduledDate,
      startTime: form.startTime,
      location: form.location.trim(),
      budgetAmount: Number(form.budgetAmount),
      budgetType: form.budgetType,
      requiredWorkers: Number(form.requiredWorkers),
    };
  }

  async function save(action: "DRAFT" | "PUBLISH") {
    if (savingRef.current) return;
    savingRef.current = true;
    setSavingLabel("Đang lưu bài...");
    setSavingAction(action);
    setMessage(null);
    try {
      if (hasActiveMatches && job && Number(form.requiredWorkers) < job.requiredWorkers) {
        setMessage({ type: "error", text: `Bài đã có Matching. Số người cần chỉ được tăng từ ${job.requiredWorkers} trở lên.` });
        return;
      }
      const payload = buildPayload();
      let saved = persistedJobId
        ? await jobService.update(persistedJobId, payload)
        : await jobService.createDraft(payload);

      if (!persistedJobId) setPersistedJobId(saved.id);

      if (newFiles.length) {
        setSavingLabel(`Đang tải ${newFiles.length} ảnh...`);
        const media = await jobService.uploadMedia(saved.id, newFiles);
        saved = { ...saved, media };
        setNewFiles([]);
        setJob(saved);
      }

      if (action === "PUBLISH" && saved.status === "DRAFT") {
        setSavingLabel("Đang đăng bài...");
        saved = await jobService.publish(saved.id);
      }

      setJob(saved);
      navigate(`/posts?tab=${action === "PUBLISH" ? "ACTIVE" : "DRAFT"}`, {
        replace: true,
        state: { notice: action === "PUBLISH" ? "Đăng bài thành công." : "Đã lưu bản nháp." },
      });
    } catch (error) {
      setMessage({ type: "error", text: getApiErrorMessage(error, "Không thể lưu bài đăng. Vui lòng thử lại.") });
    } finally {
      savingRef.current = false;
      setSavingAction(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save("DRAFT");
  }

  if (loading) {
    return <div className="grid min-h-[55dvh] place-items-center text-sm font-bold text-slate-500">Đang tải biểu mẫu...</div>;
  }

  const mediaCount = (job?.media.length || 0) + newFiles.length;
  const canEdit = !job || job.status === "DRAFT" || job.status === "PUBLISHED";
  const hasActiveMatches = Boolean(job && job.status === "PUBLISHED" && job.matchedCount > 0);
  const canEditCore = canEdit && !hasActiveMatches;
  const minimumRequiredWorkers = hasActiveMatches && job ? job.requiredWorkers : 1;

  return (
    <div className="hf-page hf-page-job-form mx-auto w-full max-w-5xl pb-4">
      {previewImage && <ImageViewer image={previewImage} onClose={() => setPreviewImage(null)} />}
      <div className="mb-4 flex items-start gap-3 sm:mb-6">
        <Link to="/posts" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm" aria-label="Quay lại quản lý bài đăng">
          <span className="text-xl">←</span>
        </Link>
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6f8e95] sm:text-xs">Chế độ thuê việc</p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">{isEditing ? "Chỉnh sửa công việc" : "Tạo yêu cầu mới"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Thêm nhu cầu, lịch làm việc và ngân sách.</p>
        </div>
      </div>

      {!canEdit && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">Bài đăng ở trạng thái hiện tại chỉ có thể xem, không thể chỉnh sửa.</div>
      )}

      {hasActiveMatches && (
        <div className="mb-4 rounded-2xl border border-[#b7dce2] bg-[#eef9fb] px-4 py-3 text-sm font-bold leading-6 text-[#356b75]">
          Bài đã có {job?.matchedCount} Matching. Tiêu đề, mô tả, danh mục, ngày/giờ, địa điểm và ngân sách đã được khóa để bảo vệ thỏa thuận với Provider. Bạn chỉ được tăng số người cần; hình ảnh vẫn có thể quản lý.
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <section className="min-w-0 space-y-5 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <label className="block text-sm font-extrabold">Tiêu đề công việc *
            <input
              value={form.title}
              onChange={(event) => setField("title", event.target.value)}
              maxLength={120}
              required
              disabled={!canEditCore}
              placeholder="Ví dụ: Dắt chó đi dạo buổi chiều"
              className="mt-2 min-h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-medium outline-none transition focus:border-[#007f95] focus:ring-2 focus:ring-[#cbe9ed] disabled:bg-slate-50"
            />
            <span className="mt-1 block text-right text-xs font-bold text-slate-400">{form.title.length}/120</span>
          </label>

          <fieldset disabled={!canEditCore}>
            <div className="flex items-center justify-between gap-3">
              <legend className="text-sm font-extrabold">Danh mục *</legend>
              <span className="text-xs font-bold text-slate-400">Chọn một</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 min-[520px]:grid-cols-3 sm:gap-3">
              {categories.map((category) => {
                const selected = form.categoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setField("categoryId", category.id)}
                    className={`min-h-24 rounded-2xl border p-3 text-left transition ${selected ? "border-[#007f95] bg-[#eaf7f9] ring-2 ring-[#bfe4e9]" : "border-slate-200 bg-white hover:border-[#8fc6cf]"}`}
                  >
                    <span className="text-2xl" aria-hidden="true">{categoryEmoji[category.code] || "✨"}</span>
                    <span className="mt-2 block text-sm font-extrabold">{category.name}</span>
                  </button>
                );
              })}
            </div>
            {!form.categoryId && <input className="sr-only" required value="" onChange={() => undefined} aria-label="Danh mục" />}
          </fieldset>

          <label className="block text-sm font-extrabold">Mô tả chi tiết *
            <textarea
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
              maxLength={2000}
              rows={7}
              required
              disabled={!canEditCore}
              placeholder="Nêu rõ nội dung cần làm, yêu cầu đặc biệt, dụng cụ đã có và kết quả mong muốn..."
              className="mt-2 min-h-40 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-medium leading-7 outline-none transition focus:border-[#007f95] focus:ring-2 focus:ring-[#cbe9ed] disabled:bg-slate-50"
            />
            <span className="mt-1 block text-right text-xs font-bold text-slate-400">{form.description.length}/2000</span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-extrabold">Ngày thực hiện *
              <input type="date" value={form.scheduledDate} onChange={(event) => setField("scheduledDate", event.target.value)} min={toDateInputValue(new Date())} required disabled={!canEditCore} className="mt-2 min-h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-medium outline-none focus:border-[#007f95] focus:ring-2 focus:ring-[#cbe9ed] disabled:bg-slate-50" />
            </label>
            <label className="block text-sm font-extrabold">Giờ bắt đầu *
              <input type="time" value={form.startTime} onChange={(event) => setField("startTime", event.target.value)} required disabled={!canEditCore} className="mt-2 min-h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-medium outline-none focus:border-[#007f95] focus:ring-2 focus:ring-[#cbe9ed] disabled:bg-slate-50" />
            </label>
          </div>

          <label className="block text-sm font-extrabold">Địa điểm *
            <div className="relative mt-2">
              <AppIcon name="location" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input value={form.location} onChange={(event) => setField("location", event.target.value)} maxLength={255} required disabled={!canEditCore} placeholder="Tòa nhà, đường, phường hoặc khu vực cụ thể" className="min-h-14 w-full rounded-2xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-base font-medium outline-none focus:border-[#007f95] focus:ring-2 focus:ring-[#cbe9ed] disabled:bg-slate-50" />
            </div>
          </label>

          <div>
            <p className="text-sm font-extrabold">Ngân sách dự kiến *</p>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
              {(["HOURLY", "FIXED"] as BudgetType[]).map((type) => (
                <button key={type} type="button" disabled={!canEditCore} onClick={() => setField("budgetType", type)} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-extrabold transition ${form.budgetType === type ? "bg-white text-[#007f95] shadow-sm" : "text-slate-500"}`}>
                  {type === "HOURLY" ? "Theo giờ" : "Trọn gói"}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
              <label className="relative block">
                <span className="sr-only">Số tiền</span>
                <VndInput value={form.budgetAmount} onValueChange={(value) => setField("budgetAmount", value)} required disabled={!canEditCore} placeholder="150.000" className="min-h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-16 text-base font-extrabold outline-none focus:border-[#007f95] focus:ring-2 focus:ring-[#cbe9ed] disabled:bg-slate-50" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-400">VNĐ</span>
              </label>
              <label className="block text-sm font-extrabold">
                <span className="sr-only">Số người cần</span>
                <input type="number" min={minimumRequiredWorkers} step="1" value={form.requiredWorkers} onChange={(event) => setField("requiredWorkers", event.target.value)} required disabled={!canEdit} aria-label="Số người cần" className="min-h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-medium outline-none focus:border-[#007f95] focus:ring-2 focus:ring-[#cbe9ed] disabled:bg-slate-50" />
                <span className="mt-1 block text-xs font-bold text-slate-400">{hasActiveMatches ? `Chỉ được tăng từ ${minimumRequiredWorkers} người` : "Số người cần hỗ trợ"}</span>
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-extrabold">Hình ảnh <span className="font-medium text-slate-400">(Tối đa 5)</span></p>
              <span className="text-xs font-bold text-slate-400">{mediaCount}/{MAX_IMAGES}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 min-[520px]:grid-cols-3">
              {job?.media.map((media) => (
                <div key={media.id} className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  <button type="button" onClick={() => setPreviewImage({ url: media.url, name: media.originalName })} aria-label={`Xem lớn ảnh ${media.originalName}`} className="block h-full w-full cursor-zoom-in focus-visible:outline-4 focus-visible:outline-[#007f95]">
                    <img src={media.url} alt={media.originalName} className="h-full w-full object-contain" />
                  </button>
                  {canEdit && <button type="button" onClick={() => void removeExistingMedia(media.id)} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/65 text-white" aria-label="Xóa ảnh"><AppIcon name="close" className="h-4 w-4" /></button>}
                </div>
              ))}
              {previews.map((preview, index) => (
                <div key={`${preview.file.name}-${preview.file.lastModified}`} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  <button type="button" onClick={() => setPreviewImage({ url: preview.url, name: preview.file.name })} aria-label={`Xem lớn ảnh ${preview.file.name}`} className="block h-full w-full cursor-zoom-in focus-visible:outline-4 focus-visible:outline-[#007f95]">
                    <img src={preview.url} alt={preview.file.name} className="h-full w-full object-contain" />
                  </button>
                  <button type="button" onClick={() => setNewFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/65 text-white" aria-label="Bỏ ảnh đã chọn"><AppIcon name="close" className="h-4 w-4" /></button>
                </div>
              ))}
              {canEdit && mediaCount < MAX_IMAGES && (
                <label className="grid aspect-[4/3] cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-[#9ccbd2] bg-[#f3fafb] p-3 text-center text-[#007f95] transition hover:bg-[#e8f6f8]">
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} className="sr-only" />
                  <span><AppIcon name="image" className="mx-auto h-7 w-7" /><span className="mt-2 block text-sm font-extrabold">Tải ảnh lên</span><span className="mt-1 block text-[10px] font-bold text-slate-400">JPG, PNG, WEBP</span></span>
                </label>
              )}
            </div>
          </div>

          {message && <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${message.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>{message.text}</div>}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-28">
          <details className="hf-help">
            <summary>Trước khi đăng</summary>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-500">
              <li className="flex gap-2"><span className="font-extrabold text-[#007f95]">✓</span><span>Không ghi số điện thoại hoặc liên hệ ngoài nền tảng.</span></li>
              <li className="flex gap-2"><span className="font-extrabold text-[#007f95]">✓</span><span>Mô tả rõ thời gian, địa điểm và kết quả mong muốn.</span></li>
              <li className="flex gap-2"><span className="font-extrabold text-[#007f95]">✓</span><span>Bản nháp chỉ mình bạn nhìn thấy.</span></li>
            </ul>
          </details>

          {canEdit && (
            <div className="hf-form-actions grid gap-3">
              <button type="submit" disabled={Boolean(savingAction)} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[#8ec6cf] bg-white px-4 py-3 font-extrabold text-[#007f95] disabled:opacity-60">
                <AppIcon name="save" className="h-5 w-5" />
                {savingAction === "DRAFT" ? savingLabel : "Lưu bản nháp"}
              </button>
              <button type="button" onClick={() => void save("PUBLISH")} disabled={Boolean(savingAction)} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#007f95] px-4 py-3 font-extrabold text-white shadow-[0_12px_28px_rgba(0,127,149,0.24)] disabled:opacity-60">
                <AppIcon name="send" className="h-5 w-5" />
                {savingAction === "PUBLISH" ? savingLabel : job?.status === "PUBLISHED" ? "Lưu thay đổi" : "Đăng bài ngay"}
              </button>
            </div>
          )}
        </aside>
      </form>
    </div>
  );
}
