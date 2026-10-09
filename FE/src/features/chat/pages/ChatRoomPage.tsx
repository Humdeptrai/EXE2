import CounterpartIdentity from "../../identity/components/CounterpartIdentity";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import { useAuth } from "../../../context/AuthContext";
import { chatService } from "../../../services/chatService";
import { ChatSocketConnection, type ChatSocketStatus } from "../../../services/chatSocketService";
import type { ChatConversation, ChatMessage } from "../../../types/chat";
import { getApiErrorMessage } from "../../auth/utils/apiError";

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]) {
  const map = new Map<string, ChatMessage>();
  for (const message of [...existing, ...incoming]) map.set(message.id, message);
  return Array.from(map.values()).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}

export default function ChatRoomPage() {
  const { conversationId = "" } = useParams();
  const { user } = useAuth();
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagePage, setMessagePage] = useState(0);
  const [hasOlder, setHasOlder] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState("");
  const [socketError, setSocketError] = useState("");
  const [socketStatus, setSocketStatus] = useState<ChatSocketStatus>("DISCONNECTED");
  const socketRef = useRef<ChatSocketConnection | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const markRead = useCallback(async () => {
    if (!conversationId) return;
    try {
      await chatService.markRead(conversationId);
    } catch {
      // Reading the conversation should not fail only because the read marker could not be persisted.
    }
  }, [conversationId]);

  const loadInitial = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    setError("");
    try {
      const [conversationResult, messageResult] = await Promise.all([
        chatService.getConversation(conversationId),
        chatService.getMessages(conversationId, 0, 50),
      ]);
      setConversation(conversationResult);
      setMessages([...messageResult.content].reverse());
      setMessagePage(0);
      setHasOlder(!messageResult.last);
      void markRead();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể tải cuộc trò chuyện."));
    } finally {
      setLoading(false);
    }
  }, [conversationId, markRead]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadInitial(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadInitial]);

  useEffect(() => {
    if (!conversationId) return;
    const socket = new ChatSocketConnection({
      onStatusChange: (status) => {
        setSocketStatus(status);
        if (status === "CONNECTED") setSocketError("");
      },
      onError: (nextError) => setSocketError(nextError.message),
      onMessage: (event) => {
        if (event.type !== "MESSAGE" || event.message.conversationId !== conversationId) return;
        setMessages((current) => mergeMessages(current, [event.message]));
        setConversation((current) => current ? {
          ...current,
          lastMessageAt: event.message.sentAt,
          lastMessagePreview: event.message.content.replace(/\s+/g, " ").trim().slice(0, 160),
          unreadCount: 0,
        } : current);
        if (event.message.senderId !== user?.id) void markRead();
      },
    });
    socketRef.current = socket;
    socket.connect();
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversationId, markRead, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  }, [messages.length]);

  const canSend = Boolean(conversation?.canSend && socketStatus === "CONNECTED");
  const statusLabel = useMemo(() => {
    if (!conversation?.canSend) return "Chat chỉ đọc";
    if (socketStatus === "CONNECTED") return "Đã kết nối";
    if (socketStatus === "CONNECTING") return "Đang kết nối...";
    return "Đang kết nối lại";
  }, [conversation?.canSend, socketStatus]);

  async function loadOlder() {
    if (!hasOlder || loadingOlder || !conversationId) return;
    setLoadingOlder(true);
    try {
      const nextPage = messagePage + 1;
      const result = await chatService.getMessages(conversationId, nextPage, 50);
      setMessages((current) => mergeMessages([...result.content].reverse(), current));
      setMessagePage(nextPage);
      setHasOlder(!result.last);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể tải tin nhắn cũ hơn."));
    } finally {
      setLoadingOlder(false);
    }
  }

  function send() {
    const content = text.trim();
    if (!content || !canSend || !conversationId) return;
    setSocketError("");
    const sent = socketRef.current?.sendMessage({
      conversationId,
      clientMessageId: crypto.randomUUID(),
      content,
    });
    if (!sent) {
      setSocketError("Realtime chưa sẵn sàng. Vui lòng chờ kết nối lại rồi gửi tiếp.");
      return;
    }
    setText("");
  }

  if (loading) {
    return <div className="grid min-h-[60dvh] place-items-center rounded-3xl border border-slate-200 bg-white text-sm font-bold text-slate-500">Đang tải tin nhắn...</div>;
  }

  if (!conversation || error) {
    return (
        <section className="hf-page hf-page-chat-room mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500"><AppIcon name="info" className="h-7 w-7" /></div>
          <h1 className="mt-4 text-xl font-black">Không thể mở cuộc trò chuyện</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{error || "Phòng chat không tồn tại hoặc bạn không có quyền truy cập."}</p>
          <Link to="/messages" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#007f95] px-5 text-sm font-extrabold text-white"><AppIcon name="arrow-left" className="h-4 w-4" /> Về Tin nhắn</Link>
        </section>
    );
  }

  return (
      <div className="hf-page hf-page-chat-room hf-chat-room mx-auto max-w-4xl">
        <section className="hf-chat-surface overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <Link to="/messages" aria-label="Quay lại" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500"><AppIcon name="arrow-left" className="h-5 w-5" /></Link>
              {conversation.counterpart.avatarUrl ? (
                  <img src={conversation.counterpart.avatarUrl} alt={conversation.counterpart.fullName} className="h-11 w-11 shrink-0 rounded-full object-cover" />
              ) : (
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#dff2f5] font-black text-[#007f95]">{conversation.counterpart.fullName.charAt(0).toUpperCase()}</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black sm:text-base">{conversation.counterpart.fullName}</p>
                <p className="truncate text-[11px] font-bold text-slate-400">{conversation.jobTitle}</p>
              </div>
              <div className="hidden shrink-0 items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-[10px] font-extrabold text-slate-500 min-[430px]:flex">
                <span className={`h-2 w-2 rounded-full ${socketStatus === "CONNECTED" && conversation.canSend ? "bg-emerald-500" : socketStatus === "CONNECTING" ? "bg-amber-400" : "bg-slate-300"}`} />
                {statusLabel}
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] font-bold text-slate-400 min-[430px]:hidden">{statusLabel}</p>
            {conversation.chatUnlocked && <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-[#007f95]">Xem avatar và selfie đã xác minh</summary><CounterpartIdentity person={conversation.counterpart} /></details>}
          </header>

          <div className="hf-chat-thread h-[min(58dvh,620px)] overflow-y-auto bg-[#f7f9fc] px-3 py-4 sm:px-5">
            {hasOlder && (
                <div className="mb-4 text-center">
                  <button type="button" disabled={loadingOlder} onClick={() => void loadOlder()} className="min-h-9 rounded-full border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-500 disabled:opacity-50">{loadingOlder ? "Đang tải..." : "Xem tin nhắn cũ hơn"}</button>
                </div>
            )}

            {messages.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#007f95] shadow-sm"><AppIcon name="chat" className="h-7 w-7" /></div>
                    <p className="mt-4 font-black">Bắt đầu trò chuyện</p>
                    <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">Trao đổi lịch làm việc và những điều cần chuẩn bị.</p>
                  </div>
                </div>
            ) : (
                <div className="space-y-2.5">
                  {messages.map((message) => {
                    const mine = message.senderId === user?.id;
                    return (
                        <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 sm:max-w-[70%] ${mine ? "rounded-br-md bg-[#007f95] text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}>
                            <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-5">{message.content}</p>
                            <p className={`mt-1 text-right text-[9px] font-bold ${mine ? "text-white/70" : "text-slate-400"}`}>{formatMessageTime(message.sentAt)}</p>
                          </div>
                        </div>
                    );
                  })}
                </div>
            )}
            <div ref={bottomRef} />
          </div>

          <footer className="hf-chat-composer border-t border-slate-100 bg-white p-3 sm:p-4">
            {socketError && <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">{socketError}</div>}
            {!conversation.canSend ? (
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-xs font-bold text-slate-500">Matching không còn ở trạng thái cho phép gửi tin nhắn. Lịch sử vẫn được giữ lại.</div>
            ) : (
                <div className="flex items-end gap-2">
              <textarea
                  aria-label="Tin nhắn"
                  value={text}
                  onChange={(event) => setText(event.target.value.slice(0, 2000))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder={socketStatus === "CONNECTED" ? "Nhập tin nhắn..." : "Đang chờ realtime kết nối..."}
                  disabled={socketStatus !== "CONNECTED"}
                  className="max-h-32 min-h-11 flex-1 resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#65aeb9] focus:bg-white disabled:opacity-60"
              />
                  <button type="button" onClick={send} disabled={!text.trim() || !canSend} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#007f95] text-white shadow-sm disabled:opacity-40" aria-label="Gửi tin nhắn"><AppIcon name="send" className="h-5 w-5" /></button>
                </div>
            )}
            <div className="mt-2 flex justify-between gap-3 px-1 text-[9px] font-bold text-slate-400"><span>Enter để gửi · Shift+Enter xuống dòng</span><span>{text.length}/2000</span></div>
          </footer>
        </section>
      </div>
  );
}