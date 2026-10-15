import { lazy, Suspense, useEffect, useState } from "react";
import { locationService, type Place, type SavedAddress } from "./locationService";
import { getApiErrorMessage } from "../auth/utils/apiError";
import { useFeedback } from "../../components/feedback/FeedbackContext";
import "./location.css";
const AddressPicker = lazy(() => import("./AddressPicker"));
export default function SavedAddresses() {
  const { confirm } = useFeedback();
  const [list, setList] = useState<SavedAddress[]>([]), [error, setError] = useState("");
  const [editing, setEditing] = useState<SavedAddress | "new" | null>(null);
  const [label, setLabel] = useState("Nhà riêng"), [place, setPlace] = useState<Place | null>(null), [isDefault, setDefault] = useState(false);
  const [picker, setPicker] = useState(false), [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => { const c = new AbortController(); locationService.addresses(c.signal).then(setList).catch(e => { if (!c.signal.aborted) setError(getApiErrorMessage(e, "Không tải được địa chỉ.")); }); return () => c.abort(); }, [revision]);
  function edit(a: SavedAddress | "new") { setEditing(a); setPlace(a === "new" ? null : a.place); setLabel(a === "new" ? "Nhà riêng" : a.label); setDefault(a === "new" ? !list.length : a.defaultAddress); setError(""); }
  async function save() {
    if (!place || !label.trim()) { setError("Hãy đặt tên và chọn địa chỉ."); return; }
    setBusy(true); setError("");
    try { await locationService.saveAddress({ label: label.trim(), place, defaultAddress: isDefault }, editing && editing !== "new" ? editing.id : undefined); setRevision(v => v + 1); setEditing(null); }
    catch (e) { setError(getApiErrorMessage(e, "Không lưu được địa chỉ.")); } finally { setBusy(false); }
  }
  async function remove(a: SavedAddress) {
    if (!await confirm({ title: "Xóa địa chỉ đã lưu", message: `Xóa “${a.label}”? Địa điểm trên bài đăng cũ vẫn được giữ lại.`, confirmLabel: "Xóa địa chỉ", danger: true })) return;
    setBusy(true); try { await locationService.deleteAddress(a.id); setRevision(v => v + 1); setError(""); } catch (e) { setError(getApiErrorMessage(e, "Không xóa được địa chỉ.")); } finally { setBusy(false); }
  }
  return <section className="hf-address-book"><header><div><h2>Địa chỉ đã lưu</h2><p>Chỉ bạn xem được · Tối đa 10 địa chỉ</p></div><button type="button" disabled={busy || list.length >= 10} onClick={() => edit("new")}>＋ Thêm</button></header>
    {error && <p role="alert" className="hf-location-error">{error}</p>}
    {!list.length && !error && <p className="hf-location-note">Lưu Nhà riêng, Công ty… để chọn nhanh khi đăng hoặc tìm việc.</p>}
    {list.map(a => <article key={a.id}><div><strong>{a.label} {a.defaultAddress && <small>Mặc định</small>}</strong><p>{a.place.address}</p></div><div><button type="button" disabled={busy} onClick={() => edit(a)}>Sửa</button><button type="button" disabled={busy} onClick={() => void remove(a)}>Xóa</button></div></article>)}
    {editing && <div className="hf-address-edit"><label>Tên địa chỉ<input maxLength={40} value={label} onChange={e => setLabel(e.target.value)} /></label><button type="button" disabled={busy} onClick={() => setPicker(true)}>{place?.address || "Chọn trên bản đồ / nhập địa chỉ"}</button><label><input type="checkbox" checked={isDefault} onChange={e => setDefault(e.target.checked)} /> Địa chỉ mặc định</label><div><button type="button" disabled={busy} onClick={() => setEditing(null)}>Hủy</button><button type="button" className="hf-location-primary" disabled={busy} onClick={() => void save()}>{busy ? "Đang lưu…" : "Lưu địa chỉ"}</button></div></div>}
    {picker && <Suspense fallback={<p role="status">Đang mở bản đồ…</p>}><AddressPicker allowSave={false} initial={place} onClose={() => setPicker(false)} onSelect={p => { setPlace(p); setPicker(false); }} /></Suspense>}
  </section>;
}
