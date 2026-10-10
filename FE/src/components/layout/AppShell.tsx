import { usePwa } from "../../features/pwa/usePwa";
import RatingReminder from "../../features/rating/components/RatingReminder";
import IdentityActionGuard from "../../features/identity/components/IdentityActionGuard";
import FeedbackProvider from "../feedback/FeedbackProvider";
import { useViewportHeight } from "./useViewportHeight";
import "./app-ui.css";
import { NavLink, Outlet } from "react-router-dom";
import { HandsFreeLogo } from "../brand/HandsFreeLogo";
import { AppIcon } from "../ui/AppIcon";
import { useAuth } from "../../context/AuthContext";
import ModeSwitcher from "./ModeSwitcher";
import AccountMenu from "./AccountMenu";
import { useNotifications } from "../../context/NotificationContext";

const consumerItems = [
  { to: "/home", label: "Trang chủ", icon: "home" as const },
  { to: "/posts", label: "Bài đăng", icon: "list" as const },
  { to: "/candidates", label: "Ứng viên", icon: "users" as const },
  { to: "/messages", label: "Tin nhắn", icon: "chat" as const },
  { to: "/notifications", label: "Thông báo", icon: "bell" as const },
  { to: "/profile", label: "Hồ sơ", icon: "user" as const },
];

const providerItems = [
  { to: "/home", label: "Trang chủ", icon: "home" as const },
  { to: "/discover", label: "Khám phá", icon: "briefcase" as const },
  { to: "/saved", label: "Đã lưu", icon: "bookmark" as const },
  { to: "/messages", label: "Tin nhắn", icon: "chat" as const },
  { to: "/notifications", label: "Thông báo", icon: "bell" as const },
  { to: "/profile", label: "Hồ sơ", icon: "user" as const },
];

function Avatar() {
  const { user } = useAuth();
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt="Ảnh đại diện" className="h-10 w-10 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#d9f0f4] font-extrabold text-[#007f95]">
      {user?.fullName?.trim().charAt(0).toUpperCase() || "H"}
    </div>
  );
}

function AppShellLayout() {
  const { installed } = usePwa();
  useViewportHeight();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const items = user?.currentMode === "PROVIDER" ? providerItems : consumerItems;

  return (
    <div className="hf-app min-h-screen min-h-dvh w-full overflow-x-clip bg-[#f5f7fd] text-[#0c1d35]">
      <aside className="hf-sidebar fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
        <NavLink to="/" aria-label="Về trang giới thiệu"><HandsFreeLogo className="justify-start" /></NavLink>
        <div className="mt-7">
          <ModeSwitcher />
        </div>
        <nav className="hf-side-links mt-7 space-y-2" aria-label="Điều hướng chính">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                isActive
                  ? "bg-[#e7f5f7] text-[#007f95]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <span className="relative shrink-0">
                <AppIcon name={item.icon} className="h-5 w-5" />
                {item.to === "/notifications" && unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-extrabold leading-4 text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
              <span className="hf-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="hf-account mt-auto rounded-3xl bg-[#f3f6fb] p-4">
          <div className="flex items-center gap-3">
            <Avatar />
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">{user?.fullName}</p>
              <p className="truncate text-xs text-slate-500">{user?.email || user?.phone}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đăng xuất"
            onClick={() => void logout()}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:border-red-200 hover:text-red-600"
          >
            <AppIcon name="logout" className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="hf-app-body min-h-screen min-h-dvh lg:pl-72">
        <header className="hf-app-header sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur sm:px-5 lg:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <NavLink to="/home" className="hf-header-brand min-w-0 lg:hidden" aria-label="Trang chủ HandsFree"><HandsFreeLogo compact className="min-w-0 justify-start" /></NavLink>
            <div className="hidden lg:block">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b8a91]">
                {user?.currentMode === "PROVIDER" ? "Chế độ nhận việc" : "Chế độ thuê việc"}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-500">Việc nhỏ, kết nối lớn</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {!installed && <NavLink to="/install" className="rounded-full bg-[#e8f6f8] px-3 py-2 text-xs font-bold text-[#007f95]" aria-label="Cài ứng dụng HandsFree">Cài app</NavLink>}
              <NavLink to="/wallet" className="rounded-full bg-[#e8f6f8] px-3 py-2 text-xs font-bold text-[#007f95]">Ví</NavLink>
              {(user?.role === "ADMIN" || user?.role === "STAFF") && <NavLink to="/management" className="rounded-full bg-[#e8f6f8] px-3 py-2 text-xs font-bold text-[#007f95]">Quản lý</NavLink>}
              <div className="hidden w-72 md:block lg:hidden"><ModeSwitcher /></div>
              <AccountMenu avatar={<Avatar />} />
            </div>
          </div>
          <div className="mt-3 md:hidden"><ModeSwitcher /></div>
        </header>

        <main className="hf-main mx-auto w-full max-w-6xl px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10">
          <IdentityActionGuard />
          <RatingReminder />
          <Outlet />
        </main>
      </div>

      <nav className="hf-bottomnav fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur lg:hidden" aria-label="Điều hướng di động">
        <div className={`hf-bottomnav-grid mx-auto grid max-w-xl ${items.length === 6 ? "grid-cols-6" : "grid-cols-5"}`}>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) => `flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 text-[9px] font-extrabold leading-3 transition min-[360px]:text-[10px] ${
                isActive ? "bg-[#eef8fa] text-[#007f95]" : "text-slate-400"
              }`}
            >
              <span className="relative shrink-0">
                <AppIcon name={item.icon} className="h-5 w-5" />
                {item.to === "/notifications" && unreadCount > 0 && (
                  <span className="absolute -right-2.5 -top-2 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[8px] font-extrabold leading-4 text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function AppShell() {
  return <FeedbackProvider><AppShellLayout /></FeedbackProvider>;
}
