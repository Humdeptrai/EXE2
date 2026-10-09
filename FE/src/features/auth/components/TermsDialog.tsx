import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export default function TermsDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <dialog ref={dialogRef} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-3xl border border-[#dce8eb] bg-white p-5 text-[#263e45] shadow-xl backdrop:bg-black/40 sm:p-8">
      <h2 id={titleId} className="text-2xl font-extrabold text-[#006b82]">Điều khoản &amp; Chính sách</h2>
      <div className="mt-5 space-y-5 text-sm leading-7 sm:text-base">
        <section>
          <h3 className="font-bold">Sử dụng HandsFree</h3>
          <p>HandsFree kết nối người cần hỗ trợ và người nhận việc. Bạn cần cung cấp thông tin tài khoản, hồ sơ và công việc chính xác. Hai bên trao đổi và thống nhất nội dung công việc, thời gian, địa điểm và tiền công.</p>
        </section>
        <section>
          <h3 className="font-bold">Xác minh và quyền riêng tư</h3>
          <p>Để đăng hoặc nhận việc, bạn cần hoàn thiện hồ sơ và xác minh khuôn mặt, selfie cùng CCCD hai mặt. Bước xác minh có yêu cầu đồng ý xử lý dữ liệu riêng. Số và ảnh CCCD chỉ chủ tài khoản và ADMIN được xem; người dùng khác và STAFF không được xem.</p>
          <p>Avatar và selfie xác minh là hai ảnh riêng. Selfie cùng thông tin liên hệ được mở cho đối tác trong matching khi đáp ứng điều kiện xác minh và cả hai hoàn tất phí kết nối.</p>
        </section>
        <section>
          <h3 className="font-bold">Phí kết nối và hỗ trợ</h3>
          <p>Phí kết nối được hiển thị tại matching trước khi xác nhận trừ tiền từ ví. Phí này không bao gồm tiền công trả cho người nhận việc. Bạn có thể theo dõi lịch sử ví và gửi báo cáo hoặc yêu cầu hỗ trợ trong ứng dụng.</p>
        </section>
      </div>
      <button type="button" autoFocus onClick={onClose}
        className="mt-6 min-h-12 w-full rounded-xl bg-[#007f95] px-5 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007f95]">Đóng</button>
    </dialog>, document.body,
  );
}
