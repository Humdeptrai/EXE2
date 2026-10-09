import UserNotice from "../../../components/feedback/UserNotice";
import { useFeedback } from "../../../components/feedback/FeedbackContext";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../config/axios";
import type { ApiResponse } from "../../../types/api";
import type { PageResponse } from "../../../types/job";
import { getApiErrorMessage } from "../../auth/utils/apiError";
interface Report {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  resolution?: string;
}
export default function ReportsPage() {
  const { confirm } = useFeedback();
  const { user } = useAuth();
  const [q] = useSearchParams();
  const [type, setType] = useState(q.get("targetType") || "USER");
  const [target, setTarget] = useState(q.get("targetId") || user?.id || "");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<Report[]>([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  async function load(p: number) {
    try {
      const r = (
        await api.get<ApiResponse<PageResponse<Report>>>("/reports/mine", {
          params: { page: p },
        })
      ).data.result;
      setItems(r.content);
      setLast(r.last);
    } catch (e) {
      setMessageError(true);
      setMessage(getApiErrorMessage(e, "Không tải được báo cáo."));
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(page);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [page]);
  async function submit() {
    if (busy) return;
    const validationMessage = !target.trim()
      ? "Vui lòng nhập mã đối tượng cần báo cáo."
      : !reason.trim()
        ? "Vui lòng nhập nội dung báo cáo."
        : reason.trim().length > 2000
          ? "Nội dung báo cáo không được vượt quá 2.000 ký tự."
          : "";
    if (validationMessage) {
      await confirm({
        title: "Chưa thể gửi báo cáo",
        message: validationMessage,
        danger: true,
        acknowledgeOnly: true,
        confirmLabel: "Tôi đã hiểu",
      });
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await api.post("/reports", {
        targetType: type,
        targetId: target.trim(),
        reason: reason.trim(),
      });
      setReason("");
      setMessageError(false);
      setMessage("Đã gửi báo cáo đến bộ phận hỗ trợ.");
      await load(page);
    } catch (e) {
      setMessageError(true);
      setMessage(getApiErrorMessage(e, "Không thể gửi báo cáo."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="hf-page hf-page-reports mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-black">Báo cáo và hỗ trợ</h1>
      {message && (
        <UserNotice message={message} tone={messageError ? "error" : "success"} />
      )}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-4 rounded-3xl border bg-white p-5"
      >
        <label className="block font-bold">
          Đối tượng
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border px-3"
          >
            <option value="JOB">Bài đăng</option>
            <option value="USER">Người dùng</option>
            <option value="MATCH">Matching / phí kết nối</option>
          </select>
        </label>
        <label className="block font-bold">
          Mã đối tượng (đã điền nếu mở từ bài đăng / matching)
          <input
            required
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border px-3"
          />
        </label>
        <label className="block font-bold">
          Nội dung
          <textarea
            required
            maxLength={2000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-2 min-h-32 w-full rounded-xl border p-3"
          />
        </label>
        <button
          disabled={busy}
          className="min-h-12 w-full rounded-xl bg-[#007f95] font-bold text-white disabled:opacity-40"
        >
          {busy ? "Đang gửi..." : "Gửi báo cáo"}
        </button>
      </form>
      <section className="rounded-3xl border bg-white p-5">
        <h2 className="text-lg font-black">Báo cáo của bạn</h2>
        {items.map((r) => (
          <article key={r.id} className="border-b py-4">
            <p className="font-bold">
              {r.targetType} · {r.status}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{r.reason}</p>
            {r.resolution && (
              <p className="mt-2 text-sm text-[#007f95]">
                Phản hồi: {r.resolution}
              </p>
            )}
          </article>
        ))}
        <div className="mt-4 flex justify-between">
          <button disabled={!page} onClick={() => setPage((p) => p - 1)}>
            Trước
          </button>
          <span>{page + 1}</span>
          <button disabled={last} onClick={() => setPage((p) => p + 1)}>
            Tiếp
          </button>
        </div>
      </section>
    </div>
  );
}
