import { useState } from "react";
import SelfieRetake from "./SelfieRetake";
import { identityService } from "../../../services/identityService";
import { Link } from "react-router-dom";
import type { MyIdentity, IdentityProgress } from "../../../services/identityService";
import PrivateIdentityImage from "./PrivateIdentityImage";
export default function IdentityPrivateFields({ state, progress, onChanged }: { state: MyIdentity | null; progress?: IdentityProgress | null; onChanged?: () => void }) {
  const [updated, setUpdated] = useState<{ base: MyIdentity | null; value: MyIdentity } | null>(null);
  const personal = updated?.base === state ? updated.value : state;
  const [retake, setRetake] = useState(false);
  const [revision, setRevision] = useState(0);
  const photos = [
    { label: "Ảnh quét khuôn mặt", path: personal?.faceUrl || (progress?.scanPassed ? "/identity/progress/images/face" : null) },
    { label: "Selfie xác minh", path: personal?.selfieUrl || progress?.selfieUrl },
    { label: "CCCD mặt trước", path: personal?.frontUrl || progress?.frontUrl },
    { label: "CCCD mặt sau", path: personal?.backUrl || progress?.backUrl },
  ];
  return <>
    <div className="min-w-0 rounded-2xl border border-slate-200 p-4 sm:col-span-2">
      <p className="font-bold text-slate-800">Ảnh xác minh của bạn</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">Bấm ảnh để xem và phóng to. Ảnh quét mặt và CCCD chỉ được xem, không chỉnh sửa tại đây.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">{photos.map(photo => <div key={photo.label} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-3">
        <p className="mb-3 text-xs font-bold text-slate-500">{photo.label}</p>
        {photo.path ? <PrivateIdentityImage path={`${photo.path}?v=${encodeURIComponent(`${personal?.imageRevision || "draft"}-${progress?.version ?? 0}-${revision}`)}`} alt={photo.label} /> : <p className="text-xs text-slate-400">Chưa có ảnh đã lưu</p>}
      </div>)}</div>
      {personal?.verification.status === "VERIFIED" ? <button type="button" disabled={personal.pendingReplacement} onClick={() => setRetake(true)} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#007f95] px-5 font-bold text-white disabled:opacity-50">Chụp lại selfie</button> : <Link className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#007f95] px-5 font-bold text-white" to="/face-comparison">Tiếp tục xác minh</Link>}
      {retake && <SelfieRetake onClose={() => setRetake(false)} onSaved={async () => { setUpdated({ base: state, value: await identityService.mine() }); setRevision(value => value + 1); onChanged?.(); }} />}
    </div>
    <div className="min-w-0 rounded-2xl border border-slate-200 p-4">
      <label className="text-xs font-bold text-slate-400" htmlFor="private-document-name">Họ và tên (CCCD) · Chỉ bạn và ADMIN</label>
      <input id="private-document-name" readOnly value={personal?.documentFullName || ""} placeholder="Chưa đọc được họ tên từ CCCD" className="mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" />
      <p className="mb-4 mt-2 text-xs leading-5 text-slate-500">Họ tên được đọc từ CCCD, độc lập với tên tài khoản. {personal?.verification.status === "VERIFIED" ? "Đã xác minh." : "Chưa xác minh hoàn tất."}</p>
      <label className="text-xs font-bold text-slate-400" htmlFor="private-document-number">Số CCCD · Chỉ bạn và ADMIN</label>
      <input id="private-document-number" readOnly value={personal?.documentNumber || progress?.documentNumber || ""} placeholder="Chưa trích xuất được số CCCD" className="mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" />
      <p className={`mt-2 text-sm font-bold ${personal?.documentConfirmed ? "text-emerald-700" : "text-red-600"}`}>{personal?.documentConfirmed ? "✓ Đã xác nhận" : progress?.documentNumber ? "Số đã đọc từ mặt trước; chờ hoàn tất đối chiếu" : "! Chưa xác nhận số CCCD"}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">Nếu số chưa đúng, liên hệ ADMIN để đối chiếu ảnh CCCD đã lưu và sửa. Bạn không thể sửa trực tiếp.</p>
      {personal?.pendingReplacement && <p className="mt-2 text-xs text-amber-700">Bản cập nhật đang chờ xử lý. Hồ sơ đã xác minh trước đó vẫn được giữ.</p>}
    </div>
  </>;
}
