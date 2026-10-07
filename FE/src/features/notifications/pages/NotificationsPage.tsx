import UserNotice from "../../../components/feedback/UserNotice";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import { EmptyArtwork } from "../../../components/ui/EmptyArtwork";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import { useNotifications } from "../../../context/NotificationContext";
import { notificationService } from "../../../services/notificationService";
import type { NotificationItem, NotificationType } from "../../../types/notification";

function formatTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function typeLabel(type: NotificationType) {
  switch (type) {
    case "JOB_INTEREST_RECEIVED": return "Ứng viên";
    case "CANDIDATE_ACCEPTED": return "Matching";
    case "CANDIDATE_REJECTED": return "Ứng tuyển";
    case "PAYMENT_RECEIVED": return "Thanh toán";
    case "CONNECTION_SUCCEEDED": return "Kết nối";
    case "CHAT_MESSAGE_RECEIVED": return "Tin nhắn";
    case "RATING_RECEIVED": return "Đánh giá";
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { subscribeNotifications, socketStatus, markReadLocally, clearUnreadLocally } = useNotifications();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let active = true;
    notificationService.getNotifications(0, 50)
      .then((page) => {
        if (active) setItems((current) => {
          const loaded = new Map(page.content.map((item) => [item.id, item]));
          // Preserve events that arrived while the initial REST request was in flight.
          for (const item of current) loaded.set(item.id, item);
          return Array.from(loaded.values())
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
        });
      })
      .catch((error) => {
        if (active) setError(getApiErrorMessage(error, "Không thể tải thông báo lúc này."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => subscribeNotifications((notification) => {
    setItems((current) => {
      if (current.some((item) => item.id === notification.id)) return current;
      return [notification, ...current].slice(0, 50);
    });
  }), [subscribeNotifications]);

  const unreadInList = useMemo(() => items.filter((item) => !item.read).length, [items]);

  async function openNotification(item: NotificationItem) {
    if (!item.read) {
      try {
        const updated = await notificationService.markRead(item.id);
        setItems((current) => current.map((value) => value.id === item.id ? updated : value));
        markReadLocally(true);
      } catch {
        // Navigation is still useful even if read-state persistence fails temporarily.
      }
    }
    if (item.actionUrl) navigate(item.actionUrl);
  }

  async function markAllRead() {
    if (unreadInList === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await notificationService.markAllRead();
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => item.read ? item : { ...item, read: true, readAt: now }));
      clearUnreadLocally();
    } catch (error) {
      setError(getApiErrorMessage(error, "Không thể đánh dấu đã đọc. Vui lòng thử lại."));
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <section className="hf-page hf-page-notifications mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#e7f5f7] text-[#007f95]"><AppIcon name="bell" className="h-5 w-5" /></span>
            <div>
              <h1 className="text-xl font-extrabold sm:text-2xl">Thông báo</h1>
              <p className="text-xs font-bold text-slate-400">{socketStatus === "CONNECTED" ? "Đã kết nối" : "Đang cập nhật"}</p>
            </div>
          </div>
        </div>
        <button type="button" disabled={unreadInList === 0 || markingAll} onClick={() => void markAllRead()} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-extrabold text-[#007f95] disabled:opacity-40">
          {markingAll ? "Đang cập nhật..." : "Đọc tất cả"}
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm font-bold text-slate-400">Đang tải thông báo...</div>
      ) : error ? (
        <UserNotice message={error} error className="hf-notice-inset" />
      ) : items.length === 0 ? (
        <div className="hf-empty px-5 py-16 text-center"><EmptyArtwork variant="notification" />
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-400"><AppIcon name="bell" className="h-6 w-6" /></div>
          <p className="mt-4 font-extrabold">Chưa có thông báo</p>
          <p className="mt-1 text-sm text-slate-500">Matching, thanh toán, tin nhắn và đánh giá mới sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => void openNotification(item)} className={`flex w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-6 ${item.read ? "bg-white" : "bg-[#f2fbfc]"}`}>
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.read ? "bg-slate-200" : "bg-[#00a8bd]"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-extrabold text-slate-800">{item.title}</p>
                  <span className="shrink-0 text-[11px] font-bold text-slate-400">{formatTime(item.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.message}</p>
                <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{typeLabel(item.type)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
