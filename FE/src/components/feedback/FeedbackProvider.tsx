import { type PropsWithChildren, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FeedbackContext } from "./FeedbackContext";
import { Confirmation, type ConfirmOptions } from "./confirmation";
import UserNotice from "./UserNotice";
import { AppIcon } from "../ui/AppIcon";
import "./feedback.css";

function ConfirmDialog({ options, finish }: { options: ConfirmOptions; finish: (accepted: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<dialog ref={ref} className="hf-confirm-dialog" aria-labelledby={titleId} aria-describedby={messageId}
    onCancel={(event) => { event.preventDefault(); finish(false); }}>
    <div className={`hf-confirm-icon${options.danger ? " hf-confirm-danger" : ""}`}><AppIcon name="info" className="hf-notice-icon" /></div>
    <h2 id={titleId}>{options.title}</h2><p id={messageId}>{options.message}</p>
    <div className="hf-confirm-actions">
      <button type="button" autoFocus onClick={() => finish(false)}>Hủy</button>
      <button type="button" className={`hf-confirm-primary${options.danger ? " hf-confirm-danger-button" : ""}`} onClick={() => finish(true)}>{options.confirmLabel || "Xác nhận"}</button>
    </div>
  </dialog>, document.body);
}

export default function FeedbackProvider({ children }: PropsWithChildren) {
  const [coordinator] = useState(() => new Confirmation());
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null);
  const sequence = useRef(0);
  useEffect(() => coordinator.subscribe(setOptions), [coordinator]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 7000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const confirm = useCallback((next: ConfirmOptions) => coordinator.request(next), [coordinator]);
  const finish = useCallback((accepted: boolean) => coordinator.finish(accepted), [coordinator]);
  const notify = useCallback((message: string) => setNotice({ id: ++sequence.current, message }), []);
  const value = useMemo(() => ({ confirm, notify }), [confirm, notify]);
  return <FeedbackContext.Provider value={value}>{children}
    {options && <ConfirmDialog options={options} finish={finish} />}
    {notice && <div className="hf-user-toast"><UserNotice key={notice.id} message={notice.message} error onClose={() => setNotice(null)} /></div>}
  </FeedbackContext.Provider>;
}
