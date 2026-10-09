import { useState } from "react";
import { Link } from "react-router-dom";
import { HandsFreeLogo } from "../../../components/brand/HandsFreeLogo";
import { AppIcon } from "../../../components/ui/AppIcon";
import { useAuth } from "../../../context/AuthContext";
import "./landing.css";

const categories = [
  { number: "01", name: "Nhà cửa", description: "Dọn dẹp, giặt đồ, sắp xếp không gian.", icon: "home" as const, color: "peach" },
  { number: "02", name: "Thú cưng", description: "Một người đồng hành cho bạn nhỏ.", icon: "heart" as const, color: "sage" },
  { number: "03", name: "Giao hàng", description: "Mua hộ, nhận hàng, chuyển đồ.", icon: "briefcase" as const, color: "yellow" },
  { number: "04", name: "Sửa chữa", description: "Hỗ trợ sửa chữa nhỏ và lắp đặt cơ bản.", icon: "edit" as const, color: "blue" },
  { number: "05", name: "Học tập", description: "In tài liệu và hỗ trợ việc học.", icon: "bookmark" as const, color: "lavender" },
];
const questions = [
  { question: "HandsFree dành cho ai?", answer: "Cho người cần hỗ trợ những công việc ngắn hạn và người muốn tìm việc phù hợp với thời gian, kỹ năng của mình. Bạn có thể chuyển giữa chế độ thuê việc và nhận việc trong cùng một tài khoản." },
  { question: "Tôi bắt đầu thuê người như thế nào?", answer: "Tạo tài khoản, chọn chế độ thuê việc và đăng nhu cầu với lịch, địa điểm, ngân sách. Khi có ứng viên quan tâm, bạn xem hồ sơ và quyết định chấp nhận người phù hợp." },
  { question: "Tôi có thể trao đổi với đối phương khi nào?", answer: "Sau khi được chấp nhận và cả hai phía hoàn tất phí kết nối, phòng chat của công việc được mở. Bạn có thể trao đổi trực tiếp và xem lại lịch sử tin nhắn." },
  { question: "Phí kết nối được tính như thế nào?", answer: "Bạn nạp tiền qua payOS vào ví để trả phí mở liên hệ. Phí mặc định là 10.000đ cho người thuê và 5.000đ cho người nhận việc, có thể được điều chỉnh; số tiền áp dụng được hiển thị trước khi xác nhận. Ngân sách công việc là khoản riêng." },
  { question: "Tôi tìm việc và theo dõi kết quả ở đâu?", answer: "Chuyển sang chế độ nhận việc, hoàn thiện hồ sơ, khám phá công việc và bày tỏ quan tâm. Trong tài khoản, bạn có thể theo dõi công việc đã lưu, mức độ quan tâm và các matching được chấp nhận." },
];

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h16m-6-6 6 6-6 6"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ConnectionArtwork({ provider }: { provider: boolean }) {
  return <figure className="hf-artwork hf-artwork-photo"><img src="/images/handsfree-community.webp" alt="Minh họa cộng đồng cùng hỗ trợ mua đồ, chăm thú cưng và việc nhà" width="960" height="720" decoding="async" /><figcaption>{provider ? "Một công việc phù hợp. Một kết nối mới." : "Cùng nhau, những việc nhỏ nhẹ hơn."}</figcaption></figure>;
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [provider, setProvider] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const startTo = isAuthenticated ? "/home" : "/register";
  const steps = provider
    ? [ ["Tạo hồ sơ của bạn", "Giới thiệu bản thân, khu vực và những việc bạn có thể hỗ trợ."], ["Tìm việc phù hợp", "Khám phá, lưu công việc và gửi mức độ quan tâm của bạn."], ["Kết nối & trao đổi", "Được chấp nhận, hoàn tất phí kết nối và trao đổi qua chat."] ]
    : [ ["Chia sẻ việc cần làm", "Đăng nhu cầu, thời gian, địa điểm và ngân sách của bạn."], ["Chọn người phù hợp", "Xem hồ sơ và quyết định giữa những ứng viên quan tâm."], ["Kết nối & trao đổi", "Hai phía hoàn tất phí kết nối, rồi trao đổi chi tiết qua chat."] ];

  return (
    <div className="hf-landing">
      <a className="hf-skip" href="#main-content">Đến nội dung chính</a>
      <header className="hf-header">
        <div className="hf-container hf-header-inner">
          <Link to="/" aria-label="HandsFree - Trang chủ" className="hf-logo-link"><HandsFreeLogo compact /></Link>
          <nav className="hf-desktop-nav" aria-label="Điều hướng chính"><a href="#how-it-works">Cách hoạt động</a><a href="#categories">Việc bạn cần</a><a href="#faq">Câu hỏi thường gặp</a></nav>
          <div className="hf-header-actions"><Link className="hf-login" to={isAuthenticated ? "/home" : "/login"}>{isAuthenticated ? "Tài khoản" : "Đăng nhập"}</Link><Link className="hf-button hf-button-small" to={startTo}>{isAuthenticated ? "Vào ứng dụng" : "Bắt đầu"}<Arrow /></Link><button className="hf-menu-button" type="button" aria-label={menuOpen ? "Đóng menu" : "Mở menu"} aria-expanded={menuOpen} aria-controls="landing-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}><AppIcon name={menuOpen ? "close" : "menu"} /></button></div>
        </div>
        {menuOpen && <nav className="hf-mobile-nav" id="landing-mobile-menu" aria-label="Điều hướng trên điện thoại"><a href="#how-it-works" onClick={() => setMenuOpen(false)}>Cách hoạt động</a><a href="#categories" onClick={() => setMenuOpen(false)}>Việc bạn cần</a><a href="#faq" onClick={() => setMenuOpen(false)}>Câu hỏi thường gặp</a></nav>}
      </header>

      <main id="main-content">
        <section className="hf-hero hf-container">
          <div className="hf-hero-copy">
            <div className="hf-eyebrow"><span className="hf-eyebrow-line" /> KẾT NỐI CHO NHỮNG VIỆC THƯỜNG NGÀY</div>
            <h1>Bớt việc nhỏ.<br />Thêm thời gian<br /><span className="hf-highlight">cho cuộc sống.<svg viewBox="0 0 440 18" preserveAspectRatio="none" aria-hidden="true"><path d="M3 12Q220-7 437 9" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" /></svg></span></h1>
            <p className="hf-hero-description">Tìm người hỗ trợ. Tìm việc phù hợp. Thêm thời gian cho điều bạn yêu thích.</p>
            <div className="hf-role-picker" role="group" aria-label="Nhu cầu của bạn"><button type="button" aria-pressed={!provider} className={!provider ? "active" : ""} onClick={() => setProvider(false)}><AppIcon name="users" /> Tôi cần hỗ trợ</button><button type="button" aria-pressed={provider} className={provider ? "active" : ""} onClick={() => setProvider(true)}><AppIcon name="briefcase" /> Tôi muốn tìm việc</button></div>
            <div className="hf-hero-actions"><Link className="hf-button" to={startTo}>{isAuthenticated ? "Đến không gian của bạn" : provider ? "Bắt đầu tìm việc" : "Bắt đầu tìm người"}<Arrow /></Link><a className="hf-text-link" href="#how-it-works">Khám phá cách hoạt động <Arrow diagonal /></a></div>
            <p className="hf-hero-note"><AppIcon name="check" /> Một tài khoản, linh hoạt cả hai vai trò.</p>
          </div>
          <ConnectionArtwork provider={provider} />
        </section>

        <section className="hf-value-strip" aria-label="Những điểm nổi bật"><div className="hf-container"><span><AppIcon name="calendar" /> Công việc ngắn hạn</span><span><AppIcon name="users" /> Chủ động chọn kết nối</span><span><AppIcon name="chat" /> Trao đổi trực tiếp</span><span><AppIcon name="star" /> Đánh giá sau kết nối</span></div></section>

        <section id="categories" className="hf-section hf-container">
          <div className="hf-section-heading"><div><p className="hf-eyebrow">NHỮNG VIỆC NHỎ, GIÁ TRỊ LỚN</p><h2>Bạn cần thêm một đôi tay?</h2></div><p>Những nhu cầu quen thuộc.<br />Một cách kết nối mới.</p></div>
          <div className="hf-category-grid">{categories.map((category) => <Link to={startTo} key={category.name} className={`hf-category hf-${category.color}`}><div className="hf-category-top"><span>{category.number}</span><Arrow diagonal /></div><AppIcon name={category.icon} className="hf-category-icon" /><h3>{category.name}</h3><p>{category.description}</p></Link>)}</div>
        </section>

        <section id="how-it-works" className="hf-how-section"><div className="hf-container">
          <div className="hf-section-heading"><div><p className="hf-eyebrow">ĐƠN GIẢN TỪ BƯỚC ĐẦU TIÊN</p><h2>Một nhu cầu.<br />Ba bước để kết nối.</h2></div><div className="hf-how-switch" role="group" aria-label="Xem hướng dẫn theo vai trò"><button type="button" aria-pressed={!provider} className={!provider ? "active" : ""} onClick={() => setProvider(false)}>Cho người thuê</button><button type="button" aria-pressed={provider} className={provider ? "active" : ""} onClick={() => setProvider(true)}>Cho người nhận việc</button></div></div>
          <div className="hf-steps">{steps.map(([title, description], index) => <article key={title} className="hf-step"><div className="hf-step-number">0{index + 1}<span /><Arrow /></div><h3>{title}</h3><p>{description}</p></article>)}</div>
        </div></section>

        <section className="hf-section hf-container hf-two-sides">
          <div className="hf-about"><p className="hf-eyebrow">CÙNG NHAU, NHẸ VIỆC HƠN</p><h2>Bạn có việc cần làm.<br />Ai đó có thể giúp.</h2><p>Từ việc nhà đến việc học, kết nối với người có thể giúp bạn.</p><a className="hf-text-link" href="#faq">Hiểu thêm về HandsFree <Arrow diagonal /></a><div className="hf-about-mark" aria-hidden="true">h<span>f.</span></div></div>
          <div className="hf-benefit-stack"><article className="hf-benefit"><div className="hf-benefit-icon"><AppIcon name="users" /></div><div><span>DÀNH CHO NGƯỜI THUÊ</span><h3>Thêm thời gian cho điều quan trọng.</h3><p>Chia sẻ nhu cầu cụ thể, xem hồ sơ và chủ động chọn người bạn muốn kết nối.</p></div></article><article className="hf-benefit hf-benefit-dark"><div className="hf-benefit-icon"><AppIcon name="briefcase" /></div><div><span>DÀNH CHO NGƯỜI NHẬN VIỆC</span><h3>Biến khả năng thành cơ hội.</h3><p>Khám phá việc ngắn hạn, lưu những việc phù hợp và thể hiện sự quan tâm của bạn.</p></div></article></div>
        </section>

        <section id="faq" className="hf-faq-section hf-container"><div><p className="hf-eyebrow">TRƯỚC KHI BẠN BẮT ĐẦU</p><h2>Có thể bạn<br />đang thắc mắc.</h2><p>Một vài điều để kết nối rõ ràng hơn.</p></div><div className="hf-faq-list">{questions.map(({ question, answer }) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>

        <section className="hf-container hf-final-wrap"><div className="hf-final-cta"><div><p className="hf-eyebrow">MỘT NGÀY NHẸ NHÀNG HƠN BẮT ĐẦU TỪ ĐÂY</p><h2>Để việc nhỏ<br />không còn là việc lớn.</h2><Link className="hf-button hf-button-light" to={startTo}>{isAuthenticated ? "Vào HandsFree" : "Tạo tài khoản HandsFree"}<Arrow /></Link></div><div className="hf-final-art" aria-hidden="true"><span>✳</span><p>Less busy.<br /><em>More living.</em></p></div></div></section>
      </main>

      <footer className="hf-footer hf-container"><div><Link to="/" className="hf-logo-link" aria-label="HandsFree - Trang chủ"><HandsFreeLogo compact /></Link><p>Kết nối những đôi tay. Mở thêm thời gian.</p></div><nav aria-label="Điều hướng cuối trang"><Link to="/install">Cài HandsFree</Link><a href="#how-it-works">Cách hoạt động</a><a href="#faq">Câu hỏi thường gặp</a><Link to={isAuthenticated ? "/home" : "/login"}>{isAuthenticated ? "Tài khoản" : "Đăng nhập"}</Link></nav><div className="hf-footer-bottom"><span>© {new Date().getFullYear()} HandsFree.</span><span>Kết nối việc ngắn hạn · Phiên bản MVP</span></div></footer>
    </div>
  );
}
