import { useEffect, useRef, useState } from "react";
import api from "../../../config/axios";
import type { ApiResponse } from "../../../types/api";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import "./FaceComparisonPage.css";

type Comparison = { decision: "MATCH" | "NO_MATCH"; cosineScore: number; threshold: number; message: string };
type Slot = "front" | "face";

async function normalize(file: Blob): Promise<File> {
  if (file.size > 10 * 1024 * 1024) throw new Error("Ảnh tối đa 10 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width < 320 || bitmap.height < 240 || bitmap.width * bitmap.height > 16000000)
      throw new Error("Ảnh cần rõ nét, từ 320 × 240 và không quá 16 triệu điểm ảnh.");
    const ratio = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Trình duyệt chưa hỗ trợ xử lý ảnh.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      value => value ? resolve(value) : reject(new Error("Không xử lý được ảnh.")), "image/jpeg", 0.92));
    return new File([blob], "image.jpg", { type: "image/jpeg" });
  } finally { bitmap.close(); }
}
function Preview({ file, label }: { file: File | null; label: string }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!file || !image.current) return;
    const next = URL.createObjectURL(file);
    image.current.src = next;
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return file ? <img ref={image} alt={label} /> : <p>Chưa có ảnh</p>;
}
export default function FaceComparisonPage() {
  const [files, setFiles] = useState<Record<Slot, File | null>>({ front: null, face: null });
  const [slot, setSlot] = useState<Slot | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Comparison | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const cameraAttempt = useRef(0);
  useEffect(() => () => { cameraAttempt.current++; stream.current?.getTracks().forEach(track => track.stop()); }, []);
  function stopCamera() {
    cameraAttempt.current++;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null; setSlot(null);
  }
  async function startCamera(target: Slot) {
    stopCamera(); setError("");
    const attempt = ++cameraAttempt.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera cần HTTPS hoặc localhost. Bạn có thể chọn ảnh thay thế.");
      const next = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
        facingMode: { ideal: target === "face" ? "user" : "environment" },
        width: { ideal: 1280 }, height: { ideal: 720 },
      } });
      if (attempt !== cameraAttempt.current) { next.getTracks().forEach(track => track.stop()); return; }
      stream.current = next; setSlot(target);
    } catch { if (attempt === cameraAttempt.current) setError("Không mở được camera. Cho phép truy cập camera, dùng HTTPS hoặc chọn ảnh JPEG/PNG."); }
  }
  useEffect(() => {
    if (slot && video.current && stream.current) {
      video.current.srcObject = stream.current;
      void video.current.play().catch(() => setError("Không phát được camera. Hãy đóng rồi mở lại."));
    }
  }, [slot]);
  async function select(target: Slot, blob: Blob) {
    setError(""); setResult(null);
    try { const file = await normalize(blob); setFiles(previous => ({ ...previous, [target]: file })); }
    catch (e) { setError(e instanceof Error ? e.message : "Không đọc được ảnh."); }
  }
  async function capture() {
    if (!slot || !video.current) return;
    const target = slot, source = video.current;
    if (!source.videoWidth || !source.videoHeight) { setError("Camera chưa sẵn sàng."); return; }
    const canvas = document.createElement("canvas");
    canvas.width = source.videoWidth; canvas.height = source.videoHeight;
    canvas.getContext("2d")?.drawImage(source, 0, 0);
    canvas.toBlob(blob => { if (blob) { stopCamera(); void select(target, blob); } }, "image/jpeg", 0.92);
  }
  async function compare() {
    if (!files.front || !files.face || !consent || busy) return;
    stopCamera(); setBusy(true); setError(""); setResult(null);
    try {
      const body = new FormData();
      body.append("front", files.front); body.append("face", files.face); body.append("consent", "true");
      const response = await api.post<ApiResponse<Comparison>>("/identity/face-comparison", body,
        { headers: { "Content-Type": undefined }, timeout: 90000 });
      setResult(response.data.result);
    } catch (e) { setError(getApiErrorMessage(e, "Chưa đối chiếu được ảnh. Hãy thử lại sau.")); }
    finally { setBusy(false); }
  }
  return <main className="hf-face">
    <a className="hf-face-back" href="/profile">← Hồ sơ của tôi</a>
    <header><span>HANDS FREE · ĐỐI CHIẾU ẢNH</span><h1>Khuôn mặt & CCCD</h1>
      <p>Chụp mặt trước CCCD và khuôn mặt chính diện, đủ sáng, không đeo kính tối màu.</p></header>
    <div className="hf-face-note">Đây là đối chiếu ảnh sơ bộ. Kết quả chưa xác nhận CCCD thật, người đang có mặt hay hoàn tất xác thực tài khoản.</div>
    {error && <div className="hf-face-error" role="alert">{error}</div>}
    <div className="hf-face-grid">{(["front", "face"] as const).map(target => <section key={target}>
      <h2>{target === "front" ? "1. Mặt trước CCCD" : "2. Khuôn mặt của bạn"}</h2>
      <div className="hf-face-preview"><Preview file={files[target]} label={target === "front" ? "Mặt trước CCCD" : "Ảnh khuôn mặt"} /></div>
      <div className="hf-face-actions"><button disabled={busy} onClick={() => void startCamera(target)}>Mở camera</button>
        <label className={busy ? "hf-disabled" : ""}>Chọn ảnh<input type="file" accept="image/jpeg,image/png" disabled={busy}
          onChange={event => { const file = event.target.files?.[0]; if (file) void select(target, file); event.target.value = ""; }} /></label></div>
    </section>)}</div>
    {slot && <section className="hf-face-camera" aria-label="Camera chụp ảnh">
      <video ref={video} autoPlay playsInline muted />
      <div className="hf-face-actions"><button onClick={() => void capture()}>Chụp ảnh</button><button onClick={stopCamera}>Đóng camera</button></div>
    </section>}
    <label className="hf-face-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} />
      <span>Tôi đồng ý gửi hai ảnh đến hệ thống HandsFree để đối chiếu. Ảnh ở bước này được xử lý tạm thời và không lưu vào hồ sơ.</span></label>
    <button className="hf-face-submit" disabled={busy || !files.front || !files.face || !consent} onClick={() => void compare()}>
      {busy ? "Đang đối chiếu…" : "Đối chiếu khuôn mặt"}</button>
    {result && <section className={`hf-face-result ${result.decision === "MATCH" ? "hf-match" : "hf-no-match"}`} aria-live="polite">
      <h2>{result.decision === "MATCH" ? "Ảnh có dấu hiệu khớp" : "Ảnh chưa khớp"}</h2><p>{result.message}</p>
      <p>Điểm so khớp: <strong>{result.cosineScore.toFixed(3)}</strong> · Ngưỡng: {result.threshold.toFixed(3)}</p>
      <small>Điểm này không phải phần trăm xác thực. Tài khoản vẫn cần hoàn tất quy trình xác thực danh tính.</small>
    </section>}
  </main>;
}
