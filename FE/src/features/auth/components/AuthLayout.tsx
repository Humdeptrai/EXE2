import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";
import { HandsFreeLogo } from "../../../components/brand/HandsFreeLogo";
import "./auth-layout.css";

export function AuthLayout({ children, variant }: PropsWithChildren<{ variant: "login" | "register" }>) {
  return (
    <main className={`hf-auth hf-auth-${variant}`}>
      <img className="hf-auth-background" src="/images/handsfree-neighborhood.webp" alt="" aria-hidden="true" decoding="async" />
      <header className="hf-auth-topbar">
        <Link to="/" className="hf-auth-brand" aria-label="HandsFree — về trang chủ"><HandsFreeLogo compact /></Link>
        <Link className="hf-auth-back" to="/">Về trang chủ</Link>
      </header>
      <div className="hf-auth-shell">
        <aside className="hf-auth-story" aria-label="Cộng đồng HandsFree">
          <span className="hf-auth-eyebrow">KẾT NỐI TỪ NHỮNG VIỆC NHỎ</span>
          <h2>Thêm một đôi tay.<br />Thêm thời gian cho bạn.</h2>
          <p>Tìm người hỗ trợ khi bạn cần, tìm việc phù hợp khi bạn sẵn sàng.</p>
        </aside>
        <section className="hf-auth-panel">
          <div className="hf-auth-content">{children}</div>
        </section>
      </div>
    </main>
  );
}
