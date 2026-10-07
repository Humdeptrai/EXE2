import UserNotice from "../feedback/UserNotice";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppIcon } from "./AppIcon";

interface ImageViewerProps {
  image: { url: string; name: string };
  onClose: () => void;
}

export default function ImageViewer({ image, onClose }: ImageViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => {
      const img = imageRef.current;
      if (!img?.naturalWidth || !img.naturalHeight) return;
      const scale = Math.min(1, viewport.clientWidth / img.naturalWidth, viewport.clientHeight / img.naturalHeight);
      setSize({ width: img.naturalWidth * scale, height: img.naturalHeight * scale });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  function fitSize(width: number, height: number) {
    const viewport = viewportRef.current;
    const scale = Math.min(1, (viewport?.clientWidth || window.innerWidth) / width,
      (viewport?.clientHeight || window.innerHeight) / height);
    setSize({ width: width * scale, height: height * scale });
  }

  async function downloadImage() {
    if (downloading) return;
    setDownloading(true);
    setDownloadError("");
    try {
      const response = await fetch(image.url);
      if (!response.ok) throw new Error("Image download failed");
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = image.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setDownloadError("Không thể tải trực tiếp. Bạn có thể mở ảnh gốc để lưu.");
    } finally {
      setDownloading(false);
    }
  }

  return createPortal(
    <dialog ref={dialogRef} aria-label={`Xem ảnh: ${image.name}`} onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-white backdrop:bg-black/70 backdrop:backdrop-blur-xl">
      <div className="flex h-full flex-col bg-black/10">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-5">
          <p className="min-w-0 flex-1 truncate text-sm font-bold drop-shadow">{image.name}</p>
          <div className="flex flex-wrap items-center justify-end gap-1 rounded-full bg-black/25 p-1 backdrop-blur-md">
            <button type="button" disabled={zoom <= 0.5 || !size} onClick={() => setZoom((value) => Math.max(0.5, value - 0.5))} aria-label="Thu nhỏ ảnh" className="h-11 w-11 rounded-full bg-white/15 text-xl disabled:opacity-30">−</button>
            <label className="relative">
              <span className="sr-only">Mức phóng to ảnh</span>
              <select value={zoom} onChange={(event) => setZoom(Number(event.target.value))} aria-label="Mức phóng to ảnh" className="h-11 rounded-full border-0 bg-white/15 px-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#74d9e6]">
                {[0.5, 1, 1.5, 2, 2.5, 3].map((value) => <option key={value} value={value} className="bg-[#164952] text-white">{Math.round(value * 100)}%</option>)}
              </select>
            </label>
            <button type="button" disabled={zoom >= 3 || !size} onClick={() => setZoom((value) => Math.min(3, value + 0.5))} aria-label="Phóng to ảnh" className="h-11 w-11 rounded-full bg-white/15 text-xl disabled:opacity-30">+</button>
            <button type="button" onClick={() => void downloadImage()} disabled={downloading} aria-label="Tải ảnh gốc" title="Tải ảnh gốc" className="grid h-11 w-11 place-items-center rounded-full bg-white/15 disabled:opacity-40">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" /></svg>
            </button>
            <button type="button" onClick={onClose} aria-label="Đóng xem ảnh" autoFocus className="grid h-11 w-11 place-items-center rounded-full bg-white/20"><AppIcon name="close" className="h-5 w-5" /></button>
          </div>
        </header>
        <div ref={viewportRef} className="min-h-0 flex-1 overflow-auto overscroll-contain">
          {failed ? <UserNotice message="Không thể tải ảnh. Bạn có thể thử mở ảnh gốc." error className="hf-notice-inset" /> : (
            <div className="grid min-h-full min-w-full place-items-center" style={size ? { width: size.width * zoom, height: size.height * zoom } : undefined}>
              <img ref={imageRef} src={image.url} alt={image.name} onLoad={(event) => fitSize(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
                onError={() => setFailed(true)} className="block object-contain" style={size ? { width: size.width * zoom, height: size.height * zoom, maxWidth: "none" } : { maxWidth: "100%", maxHeight: "75dvh" }} />
            </div>
          )}
        </div>
        <footer className="shrink-0 px-3 py-2 text-center text-xs text-white/85">
          {downloadError && <UserNotice message={downloadError} error className="hf-notice-space-bottom" />}
          <span>Phóng to rồi cuộn để xem ảnh · Escape để đóng</span>
          <a href={image.url} target="_blank" rel="noopener noreferrer" className="ml-3 underline underline-offset-2">Mở ảnh gốc</a>
        </footer>
      </div>
    </dialog>, document.body,
  );
}
