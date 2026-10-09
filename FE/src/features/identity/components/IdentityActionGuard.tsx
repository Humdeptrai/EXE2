import { useEffect, useRef } from "react";
import { useFeedback } from "../../../components/feedback/FeedbackContext";
import { IDENTITY_ACTION_REQUIRED_EVENT } from "../../../config/axios";

export default function IdentityActionGuard() {
  const { confirm } = useFeedback();
  const busy = useRef(false);
  useEffect(() => {
    const listener = (event: Event) => {
      if (busy.current) return;
      busy.current = true;
      const message = (event as CustomEvent<{ message?: string }>).detail?.message;
      void confirm({
        title: "Chưa đủ điều kiện đăng / nhận việc",
        message: message || "Bạn cần xác minh khuôn mặt, CCCD và hoàn thiện số điện thoại, nơi ở cùng thông tin hồ sơ trước khi đăng bài hoặc nhận việc. Vui lòng vào Hồ sơ để bổ sung.",
        confirmLabel: "Tôi đã hiểu", danger: true, acknowledgeOnly: true,
      }).finally(() => { busy.current = false; });
    };
    window.addEventListener(IDENTITY_ACTION_REQUIRED_EVENT, listener);
    return () => window.removeEventListener(IDENTITY_ACTION_REQUIRED_EVENT, listener);
  }, [confirm]);
  return null;
}
