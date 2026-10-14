import CounterpartIdentity from "../../identity/components/CounterpartIdentity";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import UserNotice from "../../../components/feedback/UserNotice";
import { useAuth } from "../../../context/AuthContext";
import { useChat } from "../../../context/ChatContext";
import { CHAT_FILE_ACCEPT, chatService, validateChatFile } from "../../../services/chatService";
import ChatAttachment from "../components/ChatAttachment";
import type { ChatConversation, ChatMessage } from "../../../types/chat";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import "../chat.css";
const EMOJIS = ["😀", "😊", "😂", "🥰", "😍", "😎", "🤔", "😅", "😢", "😭", "😮", "😡", "👍", "👎", "👏", "🙏", "🤝", "💪", "❤️", "💚", "🎉", "✅", "⭐", "🔥", "🐶", "🌸", "☕", "🎂", "👋", "🙌", "💯", "✨"];
function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]) {
  const map = new Map<string, ChatMessage>();
  for (const message of [...existing, ...incoming]) map.set(message.id, message);
  return [...map.values()].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime() || a.id.localeCompare(b.id));
}
export default function ChatRoomPage() {
  const { conversationId = "" } = useParams();
  return <ChatRoom key={conversationId} conversationId={conversationId} />;
}
function ChatRoom({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const { socketStatus, online, subscribe, refreshUnread } = useChat();
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [page, setPage] = useState(0);
  const [hasOlder, setHasOlder] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [sending, setSending] = useState(false);
  const [upload, setUpload] = useState(0);
  const [picker, setPicker] = useState(false);
  const [reacting, setReacting] = useState<Set<string>>(new Set());
  const textarea = useRef<HTMLTextAreaElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const active = useRef(true);
  const sendLock = useRef(false);
  const heartLocks = useRef(new Set<string>());
  const reading = useRef(false);
  const draft = useRef<{ id: string; content: string; file?: File } | null>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) { setPreview(""); return; }
    const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url);
  }, [file]);
  const markRead = useCallback(async () => {
    if (reading.current || document.visibilityState !== "visible" || !document.hasFocus()) return;
    reading.current = true;
    try { await chatService.markRead(conversationId); if (active.current) void refreshUnread(); }
    catch { /* Reconnect/focus will retry. */ }
    finally { reading.current = false; }
  }, [conversationId, refreshUnread]);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([chatService.getConversation(conversationId), chatService.getMessages(conversationId)])
      .then(([room, result]) => {
        if (cancelled) return;
        setConversation(room); setMessages(current => mergeMessages([...result.content].reverse(), current));
        setHasOlder(!result.last); void markRead();
      }).catch(requestError => { if (!cancelled) setError(getApiErrorMessage(requestError, "Không thể mở cuộc trò chuyện.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [conversationId, markRead]);
  useEffect(() => subscribe(event => {
    if (event.type !== "MESSAGE" && event.type !== "MESSAGE_UPDATED") return;
    if (event.message.conversationId !== conversationId) return;
    if (event.type === "MESSAGE_UPDATED") {
      setMessages(current => current.map(message => message.id === event.message.id ? event.message : message));
    } else {
      setMessages(current => mergeMessages(current, [event.message]));
      if (event.message.senderId !== user?.id) void markRead();
    }
  }), [subscribe, conversationId, user?.id, markRead]);
  useEffect(() => {
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const result = await chatService.getMessages(conversationId);
        if (active.current) { setMessages(current => mergeMessages(current, result.content)); void markRead(); }
      } catch { /* Preserve history while reconnecting. */ }
    };
    if (socketStatus === "CONNECTED") void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [socketStatus, conversationId, markRead]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "auto", block: "nearest" }); }, [messages.length]);
  async function older() {
    if (loadingOlder || !hasOlder) return;
    setLoadingOlder(true);
    const height = thread.current?.scrollHeight ?? 0;
    try { const result = await chatService.getMessages(conversationId, page + 1); if (!active.current) return;
      setMessages(current => mergeMessages(result.content, current)); setPage(page + 1); setHasOlder(!result.last);
      requestAnimationFrame(() => { if (thread.current) thread.current.scrollTop = thread.current.scrollHeight - height; });
    } catch (requestError) { setActionError(getApiErrorMessage(requestError, "Không thể tải tin nhắn cũ.")); }
    finally { if (active.current) setLoadingOlder(false); }
  }
  async function send() {
    const content = text.trim();
    if (sendLock.current || !conversation?.canSend || (!content && !file)) return;
    if (file) { const invalid = validateChatFile(file); if (invalid) { setActionError(invalid); return; } }
    if (!draft.current || draft.current.content !== content || draft.current.file !== file) draft.current = { id: crypto.randomUUID(), content, file };
    const request = draft.current;
    sendLock.current = true; setSending(true); setUpload(0); setActionError("");
    try {
      const message = await chatService.send(conversationId, request.id, request.content, request.file, percent => { if (active.current) setUpload(percent); });
      if (!active.current) return;
      setMessages(current => mergeMessages(current, [message])); setText(""); setFile(undefined); draft.current = null;
      if (input.current) input.current.value = ""; setPicker(false);
    } catch (requestError) { if (active.current) setActionError(getApiErrorMessage(requestError, "Chưa xác nhận được tin nhắn. Bấm gửi lại để kiểm tra; nội dung vẫn được giữ.")); }
    finally { sendLock.current = false; if (active.current) setSending(false); }
  }
  async function heart(message: ChatMessage) {
    if (heartLocks.current.has(message.id) || !conversation?.canSend) return;
    heartLocks.current.add(message.id); setReacting(new Set(heartLocks.current)); setActionError("");
    try { const result = await chatService.heart(conversationId, message.id, !(message.hearts ?? []).includes(user?.id ?? ""));
      if (active.current) setMessages(current => mergeMessages(current, [result]));
    } catch (requestError) { if (active.current) setActionError(getApiErrorMessage(requestError, "Không thể cập nhật cảm xúc.")); }
    finally { heartLocks.current.delete(message.id); if (active.current) setReacting(new Set(heartLocks.current)); }
  }
  function choose(next?: File) {
    if (!next) return;
    const invalid = validateChatFile(next); if (invalid) { setActionError(invalid); if (input.current) input.current.value = ""; return; }
    setFile(next); setActionError(""); draft.current = null;
  }
  if (loading) return <div className="hf-chat-empty">Đang tải tin nhắn…</div>;
  if (!conversation || error) return <div className="hf-chat-empty"><UserNotice error message={error || "Không thể mở cuộc trò chuyện."} /><Link to="/messages" className="hf-chat-control">Về Tin nhắn</Link></div>;
  const isOnline = online.has(conversation.counterpart.id);
  return <div className="hf-page hf-page-chat-room hf-chat-room mx-auto max-w-4xl">
    <section className="hf-chat-surface overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <Link to="/messages" aria-label="Quay lại" className="hf-chat-control"><AppIcon name="arrow-left" className="h-5 w-5" /></Link>
          <div className="relative shrink-0">
            {conversation.counterpart.avatarUrl ? <img src={conversation.counterpart.avatarUrl} alt={conversation.counterpart.fullName} className="h-11 w-11 rounded-full object-cover" /> : <div className="grid h-11 w-11 place-items-center rounded-full bg-[#dff2f5] font-black text-[#007f95]">{conversation.counterpart.fullName.charAt(0).toUpperCase()}</div>}
            {isOnline && <span aria-label="Đang hoạt động" className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />}
          </div>
          <div className="min-w-0 flex-1"><h1 className="truncate text-sm font-black sm:text-base">{conversation.counterpart.fullName}</h1><p className="truncate text-[11px] font-bold text-slate-400">{conversation.jobTitle}</p><p className={`text-[10px] font-bold ${isOnline ? "text-emerald-600" : "text-slate-400"}`}>{isOnline ? "Đang hoạt động" : "Hiện không online"}</p></div>
        </div>
        {conversation.chatUnlocked && <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-[#007f95]">Xem avatar và selfie đã xác minh</summary><CounterpartIdentity person={conversation.counterpart} /></details>}
      </header>
      <div ref={thread} className="hf-chat-thread h-[min(58dvh,620px)] overflow-y-auto bg-[#f7f9fc] px-3 py-4 sm:px-5" role="log" aria-label="Lịch sử trò chuyện">
        {hasOlder && <div className="mb-4 text-center"><button className="hf-chat-control" disabled={loadingOlder} onClick={() => void older()}>{loadingOlder ? "Đang tải…" : "Xem tin nhắn cũ hơn"}</button></div>}
        {!messages.length && <div className="hf-chat-empty"><AppIcon name="chat" className="h-8 w-8 text-[#007f95]" /><p>Bắt đầu trò chuyện</p></div>}
        <div className="space-y-3">{messages.map(message => {
          const mine = message.senderId === user?.id;
          const liked = (message.hearts ?? []).includes(user?.id ?? "");
          return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`hf-chat-bubble ${mine ? "hf-chat-bubble-mine" : ""}`}>
              {message.attachment && <ChatAttachment key={message.id} attachment={message.attachment} />}
              {message.content && <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-5">{message.content}</p>}
              <div className="hf-chat-message-meta"><time dateTime={message.sentAt}>{new Date(message.sentAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</time>
                <button type="button" aria-label={`${liked ? "Bỏ tim" : "Thả tim"} tin nhắn ${mine ? "của bạn" : "đối phương"}`} aria-pressed={liked} disabled={!conversation.canSend || reacting.has(message.id)} className={`hf-chat-heart ${liked ? "is-liked" : ""}`} onClick={() => void heart(message)}><AppIcon name="heart" className="h-4 w-4" />{(message.hearts?.length ?? 0) > 0 && <span>{message.hearts?.length}</span>}</button>
              </div>
            </div>
          </div>;
        })}</div><div ref={bottom} />
      </div>
      <footer className="hf-chat-composer border-t border-slate-100 bg-white p-3 sm:p-4">
        {actionError && <UserNotice error message={actionError} onClose={() => setActionError("")} className="mb-3" />}
        {socketStatus !== "CONNECTED" && <p className="mb-2 text-xs text-slate-500">Đang kết nối lại cập nhật trực tiếp. Bạn vẫn có thể gửi tin nhắn.</p>}
        {!conversation.canSend ? <UserNotice message="Matching không còn cho phép gửi tin nhắn. Lịch sử vẫn được giữ lại." /> : <>
          {file && <div className="hf-chat-selected">{preview && <img src={preview} alt="Ảnh sắp gửi" />}<span>{file.name}<small>{(file.size / 1024 / 1024).toFixed(1)} MB</small></span><button type="button" aria-label="Bỏ tệp đính kèm" disabled={sending} onClick={() => { setFile(undefined); draft.current = null; if (input.current) input.current.value = ""; }}>×</button></div>}
          <div className="hf-chat-tools"><input ref={input} type="file" accept={CHAT_FILE_ACCEPT} className="hidden" onChange={event => choose(event.target.files?.[0])} />
            <button className="hf-chat-control" aria-label="Đính kèm ảnh, video hoặc tệp" disabled={sending} onClick={() => input.current?.click()}><AppIcon name="image" className="h-5 w-5" /><span className="hidden sm:inline">Đính kèm</span></button>
            <div className="relative"><button className="hf-chat-control" aria-label="Chọn emoji" aria-expanded={picker} disabled={sending} onClick={() => setPicker(value => !value)}>😊</button>
              {picker && <div className="hf-chat-emojis" role="group" aria-label="Emoji"><button className="hf-chat-emoji-close" aria-label="Đóng emoji" onClick={() => setPicker(false)}>×</button>{EMOJIS.map(emoji => <button type="button" aria-label={`Emoji ${emoji}`} key={emoji} onClick={() => { const area = textarea.current; const start = area?.selectionStart ?? text.length; const end = area?.selectionEnd ?? text.length; const next = text.slice(0, start) + emoji + text.slice(end); if (next.length <= 2000) { setText(next); draft.current = null; requestAnimationFrame(() => { area?.focus(); area?.setSelectionRange(start + emoji.length, start + emoji.length); }); } }}>{emoji}</button>)}</div>}
            </div><small>Ảnh / PDF / TXT ≤ 10 MB · MP4 ≤ 50 MB</small>
          </div>
          <div className="flex items-end gap-2"><textarea ref={textarea} aria-label="Tin nhắn" value={text} onChange={event => { setText(event.target.value.slice(0, 2000)); draft.current = null; }} onKeyDown={event => { if (event.key === "Escape") setPicker(false); if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} rows={1} placeholder="Nhập tin nhắn…" disabled={sending} className="max-h-32 min-h-11 min-w-0 flex-1 resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-[#65aeb9] disabled:opacity-60" />
            <button type="button" disabled={sending || (!text.trim() && !file)} onClick={() => void send()} aria-label="Gửi tin nhắn" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#007f95] text-white disabled:opacity-40">{sending ? <span className="text-xs">…</span> : <AppIcon name="send" className="h-5 w-5" />}</button></div>
          {sending && <div className="hf-chat-upload" role="status"><progress max={100} value={file ? upload : undefined} /><span>{file && upload < 100 ? `Đang tải tệp ${upload}%` : "Đang lưu tin nhắn…"}</span></div>}
          <div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>Enter để gửi · Shift+Enter xuống dòng</span><span>{text.length}/2000</span></div>
        </>}
      </footer>
    </section>
  </div>;
}
