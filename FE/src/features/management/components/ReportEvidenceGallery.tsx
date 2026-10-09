import { useEffect, useState } from "react";
import api from "../../../config/axios";
import type { ReportEvidence } from "../../../types/report";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import UserNotice from "../../../components/feedback/UserNotice";

function PrivateMedia({ file }: { file: ReportEvidence }) {
  const video = file.contentType === "video/mp4";
  const [requested, setRequested] = useState(!video);
  const [url, setUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!requested) return;
    const controller = new AbortController(); let blobUrl = "";
    void api.get<Blob>(file.path, { responseType: "blob", signal: controller.signal, timeout: 600000,
      onDownloadProgress: event => { if (event.total && !controller.signal.aborted) setProgress(Math.round(event.loaded * 100 / event.total)); },
    }).then(result => {
      if (!controller.signal.aborted) { blobUrl = URL.createObjectURL(result.data); setUrl(blobUrl); }
    }).catch(e => { if (!controller.signal.aborted) setError(getApiErrorMessage(e, "Không tải được bằng chứng.")); });
    return () => { controller.abort(); if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [requested, file.path, attempt]);
  return <article className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
    <p className="break-words text-sm font-bold text-slate-700">{file.originalName}</p>
    <p className="text-xs text-slate-500">{video ? "Video MP4" : "Hình ảnh"} · {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB</p>
    {url ? video ? <video src={url} controls playsInline preload="metadata" className="max-h-96 w-full rounded-xl bg-slate-950" /> :
      <a href={url} target="_blank" rel="noopener noreferrer" className="block"><img src={url} alt={file.originalName} className="max-h-72 w-full rounded-xl bg-slate-50 object-contain" /><span className="mt-2 block text-xs font-bold text-[#007f95]">Xem ảnh gốc</span></a>
      : !requested ? <button type="button" onClick={() => setRequested(true)} className="min-h-11 rounded-xl bg-[#007f95] px-4 text-sm font-bold text-white">Tải và xem video</button>
      : !error && <p role="status" className="text-sm text-slate-500">Đang tải bằng chứng… {progress}%</p>}
    {error && <><UserNotice message={error} error /><button type="button" className="min-h-11 text-sm font-bold text-[#007f95]" onClick={() => { setError(""); setProgress(0); setAttempt(v => v + 1); }}>Thử lại</button></>}
    {url && <a href={url} download={file.originalName} className="inline-flex min-h-11 items-center text-sm font-bold text-[#007f95]">Tải bằng chứng</a>}
  </article>;
}
export default function ReportEvidenceGallery({ evidence, links }: { evidence: ReportEvidence[]; links: string[] }) {
  return <section className="space-y-3">
    <h3 className="font-extrabold text-slate-800">Bằng chứng đính kèm</h3>
    {!evidence.length && !links.length && <p className="text-sm text-slate-500">Người gửi không đính kèm bằng chứng.</p>}
    <div className="grid gap-3 sm:grid-cols-2">{evidence.map(file => <PrivateMedia key={file.id} file={file} />)}</div>
    {links.map((link, index) => /^https?:\/\//i.test(link) && <a key={link} href={link} target="_blank" rel="noopener noreferrer" className="block break-all rounded-xl border border-[#c5e4e8] bg-[#f2fafb] p-3 text-sm font-bold text-[#007f95]">Link {index + 1}: {link}</a>)}
  </section>;
}
