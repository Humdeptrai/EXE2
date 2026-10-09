import { safeNext } from "../../../services/identityService";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../../config/axios";
import type { ApiResponse } from "../../../types/api";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import "./FaceComparisonPage.css";

type Slot = "front" | "back";
type Scan = { sessionId: string; step: string; completed: number; total: number; progress: number; complete: boolean; message: string; expiresIn: number };
type Result = { status: string; decision: string; cosineScore: number; motionPassed: boolean; antiSpoofPassed: boolean; documentReadable: boolean; identityVerified: boolean; message: string };
const directions: Record<string, string> = { CENTER: "Nhìn thẳng", LEFT: "Quay sang trái của bạn", RIGHT: "Quay sang phải của bạn", UP: "Ngẩng đầu nhẹ", DOWN: "Cúi đầu nhẹ", DONE: "Hoàn thành các động tác" };
async function normalize(blob: Blob): Promise<File> {
  if (blob.size > 10 * 1024 * 1024) throw new Error("Ảnh tối đa 10 MB.");
  const bitmap = await createImageBitmap(blob);
  try {
    if (bitmap.width < 320 || bitmap.height < 240 || bitmap.width * bitmap.height > 16000000) throw new Error("Ảnh cần rõ nét, ít nhất 320 × 240 và không quá 16 triệu điểm ảnh.");
    const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Không xử lý được ảnh.");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Không xử lý được ảnh.")), "image/jpeg", .9));
    return new File([jpeg], "document.jpg", { type: "image/jpeg" });
  } finally { bitmap.close(); }
}
function Preview({ file, label }: { file: File | null; label: string }) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => { if (!file || !ref.current) return; const url = URL.createObjectURL(file); ref.current.src = url; return () => URL.revokeObjectURL(url); }, [file]);
  return file ? <img ref={ref} alt={label} /> : <p>Chưa có ảnh</p>;
}
export default function FaceComparisonPage() {
  const [params] = useSearchParams(); const next = safeNext(params.get("next"));
  const [files, setFiles] = useState<Record<Slot, File | null>>({ front: null, back: null });
  const [camera, setCamera] = useState<Slot | "face" | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scan, setScan] = useState<Scan | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const session = useRef<string | null>(null);
  const attempt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef<AbortController | null>(null);
  const frameErrors = useRef(0);
  function stopTracks() { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; }
  function stop() {
    attempt.current++; if (timer.current) clearTimeout(timer.current); request.current?.abort(); stopTracks();
    const sid = session.current; session.current = null;
    if (sid) void api.delete(`/identity/face-comparison/sessions/${sid}`).catch(() => undefined);
    setCamera(null); setBusy(false);
  }
  useEffect(() => () => {
    attempt.current++; if (timer.current) clearTimeout(timer.current); request.current?.abort();
    stream.current?.getTracks().forEach(t => t.stop());
    if (session.current) void api.delete(`/identity/face-comparison/sessions/${session.current}`).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (camera && video.current && stream.current) {
      video.current.srcObject = stream.current;
      void video.current.play().catch(() => setError("Không phát được camera. Hãy đóng rồi mở lại."));
    }
  }, [camera]);
  async function open(target: Slot | "face") {
    stop(); setError(""); setResult(null); const current = ++attempt.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera cần HTTPS hoặc localhost.");
      const next = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: target === "face" ? "user" : "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } });
      if (current !== attempt.current) { next.getTracks().forEach(t => t.stop()); return; }
      stream.current = next; setCamera(target);
    } catch { if (current === attempt.current) setError("Không mở được camera. Cấp quyền truy cập và dùng HTTPS hoặc localhost."); }
  }
  async function image(): Promise<Blob> {
    const v = video.current;
    if (!v?.videoWidth || !v.videoHeight) throw new Error("Camera chưa sẵn sàng.");
    const canvas = document.createElement("canvas"); const ratio = Math.min(1, 960 / v.videoWidth);
    canvas.width = Math.round(v.videoWidth * ratio); canvas.height = Math.round(v.videoHeight * ratio);
    canvas.getContext("2d")?.drawImage(v, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Không đọc được camera.")), "image/jpeg", .9));
  }
  async function select(target: Slot, blob: Blob) {
    setError(""); setResult(null);
    try { const f = await normalize(blob); setFiles(prev => ({ ...prev, [target]: f })); }
    catch (e) { setError(e instanceof Error ? e.message : "Không đọc được ảnh."); }
  }
  async function capture() {
    if (!camera || camera === "face") return;
    try { const target = camera; const blob = await image(); await select(target, blob); stop(); }
    catch (e) { setError(e instanceof Error ? e.message : "Không chụp được ảnh."); }
  }
  async function finish(sid: string, current: number) {
    stopTracks(); setCamera(null);
    const body = new FormData(); body.append("front", files.front!); body.append("back", files.back!);
    try {
      const response = await api.post<ApiResponse<Result>>(`/identity/face-comparison/sessions/${sid}/finish`, body, { headers: { "Content-Type": undefined }, timeout: 90000, signal: request.current?.signal });
      if (current === attempt.current) { session.current = null; setResult(response.data.result); setBusy(false); }
    } catch (e) { if (current === attempt.current) { setError(getApiErrorMessage(e, "Chưa đối chiếu được CCCD. Hãy bắt đầu lại.")); stop(); } }
  }
  async function sendFrame(sid: string, current: number) {
    if (current !== attempt.current) return;
    try {
      const blob = await image(); const body = new FormData(); body.append("face", blob, "frame.jpg");
      const response = await api.post<ApiResponse<Scan>>(`/identity/face-comparison/sessions/${sid}/frame`, body, { headers: { "Content-Type": undefined }, timeout: 20000, signal: request.current?.signal });
      if (current !== attempt.current) return;
      frameErrors.current = 0;
      const next = response.data.result; setScan(next);
      if (next.complete) { await finish(sid, current); return; }
    } catch (e) {
      if (current !== attempt.current) return;
      const status = (e as { response?: { status?: number } }).response?.status;
      if ((status === 409 || status === 422 || status === 403 || status === 401) || ++frameErrors.current >= 3) {
        setError(getApiErrorMessage(e, "Phiên quét thất bại. Kiểm tra ánh sáng, kết nối rồi bắt đầu lại.")); stop(); return;
      }
      setScan(prev => prev ? { ...prev, message: "Đang thử kết nối lại… Giữ khuôn mặt trước camera." } : prev);
    }
    if (current === attempt.current) timer.current = setTimeout(() => void sendFrame(sid, current), 350);
  }
  async function begin() {
    if (!consent || !files.front || !files.back || camera !== "face" || busy) return;
    setBusy(true); setError(""); setScan(null); setResult(null);
    const current = attempt.current; request.current = new AbortController(); frameErrors.current = 0;
    try {
      const response = await api.post<ApiResponse<Scan>>("/identity/face-comparison/sessions?consent=true", null, { signal: request.current.signal, timeout: 20000 });
      if (current !== attempt.current) { void api.delete(`/identity/face-comparison/sessions/${response.data.result.sessionId}`).catch(() => undefined); return; }
      const next = response.data.result; session.current = next.sessionId; setScan(next);
      void sendFrame(next.sessionId, current);
    } catch (e) { if (current === attempt.current) { setError(getApiErrorMessage(e, "Không bắt đầu được phiên quét.")); setBusy(false); } }
  }
  return <main className="hf-face">
    <Link className="hf-face-back" to="/profile">← Hồ sơ của tôi</Link>
    <header><span>HANDS FREE · XÁC THỰC DANH TÍNH</span><h1>CCCD & quét khuôn mặt</h1><p>Chụp rõ hai mặt CCCD, sau đó thực hiện các động tác trước camera.</p></header>
    <div className="hf-face-note">Kiểm tra động tác và chống giả mạo RGB phục vụ đồ án. Hoàn thành quét chưa chứng minh CCCD thật; quyền đăng/nhận việc vẫn cần trạng thái xác thực hợp lệ.</div>
    {error && <div className="hf-face-error" role="alert">{error}</div>}
    <div className="hf-face-grid">{(["front", "back"] as const).map(target => <section key={target}>
      <h2>{target === "front" ? "1. Mặt trước CCCD" : "2. Mặt sau CCCD"}</h2>
      <div className="hf-face-preview"><Preview file={files[target]} label={target === "front" ? "Mặt trước CCCD" : "Mặt sau CCCD"} /></div>
      <div className="hf-face-actions"><button disabled={busy} onClick={() => void open(target)}>Chụp CCCD</button>
        <label className={busy ? "hf-disabled" : ""}>Chọn ảnh CCCD<input type="file" accept="image/jpeg,image/png" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void select(target, file); e.target.value = ""; }} /></label></div>
    </section>)}</div>
    <section className="hf-face-scan"><h2>3. Quét khuôn mặt trực tiếp</h2><p>Đủ sáng, tháo kính tối màu. Quay đầu nhẹ theo hướng yêu cầu rồi giữ nguyên. Camera được hiển thị như gương.</p>
      {!camera && <button className="hf-face-submit" disabled={busy || !files.front || !files.back} onClick={() => void open("face")}>Mở camera quét khuôn mặt</button>}
      {camera && <div className="hf-face-camera">
        <div className={`hf-live-view ${camera === "face" ? "hf-mirror" : ""}`}><video ref={video} autoPlay muted playsInline />{camera === "face" && <div className="hf-live-oval" />}</div>
        {camera === "face" ? <>
          <h3 className="hf-live-direction">{scan ? directions[scan.step] : "Nhìn thẳng vào camera"}</h3>
          <p role="status" aria-live="polite">{scan?.message || "Đồng ý xử lý thông tin rồi nhấn Bắt đầu quét."}</p>
          {scan && <><progress max={100} value={scan.progress} aria-label="Tiến trình quét khuôn mặt" /><p>{scan.completed}/{scan.total} bước · {scan.progress}% · Còn {scan.expiresIn} giây</p></>}
          <div className="hf-face-actions"><button disabled={busy || !consent} onClick={() => void begin()}>{busy ? "Đang quét…" : "Bắt đầu quét"}</button><button onClick={stop}>Hủy phiên</button></div>
        </> : <div className="hf-face-actions"><button onClick={() => void capture()}>Chụp ảnh</button><button onClick={stop}>Đóng camera</button></div>}
      </div>}
      {busy && !camera && <p role="status">Đang đọc CCCD và so khớp khuôn mặt…</p>}
    </section>
    <label className="hf-face-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} /><span>Tôi đồng ý xử lý ảnh CCCD và khuôn mặt để kiểm tra danh tính. Hồ sơ đạt kiểm tra được mã hóa, chỉ ADMIN được xem ảnh CCCD; STAFF chỉ xem trạng thái.</span></label>
    {result && <section className={`hf-face-result ${result.status === "REJECTED" ? "hf-no-match" : "hf-match"}`} aria-live="polite"><h2>{result.status === "REJECTED" ? "Chưa đạt đối chiếu" : "Đã hoàn thành quét & đối chiếu"}</h2><p>{result.message}</p><ul><li>Động tác: {result.motionPassed ? "Đạt" : "Chưa đạt"}</li><li>Chống giả mạo RGB: {result.antiSpoofPassed ? "Đạt" : "Chưa đạt"}</li><li>Đọc CCCD: {result.documentReadable ? "Đạt" : "Chưa rõ"}</li><li>So khớp: {result.decision === "MATCH" ? "Đạt" : "Chưa khớp"}</li></ul><small>Kết quả chống giả mạo chưa được chứng nhận. Điểm so khớp không phải phần trăm xác thực.</small><div className="hf-onboarding-actions"><Link to="/profile">Về hồ sơ</Link><Link to={next}>Tiếp tục khám phá</Link></div></section>}
  </main>;
}
