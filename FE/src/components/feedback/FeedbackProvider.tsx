import { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FeedbackContext } from "./FeedbackContext";
import { Confirmation, type ConfirmOptions } from "./confirmation";
import UserNotice from "./UserNotice";
import ConfirmDialog from "./ConfirmDialog";
import ErrorPopup from "./ErrorPopup";
import "./feedback.css";

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
    <ErrorPopup blocked={Boolean(options)} />
  </FeedbackContext.Provider>;
}
