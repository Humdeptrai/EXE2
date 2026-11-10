import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { ConfirmOptions } from "./confirmation";
import { AppIcon } from "../ui/AppIcon";

export default function ConfirmDialog({ options, finish, errorPopup = false }: {
  options: ConfirmOptions; finish: (accepted: boolean) => void; errorPopup?: boolean;
}) {
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
  return createPortal(<dialog ref={ref} data-error-popup={errorPopup || undefined}
    className={`hf-confirm-dialog${options.acknowledgeOnly ? " hf-confirm-alert" : ""}`}
    role={options.acknowledgeOnly ? "alertdialog" : "dialog"} aria-labelledby={titleId} aria-describedby={messageId}
    onCancel={event => { event.preventDefault(); finish(false); }}>
    {options.acknowledgeOnly && <button type="button" className="hf-confirm-close" aria-label="Đóng thông báo" onClick={() => finish(false)}><AppIcon name="close" className="hf-notice-icon" /></button>}
    <div className={`hf-confirm-icon${options.danger ? " hf-confirm-danger" : ""}`}><AppIcon name="info" className="hf-notice-icon" /></div>
    <h2 id={titleId}>{options.title}</h2><p id={messageId}>{options.message}</p>
    <div className="hf-confirm-actions">
      {!options.acknowledgeOnly && <button type="button" autoFocus onClick={() => finish(false)}>{options.cancelLabel || "Hủy"}</button>}
      <button type="button" autoFocus={options.acknowledgeOnly} className={`hf-confirm-primary${options.danger ? " hf-confirm-danger-button" : ""}`} onClick={() => finish(true)}>{options.confirmLabel || "Xác nhận"}</button>
    </div>
  </dialog>, document.body);
}
