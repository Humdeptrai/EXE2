import { useRef } from "react";
import { applyPwaUpdate } from "./pwaRuntime";
import { usePwa } from "./usePwa";
import "./pwa.css";
export default function PwaStatus() {
  const state = usePwa();
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <div className="hf-pwa-status" aria-live="polite">
      {!state.online && <p className="hf-pwa-offline" role="status">Bạn đang mất kết nối. Các thao tác cần mạng sẽ chưa thực hiện được.</p>}
      {state.updateReady && <button type="button" className="hf-pwa-update" onClick={() => dialog.current?.showModal()}>Có phiên bản mới · Cập nhật</button>}
    </div>
    <dialog ref={dialog} className="hf-pwa-dialog" aria-labelledby="hf-pwa-update-title">
      <h2 id="hf-pwa-update-title">Cập nhật HandsFree</h2>
      <p>Ứng dụng sẽ tải lại trang. Hãy lưu thông tin đang nhập và hoàn tất thao tác đang thực hiện trước khi cập nhật.</p>
      {state.error && <p className="hf-pwa-error" role="alert">{state.error}</p>}
      <div className="hf-pwa-actions"><button type="button" disabled={state.updating} onClick={() => dialog.current?.close()}>Để sau</button><button type="button" className="hf-pwa-primary" disabled={state.updating || !state.online} onClick={applyPwaUpdate}>{state.updating ? "Đang cập nhật…" : "Cập nhật ngay"}</button></div>
    </dialog>
  </>;
}
