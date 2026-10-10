import { safeNext } from "../../../services/identityService";
import { type PropsWithChildren, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFeedback } from "../../../components/feedback/FeedbackContext";
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
function DocumentCamera({ title, onClose, children }: PropsWithChildren<{ title: string; onClose: () => void }>) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => { element?.close(); document.body.style.overflow = overflow; focus?.focus({ preventScroll: true }); };
  }, []);
  return createPortal(<dialog ref={dialog} className="hf-face hf-document-camera" aria-labelledby="hf-document-camera-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="hf-document-camera-heading"><h2 id="hf-document-camera-title">{title}</h2>
      <button type="button" aria-label="Đóng camera CCCD" onClick={onClose}>✕</button></header>
    {children}
  </dialog>, document.body);
}
export default function FaceComparisonPage() {
  const { confirm } = useFeedback();
  const [draft, setDraft] = useState<File | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [closing, setClosing] = useState(false);
  const backStep = useRef<HTMLElement>(null);
  const submitStep = useRef<HTMLButtonElement>(null);
  const [params] = useSearchParams(); const next = safeNext(params.get("next"));
  const [phase, setPhase] = useState<"scan" | "selfie" | "documents" | "result">("scan");
  const [files, setFiles] = useState<Record<Slot, File | null>>({ front: null, back: null });
  const [selfie, setSelfie] = useState<File | null>(null);
  const [camera, setCamera] = useState<Slot | "face" | null>(null);
  const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [scan, setScan] = useState<Scan | null>(null);
  const [result, setResult] = useState<Result | null>(null); const [expiresAt, setExpiresAt] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null);
  const session = useRef<string | null>(null); const attempt = useRef(0); const cameraAttempt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef<AbortController | null>(null); const frameErrors = useRef(0);
  const remaining = Math.max(0, Math.ceil((expiresAt - clock) / 1000));
  const expired = expiresAt > 0 && remaining === 0 && phase !== "result";
  function closeCamera() {
    cameraAttempt.current++; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setCamera(null); setDraft(null);
  }
  function reset() {
    attempt.current++; if (timer.current) clearTimeout(timer.current); request.current?.abort(); closeCamera();
    const sid = session.current; session.current = null;
    if (sid) void api.delete(`/identity/face-comparison/sessions/${sid}`).catch(() => undefined);
    setPhase("scan"); setScan(null); setSelfie(null); setResult(null); setBusy(false); setError(""); setExpiresAt(0);
  }
  useEffect(() => {
    const ticker = setInterval(() => setClock(Date.now()), 1000);
    const attemptRef = attempt; const cameraAttemptRef = cameraAttempt;
    return () => {
      clearInterval(ticker); attemptRef.current++; cameraAttemptRef.current++;
      if (timer.current) clearTimeout(timer.current); request.current?.abort();
      stream.current?.getTracks().forEach(t => t.stop());
      if (session.current) void api.delete(`/identity/face-comparison/sessions/${session.current}`).catch(() => undefined);
    };
  }, []);
  useEffect(() => {
    if (camera && video.current && stream.current) {
      video.current.srcObject = stream.current;
      void video.current.play().catch(() => setError("Không phát được camera. Hãy đóng rồi mở lại."));
    }
  }, [camera]);
  async function open(target: Slot | "face") {
    closeCamera(); setError(""); const current = cameraAttempt.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera cần HTTPS hoặc localhost.");
      const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
        facingMode: { ideal: target === "face" ? "user" : "environment" }, width: { ideal: 1280 }, height: { ideal: 720 },
      } });
      if (current !== cameraAttempt.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media; setCamera(target);
    } catch { if (current === cameraAttempt.current) setError("Không mở được camera. Cấp quyền và dùng HTTPS hoặc localhost."); }
  }
  async function image(): Promise<Blob> {
    const v = video.current;
    if (!v?.videoWidth || !v.videoHeight) throw new Error("Camera chưa sẵn sàng.");
    const canvas = document.createElement("canvas"); const ratio = Math.min(1, 1280 / v.videoWidth);
    canvas.width = Math.round(v.videoWidth * ratio); canvas.height = Math.round(v.videoHeight * ratio);
    canvas.getContext("2d")?.drawImage(v, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Không đọc được camera.")), "image/jpeg", .9));
  }
  async function select(target: Slot, blob: Blob) {
    setError(""); const current = attempt.current;
    try { const file = await normalize(blob); if (current === attempt.current) setFiles(prev => ({ ...prev, [target]: file })); }
    catch (e) { if (current === attempt.current) setError(e instanceof Error ? e.message : "Không đọc được ảnh."); }
  }
  async function captureDocument() {
    if (!camera || camera === "face" || busy || capturing) return;
    const current = cameraAttempt.current;
    setCapturing(true); setError("");
    try {
      const file = await normalize(await image());
      if (current !== cameraAttempt.current) return;
      setDraft(file); stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
    } catch (e) { if (current === cameraAttempt.current) setError(e instanceof Error ? e.message : "Không chụp được ảnh CCCD."); }
    finally { setCapturing(false); }
  }
  function saveDocument() {
    if (!camera || camera === "face" || !draft) return;
    const target = camera;
    setFiles(previous => ({ ...previous, [target]: draft })); closeCamera();
    requestAnimationFrame(() => {
      const nextStep = target === "front" ? backStep.current : submitStep.current;
      nextStep?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (target === "back") submitStep.current?.focus({ preventScroll: true });
      else backStep.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    });
  }
  async function dismissDocument() {
    if (closing || capturing) return;
    if (!draft) { closeCamera(); return; }
    setClosing(true);
    const current = cameraAttempt.current;
    const save = await confirm({ title: "Bạn có muốn lưu ảnh?", message: "Ảnh CCCD vừa chụp chưa được lưu.", confirmLabel: "Lưu ảnh", cancelLabel: "Không lưu" });
    if (current === cameraAttempt.current) { if (save) saveDocument(); else closeCamera(); }
    setClosing(false);
  }
  async function sendFrame(sid: string, current: number) {
    if (current !== attempt.current) return;
    try {
      const body = new FormData(); body.append("face", await image(), "frame.jpg");
      const r = await api.post<ApiResponse<Scan>>(`/identity/face-comparison/sessions/${sid}/frame`, body,
        { headers: { "Content-Type": undefined }, timeout: 20000, signal: request.current?.signal });
      if (current !== attempt.current) return;
      frameErrors.current = 0; setScan(r.data.result);
      if (r.data.result.complete) { setBusy(false); setPhase("selfie"); return; }
    } catch (e) {
      if (current !== attempt.current) return;
      const status = (e as { response?: { status?: number } }).response?.status;
      if ([409, 422, 403, 401].includes(status || 0) || ++frameErrors.current >= 3) {
        reset(); setError(getApiErrorMessage(e, "Phiên quét thất bại. Vui lòng bắt đầu lại.")); return;
      }
      setScan(prev => prev ? { ...prev, message: "Đang thử kết nối lại… Giữ mặt trước camera." } : prev);
    }
    if (current === attempt.current) timer.current = setTimeout(() => void sendFrame(sid, current), 350);
  }
  async function begin() {
    if (!consent || camera !== "face" || busy) return;
    setBusy(true); setError(""); setScan(null); request.current = new AbortController(); frameErrors.current = 0;
    const current = attempt.current;
    try {
      const r = await api.post<ApiResponse<Scan>>("/identity/face-comparison/sessions?consent=true", null,
        { signal: request.current.signal, timeout: 20000 });
      if (current !== attempt.current) { void api.delete(`/identity/face-comparison/sessions/${r.data.result.sessionId}`).catch(() => undefined); return; }
      session.current = r.data.result.sessionId; setScan(r.data.result); setExpiresAt(Date.now() + r.data.result.expiresIn * 1000);
      void sendFrame(r.data.result.sessionId, current);
    } catch (e) { if (current === attempt.current) { setError(getApiErrorMessage(e, "Không bắt đầu được phiên quét.")); setBusy(false); } }
  }
  async function captureSelfie() {
    const sid = session.current; if (!sid || busy || expired) return;
    setBusy(true); setError(""); const current = attempt.current;
    try {
      const blob = await image(); const body = new FormData(); body.append("selfie", blob, "selfie.jpg");
      const r = await api.post<ApiResponse<{ accepted: boolean }>>(`/identity/face-comparison/sessions/${sid}/selfie`, body,
        { headers: { "Content-Type": undefined }, timeout: 30000, signal: request.current?.signal });
      if (current !== attempt.current) return;
      if (!r.data.result.accepted) throw new Error("Selfie chưa đạt. Hãy chụp lại.");
      setSelfie(new File([blob], "selfie.jpg", { type: "image/jpeg" })); closeCamera(); setPhase("documents");
    } catch (e) { if (current === attempt.current) setError(getApiErrorMessage(e, "Selfie chưa đạt. Nhìn thẳng, đủ sáng rồi chụp lại.")); }
    finally { if (current === attempt.current) setBusy(false); }
  }
  async function finish() {
    const sid = session.current; if (!sid || !files.front || !files.back || busy || expired) return;
    closeCamera(); setBusy(true); setError(""); const current = attempt.current;
    const body = new FormData(); body.append("front", files.front); body.append("back", files.back);
    try {
      const r = await api.post<ApiResponse<Result>>(`/identity/face-comparison/sessions/${sid}/finish`, body,
        { headers: { "Content-Type": undefined }, timeout: 150000, signal: request.current?.signal });
      if (current !== attempt.current) return;
      session.current = null; setResult(r.data.result); setPhase("result");
    } catch (e) {
      if (current === attempt.current) {
        const code = (e as { response?: { data?: { code?: number } } }).response?.data?.code;
        const retryable = !code || code === 42944 || code === 50260;
        if (!retryable) { session.current = null; setPhase("result"); }
        setError(getApiErrorMessage(e, "Chưa kết nối được dịch vụ xác thực.") + (retryable ? " Ảnh đã được giữ lại. Hãy bấm Xác minh hồ sơ để thử lại trước khi phiên hết hạn." : ""));
      }
    } finally { if (current === attempt.current) setBusy(false); }
  }
  const progress = result?.identityVerified ? 100 : phase === "documents" || phase === "result" ? 80 : phase === "selfie" ? 60 : Math.round((scan?.progress || 0) * .6);
  return <main className="hf-face">
    <Link className="hf-face-back" to="/profile">← Hồ sơ của tôi</Link>
    <header><h1>Xác minh tài khoản</h1><p>Quét khuôn mặt → chụp selfie trực tiếp → cung cấp CCCD hai mặt.</p></header>
    <progress max={100} value={progress} aria-label="Tiến trình xác minh" /><p>{progress}% · {phase === "scan" ? "Bước 1: Quét mặt" : phase === "selfie" ? "Bước 2: Selfie" : phase === "documents" ? "Bước 3: CCCD" : "Kết quả"}</p>
    {expiresAt > 0 && phase !== "result" && <p role="status">{expired ? "Phiên đã hết hạn. Hãy bắt đầu lại." : `Còn ${remaining} giây để hoàn tất phiên.`}</p>}
    {error && <div className="hf-face-error" role="alert">{error}</div>}
    {phase === "scan" && <section className="hf-face-scan"><h2>1. Quét khuôn mặt</h2><p>Đủ sáng, tháo kính tối màu. Thực hiện đúng hướng rồi giữ đầu ổn định.</p>
      <label className="hf-face-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} /><span>Tôi đồng ý xử lý CCCD và khuôn mặt để xác minh. CCCD chỉ tôi và ADMIN được xem. Selfie đã xác minh được chia sẻ với đối tác khi cả hai hoàn tất phí kết nối.</span></label>
      {!camera && <button disabled={!consent || busy} onClick={() => void open("face")}>Mở camera</button>}
    </section>}
    {phase === "selfie" && <section className="hf-face-scan"><h2>2. Chụp selfie trực tiếp</h2><p>Nhìn thẳng, giữ trọn khuôn mặt trong khung rồi bấm chụp. Selfie phải khớp người vừa quét.</p>{!camera && <button disabled={expired} onClick={() => void open("face")}>Mở lại camera selfie</button>}</section>}
    {phase === "documents" && <><section className="hf-face-scan"><h2>Selfie đã khớp phiên quét</h2><div className="hf-face-preview"><Preview file={selfie} label="Selfie vừa chụp" /></div></section>
      <p>Chụp rõ cả hai mặt CCCD, đủ bốn góc và chừa một khoảng viền trên nền tương phản. Số CCCD sẽ được đọc tự động; bạn không nhập hoặc sửa số trực tiếp.</p>
      <div className="hf-face-grid">{(["front", "back"] as const).map(target => <section key={target} ref={target === "back" ? backStep : undefined}><h2>{target === "front" ? "Mặt trước CCCD" : "Mặt sau CCCD"}</h2>
        <div className="hf-face-preview"><Preview file={files[target]} label={target === "front" ? "Mặt trước CCCD" : "Mặt sau CCCD"} /></div>
        <div className="hf-face-actions"><button disabled={busy || expired} onClick={() => void open(target)}>Chụp CCCD</button><label className={busy || expired ? "hf-disabled" : ""}>Chọn ảnh CCCD<input type="file" accept="image/jpeg,image/png" disabled={busy || expired} onChange={e => { const f = e.target.files?.[0]; if (f) void select(target, f); e.target.value = ""; }} /></label></div></section>)}</div>
      <button ref={submitStep} className="hf-face-submit" disabled={busy || expired || !files.front || !files.back} onClick={() => void finish()}>{busy ? "Đang đối chiếu hồ sơ…" : "Xác minh hồ sơ"}</button></>}
    {camera === "face" && <div className="hf-face-camera"><div className={`hf-live-view ${camera === "face" ? "hf-mirror" : ""}`}><video ref={video} autoPlay muted playsInline />{camera === "face" && <div className="hf-live-oval" />}</div>
      <><h3>{phase === "selfie" ? "Nhìn thẳng để chụp selfie" : scan ? directions[scan.step] : "Nhìn thẳng vào camera"}</h3><p aria-live="polite">{phase === "scan" ? scan?.message || "Nhấn bắt đầu quét." : "Không dùng ảnh chụp sẵn; hãy chụp trực tiếp bằng camera."}</p>
        <div className="hf-face-actions">{phase === "scan" ? <button disabled={busy || !consent} onClick={() => void begin()}>{busy ? "Đang quét…" : "Bắt đầu quét"}</button> : <button disabled={busy || expired} onClick={() => void captureSelfie()}>{busy ? "Đang kiểm tra…" : "Chụp selfie"}</button>}</div></>
    </div>}
    {(camera === "front" || camera === "back") && <DocumentCamera title={camera === "front" ? "Chụp mặt trước CCCD" : "Chụp mặt sau CCCD"} onClose={() => void dismissDocument()}>
      {error && <div className="hf-face-error" role="alert">{error}</div>}
      {draft ? <><div className="hf-document-review"><Preview file={draft} label="Ảnh CCCD vừa chụp, chưa lưu" /></div>
        <p>Kiểm tra đủ bốn góc, chữ rõ nét và không bị loá trước khi lưu.</p>
        <div className="hf-face-actions"><button disabled={closing} onClick={saveDocument}>Lưu</button><button disabled={closing} onClick={() => void open(camera)}>Huỷ / chụp lại</button></div></>
      : <><div className="hf-live-view"><video ref={video} autoPlay muted playsInline /><div className="hf-document-guide" aria-hidden="true" /></div>
        <p>Đặt CCCD nằm ngang trong khung, giữ đủ bốn góc trên nền tương phản.</p>
        <div className="hf-face-actions"><button disabled={capturing || closing} onClick={() => void captureDocument()}>{capturing ? "Đang chụp…" : "Chụp ảnh"}</button></div></>}
    </DocumentCamera>}
    {(expiresAt > 0 || busy || phase === "result") && <button className="hf-face-back" onClick={reset}>Hủy / bắt đầu lại</button>}
    {result && <section className={`hf-face-result ${result.status === "REJECTED" ? "hf-no-match" : "hf-match"}`} aria-live="polite"><h2>{result.identityVerified ? "Xác minh thành công" : result.status === "REJECTED" ? "Cần thực hiện lại" : "Cần kiểm tra bổ sung"}</h2><p>{result.message}</p><div className="hf-onboarding-actions"><Link to="/profile">Xem hồ sơ, selfie và số CCCD</Link><Link to={next}>Tiếp tục</Link></div></section>}
  </main>;
}
