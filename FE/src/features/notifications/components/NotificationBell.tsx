import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import { useNotifications } from "../../../context/NotificationContext";
import { notificationService } from "../../../services/notificationService";
import type { NotificationItem } from "../../../types/notification";
import { notificationPresentation } from "../utils/notificationPresentation";
import { notificationDestination } from "../utils/notificationDestination";
import "./notification-bell.css";

export default function NotificationBell() {
  const { unreadCount, subscribeNotifications, refreshUnreadCount } = useNotifications();
  const location = useLocation();
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === location.key;
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [marking, setMarking] = useState(false);
  const reads = useRef(new Set<string>());
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const navigate = useNavigate();

  useEffect(() => subscribeNotifications(item => setItems(current =>
    [item, ...current.filter(value => value.id !== item.id)].slice(0, 10))), [subscribeNotifications]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const received = new Map<string, NotificationItem>();
    const unsubscribe = subscribeNotifications(item => received.set(item.id, item));
    void notificationService.getNotifications(0, 10).then(page => {
      if (!active) return;
      const merged = new Map(page.content.map(item => [item.id, item]));
      received.forEach((item, id) => merged.set(id, item));
      setItems([...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10));
      setError(false);
    }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    void refreshUnreadCount();
    return () => { active = false; unsubscribe(); };
  }, [open, revision, subscribeNotifications, refreshUnreadCount]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpenedAt(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpenedAt(null); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  function visit(item: NotificationItem) {
    setOpenedAt(null);
    navigate(notificationDestination(item));
    if (item.read || reads.current.has(item.id)) return;
    reads.current.add(item.id);
    void notificationService.markRead(item.id).then(updated => {
      setItems(current => current.map(value => value.id === item.id ? updated : value));
      void refreshUnreadCount();
    }).catch(() => { void refreshUnreadCount(); }).finally(() => reads.current.delete(item.id));
  }
  async function markAll() {
    if (marking) return;
    setMarking(true);
    try {
      await notificationService.markAllRead();
      setRevision(value => value + 1);
      await refreshUnreadCount();
    } catch { setError(true); }
    finally { setMarking(false); }
  }
  return <div ref={root} className="hf-notification-bell" onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpenedAt(null);
  }}>
    <button ref={trigger} type="button" className="hf-bell-trigger" aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ""}`} aria-expanded={open} aria-controls={panelId} onClick={() => {
      if (!open) { setLoading(true); setError(false); }
      setOpenedAt(open ? null : location.key);
    }}><AppIcon name="bell" className="h-5 w-5" />{unreadCount > 0 && <span className="hf-bell-count" aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span>}</button>
    {open && <section id={panelId} className="hf-bell-panel" aria-label="Thông báo gần đây">
      <header><h2>Thông báo</h2><button type="button" disabled={marking || unreadCount === 0} onClick={() => void markAll()}>{marking ? "Đang cập nhật…" : "Đọc tất cả"}</button></header>
      <div className="hf-bell-list" aria-busy={loading}>
        {loading && <p className="hf-bell-empty" role="status">Đang tải thông báo…</p>}
        {error && <div className="hf-bell-empty" role="alert"><p>Chưa tải được thông báo. Vui lòng thử lại.</p><button type="button" onClick={() => { setLoading(true); setError(false); setRevision(value => value + 1); }}>Thử lại</button></div>}
        {!loading && !error && !items.length && <p className="hf-bell-empty">Chưa có thông báo mới.</p>}
        {!loading && items.map(item => {
          const presentation = notificationPresentation(item.type);
          return <button key={item.id} type="button" className={`hf-bell-item ${item.read ? "" : "hf-bell-unread"}`} onClick={() => visit(item)}>
            <span className={`hf-bell-item-icon ${presentation.iconClass}`} aria-hidden="true"><AppIcon name={presentation.icon} className="h-5 w-5" /></span>
            <span className="hf-bell-item-copy"><strong>{item.title}</strong><span>{item.message}</span><small>{new Date(item.createdAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {item.read ? "Đã đọc" : "Chưa đọc"}</small></span>
            {!item.read && <span className="hf-bell-unread-dot" aria-hidden="true" />}
          </button>;
        })}
      </div>
      <footer><Link to="/notifications" onClick={() => setOpenedAt(null)}>Xem tất cả thông báo</Link></footer>
    </section>}
  </div>;
}
