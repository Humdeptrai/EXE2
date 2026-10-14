import { useEffect, useRef, useState } from "react";
import { chatService } from "../../../services/chatService";
import type { ChatMessage } from "../../../types/chat";
import IdentityImageViewer from "../../../components/feedback/IdentityImageViewer";
import { getApiErrorMessage } from "../../auth/utils/apiError";
export default function ChatAttachment({ attachment }: { attachment: NonNullable<ChatMessage["attachment"]> }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const wrapper = useRef<HTMLDivElement>(null);
  const active = useRef(false);
  const loading = useRef(false);
  const objectUrl = useRef("");
  async function load(download = false) {
    if (loading.current) return;
    loading.current = true; setBusy(true); setError("");
    try {
      let next = objectUrl.current;
      if (!next) {
        const blob = await chatService.attachment(attachment.url);
        if (!active.current) return;
        next = URL.createObjectURL(new Blob([blob], { type: attachment.contentType }));
        objectUrl.current = next; setUrl(next);
      }
      if (download) { const link = document.createElement("a"); link.href = next; link.download = attachment.name; link.click(); }
    } catch (requestError) { if (active.current) setError(getApiErrorMessage(requestError, "Không thể tải tệp. Hãy thử lại.")); }
    finally { loading.current = false; if (active.current) setBusy(false); }
  }
  useEffect(() => {
    active.current = true;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && attachment.contentType.startsWith("image/")) { void load(); observer.disconnect(); }
    });
    if (wrapper.current) observer.observe(wrapper.current);
    return () => { active.current = false; observer.disconnect(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); objectUrl.current = ""; };
    // Each attachment is mounted with its message ID; immutable files never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={wrapper} className="hf-chat-attachment">
    {url && attachment.contentType.startsWith("image/") ? <IdentityImageViewer src={url} alt={attachment.name} className="hf-chat-image" />
      : url && attachment.contentType.startsWith("video/") ? <video src={url} controls playsInline preload="metadata" className="hf-chat-video" />
      : <button type="button" disabled={busy} className="hf-chat-file" onClick={() => void load(!attachment.contentType.startsWith("image/") && !attachment.contentType.startsWith("video/"))}>
        <span aria-hidden="true">{attachment.contentType.startsWith("video/") ? "▶" : attachment.contentType.startsWith("image/") ? "▧" : "↓"}</span>
        <span>{busy ? "Đang tải…" : attachment.name}<small>{(attachment.sizeBytes / 1024 / 1024).toFixed(1)} MB · {attachment.contentType.startsWith("video/") ? "Bấm để xem video" : "Bấm để mở / tải"}</small></span>
      </button>}
    {url && <button type="button" className="hf-chat-download" onClick={() => void load(true)}>Tải {attachment.name}</button>}
    {error && <p role="alert" className="hf-chat-media-error">{error}</p>}
  </div>;
}
