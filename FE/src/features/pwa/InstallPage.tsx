import { useState } from "react";
import { Link } from "react-router-dom";
import { HandsFreeLogo } from "../../components/brand/HandsFreeLogo";
import { installPwa } from "./pwaRuntime";
import { usePwa } from "./usePwa";
import "./pwa.css";
export default function InstallPage() {
  const state = usePwa();
  const [busy, setBusy] = useState(false);
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const install = async () => { setBusy(true); try { await installPwa(); } finally { setBusy(false); } };
  return <main className="hf-pwa-install">
    <Link to="/" aria-label="Trang chủ"><HandsFreeLogo /></Link>
    <section className="hf-pwa-card">
      <img className="hf-pwa-app-icon" src="/icons/icon-192.png" width="80" height="80" alt="HandsFree" />
      <p className="hf-pwa-eyebrow">HANDSFREE TRÊN ĐIỆN THOẠI</p>
      <h1>{state.installed ? "Bạn đang dùng ứng dụng HandsFree" : "Việc nhỏ, luôn trong tầm tay"}</h1>
      <p>Mở HandsFree ngay từ màn hình chính, dùng trong cửa sổ riêng và tiếp tục tìm việc, đăng bài hay trò chuyện.</p>
      {state.installed ? <p className="hf-pwa-success">HandsFree đã được mở ở chế độ ứng dụng.</p> : <>
        {state.prompt && <button className="hf-pwa-primary hf-pwa-install-button" disabled={busy} type="button" onClick={() => void install()}>{busy ? "Đang mở cài đặt…" : "Cài HandsFree"}</button>}
        <h2>{ios ? "Cài trên iPhone / iPad" : "Cài trên Android"}</h2>
        <ol>{ios ? <><li>Mở website này bằng Safari.</li><li>Nhấn <strong>Chia sẻ</strong>, chọn <strong>Thêm vào Màn hình chính</strong>.</li><li>Nếu có mục <strong>Mở dưới dạng ứng dụng web</strong>, hãy bật rồi nhấn <strong>Thêm</strong>.</li></> : <><li>Mở website này bằng Chrome trên điện thoại.</li><li>Nhấn <strong>Cài HandsFree</strong> khi nút xuất hiện, hoặc mở menu <strong>⋮ → Cài đặt ứng dụng / Thêm vào Màn hình chính</strong>.</li><li>Chọn cài đặt và mở icon HandsFree trên màn hình chính.</li></>}</ol>
        <p className="hf-pwa-hint">Nếu bạn đã tạo lối tắt từ phiên bản cũ, xóa lối tắt đó rồi cài lại sau khi website được cập nhật. Nếu đang mở trong ứng dụng nhắn tin, hãy mở bằng trình duyệt bên ngoài.</p>
      </>}
      {state.error && <p className="hf-pwa-error" role="alert">{state.error}</p>}
      <p className="hf-pwa-hint">Cần kết nối mạng để đăng nhập, đăng / nhận việc, nạp tiền, nhắn tin và xác minh. Khi được hỏi, cho phép camera để quét khuôn mặt.</p>
      <Link className="hf-pwa-back" to="/">Tiếp tục dùng HandsFree →</Link>
    </section>
  </main>;
}
