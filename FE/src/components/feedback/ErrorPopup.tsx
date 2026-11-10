import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { friendlyText } from "../../utils/errorMessages";
import { USER_ERROR_EVENT } from "../../utils/userErrors";

interface Popup { id: number; messages: string[] }

function invalidFieldMessage(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  const label = field.labels?.[0]?.cloneNode(true) as HTMLElement | undefined;
  label?.querySelectorAll("input,textarea,select,button,svg").forEach(node => node.remove());
  const name = label?.textContent?.replace(/\*/g, "").trim().replace(/\s+/g, " ").slice(0, 80) || "thông tin bắt buộc";
  if (field.validity.valueMissing) return `Vui lòng bổ sung ${name.toLocaleLowerCase("vi")} trước khi tiếp tục.`;
  if (field.validity.typeMismatch && field instanceof HTMLInputElement && field.type === "email") return "Email chưa đúng định dạng. Vui lòng kiểm tra lại, ví dụ ten@example.com.";
  if (field.validity.tooShort) return `${name} chưa đủ độ dài yêu cầu. Vui lòng kiểm tra hướng dẫn cạnh ô nhập.`;
  if (field.validity.tooLong) return `${name} vượt quá độ dài cho phép. Vui lòng rút ngắn nội dung.`;
  return `${name} chưa hợp lệ. Vui lòng kiểm tra định dạng hoặc giới hạn được hướng dẫn cạnh ô nhập.`;
}

export default function ErrorPopup({ blocked }: { blocked: boolean }) {
  const [queue, setQueue] = useState<Popup[]>([]);
  const sequence = useRef(0);
  useEffect(() => {
    // Existing inline alerts remain the source of truth for local validation,
    // camera and OCR errors, including failures returned in successful HTTP calls.
    const seen = new WeakMap<Element, string>();
    const recent = new Map<string, number>();
    const pending = new Set<string>();
    let attempt = 0;
    let timer: number | undefined;
    const enqueue = (raw: string) => {
      if (!raw.trim()) return;
      const message = friendlyText(raw);
      // Repeated background polling must not reopen a dismissed error. A new
      // click/submit/keyboard action allows the same failure to be shown again.
      if (recent.get(message) === attempt) return;
      pending.add(message);
      if (timer !== undefined) return;
      // A failed submit can mark several fields and show an API notice in the
      // same render. Combine that burst into one closeable popup.
      timer = window.setTimeout(() => {
        timer = undefined;
        const messages = [...pending]; pending.clear();
        messages.forEach(value => recent.set(value, attempt));
        while (recent.size > 64) recent.delete(recent.keys().next().value!);
        const id = ++sequence.current;
        setQueue(current => {
          const unique = messages.filter(value => !current.some(item => item.messages.includes(value)));
          return unique.length && current.length < 5 ? [...current, { id, messages: unique }] : current;
        });
      }, 30);
    };
    const scan = () => {
      document.querySelectorAll('[role="alert"]').forEach(element => {
        if (element.closest('[data-error-popup],[hidden],[aria-hidden="true"]')) return;
        const dialog = element.closest("dialog");
        if (dialog && !dialog.open) return;
        const content = (element.querySelector("p") || element).cloneNode(true) as Element;
        content.querySelectorAll("button,input,select,textarea,svg").forEach(node => node.remove());
        const text = content.textContent?.trim() || "";
        if (!text) { seen.delete(element); return; }
        if (seen.get(element) === text) return;
        seen.set(element, text); enqueue(text);
      });
    };
    const receive = (event: Event) => {
      const message = (event as CustomEvent<{ message?: unknown }>).detail?.message;
      if (typeof message === "string") enqueue(message);
    };
    const invalid = (event: Event) => {
      const field = event.target;
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) enqueue(invalidFieldMessage(field));
    };
    const expired = () => enqueue("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.");
    const newAttempt = (event: Event) => {
      const target = event.target as Element | null;
      if (typeof target?.closest === "function" && target.closest('[role="alertdialog"]')) return;
      if (event.type === "keydown" && !["Enter", " "].includes((event as KeyboardEvent).key)) return;
      attempt++;
    };
    const clear = () => {
      window.clearTimeout(timer); timer = undefined; pending.clear(); recent.clear(); setQueue([]);
    };
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener(USER_ERROR_EVENT, receive);
    window.addEventListener("auth-session-expired", expired);
    window.addEventListener("handsfree:session-changed", clear);
    document.addEventListener("invalid", invalid, true);
    document.addEventListener("click", newAttempt, true);
    document.addEventListener("submit", newAttempt, true);
    document.addEventListener("keydown", newAttempt, true);
    scan();
    return () => {
      observer.disconnect(); window.clearTimeout(timer);
      window.removeEventListener(USER_ERROR_EVENT, receive);
      window.removeEventListener("auth-session-expired", expired);
      window.removeEventListener("handsfree:session-changed", clear);
      document.removeEventListener("invalid", invalid, true);
      document.removeEventListener("click", newAttempt, true);
      document.removeEventListener("submit", newAttempt, true);
      document.removeEventListener("keydown", newAttempt, true);
    };
  }, []);
  if (blocked || !queue.length) return null;
  const current = queue[0];
  const message = current.messages.slice(0, 3).join("\n\n") + (current.messages.length > 3 ? "\n\nVui lòng kiểm tra thêm các mục được đánh dấu trên trang." : "");
  return <ConfirmDialog key={current.id} errorPopup
    options={{ title: "Chưa thể hoàn tất thao tác", message, danger: true, acknowledgeOnly: true, confirmLabel: "Đóng" }}
    finish={() => setQueue(items => items.slice(1))} />;
}
