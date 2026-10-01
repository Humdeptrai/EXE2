import { EmptyArtwork } from "../../../components/ui/EmptyArtwork";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import { chatService } from "../../../services/chatService";
import { ChatSocketConnection, type ChatSocketStatus } from "../../../services/chatSocketService";
import type { ConversationPage } from "../../../types/chat";
import { getApiErrorMessage } from "../../auth/utils/apiError";

const emptyPage: ConversationPage = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
};

function formatChatTime(value: string | null) {
  if (!value) return "Chưa có tin nhắn";
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export default function MessagesPage() {
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<ConversationPage>(emptyPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socketStatus, setSocketStatus] = useState<ChatSocketStatus>("DISCONNECTED");

  const load = useCallback(async (selectedPage = page) => {
    setLoading(true);
    setError("");
    try {
      setResult(await chatService.getConversations(selectedPage, 20));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể tải danh sách tin nhắn."));
      setResult(emptyPage);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(page); }, 0);
    return () => window.clearTimeout(timer);
  }, [load, page]);

  useEffect(() => {
    const socket = new ChatSocketConnection({
      onStatusChange: setSocketStatus,
      onMessage: () => { void load(page); },
      onError: (socketError) => {
        if (socketError.code !== 50000) setError(socketError.message);
      },
    });
    socket.connect();
    return () => socket.disconnect();
  }, [load, page]);

  const unreadTotal = useMemo(
    () => result.content.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
    [result.content],
  );

  return (
    <div className="hf-page hf-page-messages space-y-5">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#779198] sm:text-xs">Cuộc trò chuyện</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Tin nhắn</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">Chat mở khi cả hai bên hoàn tất phí kết nối.</p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-500">
          <span className={`h-2.5 w-2.5 rounded-full ${socketStatus === "CONNECTED" ? "bg-emerald-500" : socketStatus === "CONNECTING" ? "bg-amber-400" : "bg-slate-300"}`} />
          {socketStatus === "CONNECTED" ? "Đã kết nối" : socketStatus === "CONNECTING" ? "Đang kết nối..." : "Đang kết nối lại"}
          {unreadTotal > 0 && <span className="rounded-full bg-[#007f95] px-2 py-0.5 text-white">{unreadTotal}</span>}
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      {loading ? (
        <div className="grid min-h-[45dvh] place-items-center rounded-3xl border border-slate-200 bg-white text-sm font-bold text-slate-500">Đang tải cuộc trò chuyện...</div>
      ) : result.content.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12"><EmptyArtwork />
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#edf7f9] text-[#007f95]"><AppIcon name="chat" className="h-8 w-8" /></div>
          <h2 className="mt-5 text-xl font-black">Chưa có cuộc trò chuyện</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Khi cả hai bên hoàn tất phí kết nối, chọn <strong>Nhắn tin</strong> để bắt đầu.</p>
        </section>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {result.content.map((conversation, index) => (
            <Link
              key={conversation.id}
              to={`/messages/${conversation.id}`}
              className={`flex min-h-24 items-center gap-3 p-4 transition hover:bg-slate-50 sm:p-5 ${index > 0 ? "border-t border-slate-100" : ""}`}
            >
              {conversation.counterpart.avatarUrl ? (
                <img src={conversation.counterpart.avatarUrl} alt={conversation.counterpart.fullName} className="h-13 w-13 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="grid h-13 w-13 shrink-0 place-items-center rounded-full bg-[#dff2f5] text-lg font-black text-[#007f95]">{conversation.counterpart.fullName.charAt(0).toUpperCase()}</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-black sm:text-base">{conversation.counterpart.fullName}</p>
                  <span className="shrink-0 text-[10px] font-bold text-slate-400 sm:text-xs">{formatChatTime(conversation.lastMessageAt)}</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] font-bold text-[#668189]">{conversation.jobTitle}</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className={`truncate text-sm ${conversation.unreadCount > 0 ? "font-extrabold text-slate-800" : "font-semibold text-slate-500"}`}>{conversation.lastMessagePreview || "Bắt đầu cuộc trò chuyện"}</p>
                  {conversation.unreadCount > 0 && <span className="grid min-h-6 min-w-6 shrink-0 place-items-center rounded-full bg-[#007f95] px-1.5 text-[10px] font-black text-white">{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</span>}
                </div>
              </div>
              <AppIcon name="chevron-right" className="h-5 w-5 shrink-0 text-slate-300" />
            </Link>
          ))}
        </div>
      )}

      {result.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button type="button" disabled={result.first} onClick={() => setPage((value) => Math.max(value - 1, 0))} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 disabled:opacity-40"><AppIcon name="chevron-left" className="h-5 w-5" /></button>
          <span className="text-sm font-extrabold text-slate-500">Trang {result.page + 1}/{result.totalPages}</span>
          <button type="button" disabled={result.last} onClick={() => setPage((value) => value + 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 disabled:opacity-40"><AppIcon name="chevron-right" className="h-5 w-5" /></button>
        </div>
      )}
    </div>
  );
}
