import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { locationService, emptyPlace, hasPoint, type Place, type SavedAddress } from "./locationService";
import { getApiErrorMessage } from "../auth/utils/apiError";
import "./location.css";
const LocationMap = lazy(() => import("./LocationMap"));
export default function AddressPicker({ initial, onSelect, onClose, title = "Chọn địa điểm", allowSave = true }: { initial?: Place | null; onSelect: (place: Place) => void; onClose: () => void; title?: string; allowSave?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [place, setPlace] = useState<Place>(initial || emptyPlace);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number>();
  const [save, setSave] = useState(false);
  const [label, setLabel] = useState("Nhà riêng");
  const [custom, setCustom] = useState("");
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const alive = useRef(true);
  const locateSequence = useRef(0);
  useEffect(() => {
    alive.current = true; const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; ref.current?.showModal();
    const controller = new AbortController();
    void locationService.addresses(controller.signal).then(setSaved).catch(e => { if (!controller.signal.aborted) setError(getApiErrorMessage(e, "Không tải được địa chỉ đã lưu.")); });
    return () => { alive.current = false; locateSequence.current++; sequence.current++; controller.abort(); request.current?.abort(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    if (query.trim().length < 3) return;
    const timer = window.setTimeout(() => {
      void locationService.search(query.trim(), place, controller.signal).then(results => { if (!controller.signal.aborted) { setSuggestions(results); setError(""); setNotice(results.length ? "" : "Chưa tìm thấy địa chỉ. Bạn có thể chọn ghim hoặc nhập tay."); } })
        .catch(e => { if (!controller.signal.aborted) { setSuggestions([]); setError(getApiErrorMessage(e, "Không tìm được địa chỉ.")); } });
    }, 650);
    return () => { window.clearTimeout(timer); controller.abort(); };
    // Bias is a snapshot when the search text changes, not a reason to repeat calls on every pin move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  function select(p: Place) { sequence.current++; locateSequence.current++; request.current?.abort(); setLocating(false); setAccuracy(undefined); setPlace({ ...p }); setQuery(""); setSuggestions([]); setError(""); setNotice(""); }
  async function pin(latitude: number, longitude: number) {
    const current = ++sequence.current; request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setPlace({ address: "", area: "", latitude, longitude }); setNotice("Đang tìm địa chỉ tại ghim…"); setQuery(""); setSuggestions([]);
    try { const results = await locationService.reverse(latitude, longitude, controller.signal);
      if (current !== sequence.current || !alive.current) return;
      setPlace({ ...(results[0] || emptyPlace), latitude, longitude }); setError(""); setNotice(results.length ? "Kiểm tra ghim và bổ sung số nhà / căn hộ trước khi xác nhận." : "Chưa tìm thấy địa chỉ. Hãy nhập địa chỉ và khu vực cho ghim đã chọn.");
    } catch (e) { if (current === sequence.current && !controller.signal.aborted && alive.current) { setError(getApiErrorMessage(e, "Chưa tra được địa chỉ; bạn có thể nhập tay.")); setNotice(""); } }
  }
  function locate() {
    if (!navigator.geolocation) { setError("Thiết bị chưa hỗ trợ định vị. Hãy tìm địa chỉ hoặc nhập tay."); return; }
    const current = ++locateSequence.current; setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(p => { if (!alive.current || current !== locateSequence.current) return; setLocating(false); setAccuracy(p.coords.accuracy); void pin(p.coords.latitude, p.coords.longitude); }, e => { if (!alive.current || current !== locateSequence.current) return; setLocating(false); setError(e.code === 1 ? "Bạn chưa cho phép định vị. Có thể bật quyền trong trình duyệt hoặc nhập địa chỉ." : "Chưa lấy được vị trí. Hãy thử lại ở nơi thoáng hoặc nhập địa chỉ."); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  }
  async function confirm() {
    const value = { ...place, address: place.address.trim(), area: place.area.trim() };
    if (!value.address || !value.area) { setError("Vui lòng nhập địa chỉ và khu vực công khai."); return; }
    if (save && label === "Khác" && !custom.trim()) { setError("Hãy đặt tên cho địa chỉ đã lưu."); return; }
    setBusy(true); setError("");
    try { if (save) await locationService.saveAddress({ label: label === "Khác" ? custom.trim() : label, place: value, defaultAddress: !saved.length }); onSelect(value); }
    catch (e) { setError(getApiErrorMessage(e, "Không thể lưu địa chỉ. Bạn có thể bỏ chọn Lưu địa chỉ để tiếp tục.")); }
    finally { if (alive.current) setBusy(false); }
  }
  return createPortal(<dialog ref={ref} className="hf-address-dialog" aria-labelledby="hf-address-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <header><div><p>Địa điểm của bạn</p><h2 id="hf-address-title">{title}</h2></div><button type="button" aria-label="Đóng chọn địa chỉ" disabled={busy} onClick={onClose}>✕</button></header>
    <div className="hf-address-body">
      <div className="hf-address-search"><label htmlFor="hf-address-search">Tìm địa chỉ tại Việt Nam</label><input id="hf-address-search" value={query} maxLength={200} onChange={e => { setQuery(e.target.value); setSuggestions([]); }} placeholder="Nhập số nhà, tên đường hoặc khu vực…" />
        {suggestions.length > 0 && <ul aria-label="Gợi ý địa chỉ">{suggestions.map((p, i) => <li key={i}><button type="button" onClick={() => select(p)}>{p.address}</button></li>)}</ul>}
      </div>
      <div className="hf-address-shortcuts"><button type="button" disabled={locating} onClick={locate}>{locating ? "Đang định vị…" : "◎ Vị trí hiện tại"}</button>{saved.map(a => <button type="button" key={a.id} onClick={() => select(a.place)} title={a.place.address}>{a.label}{a.defaultAddress ? " ★" : ""}</button>)}</div>
      {error && <p role="alert" className="hf-location-error">{error}</p>}{notice && <p role="status" className="hf-location-note">{notice}</p>}
      <Suspense fallback={<p role="status">Đang mở bản đồ…</p>}><LocationMap place={place} onMove={(lat, lon) => { setAccuracy(undefined); void pin(lat, lon); }} accuracy={accuracy} /></Suspense>
      <p className="hf-location-note">Chạm bản đồ hoặc kéo ghim để chọn. {accuracy ? `Sai số thiết bị khoảng ${Math.round(accuracy)} m. ` : ""}{hasPoint(place) ? "Đã có tọa độ. Hãy kiểm tra trước khi xác nhận." : "Chưa có tọa độ; địa chỉ nhập tay sẽ không xuất hiện trong lọc bán kính."}</p>
      <div className="hf-location-fields"><label>Địa chỉ cụ thể / số nhà, tầng, căn hộ<input value={place.address} maxLength={255} onChange={e => { sequence.current++; request.current?.abort(); setPlace(p => ({ ...p, address: e.target.value })); }} placeholder="Bổ sung hướng dẫn đến nơi làm việc" /></label><label>Khu vực công khai (phường, quận, thành phố)<input value={place.area} maxLength={120} onChange={e => { sequence.current++; request.current?.abort(); setPlace(p => ({ ...p, area: e.target.value })); }} placeholder="Không điền số nhà vào ô này" /></label></div>
      {allowSave && <div className="hf-address-save"><label><input type="checkbox" checked={save} onChange={e => setSave(e.target.checked)} /> Lưu để dùng lần sau (chỉ bạn xem được)</label>{save && <div className="hf-location-fields"><label>Loại địa chỉ<select value={label} onChange={e => setLabel(e.target.value)}><option>Nhà riêng</option><option>Công ty</option><option>Khác</option></select></label>{label === "Khác" && <label>Tên địa chỉ<input maxLength={40} value={custom} onChange={e => setCustom(e.target.value)} /></label>}</div>}</div>}
    </div>
    <footer><button type="button" disabled={busy} onClick={onClose}>Hủy</button><button type="button" className="hf-location-primary" disabled={busy || locating} onClick={() => void confirm()}>{busy ? "Đang lưu…" : "Xác nhận địa điểm"}</button></footer>
  </dialog>, document.body);
}
