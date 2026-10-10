import { Link } from "react-router-dom";
import type { MyIdentity, IdentityProgress } from "../../../services/identityService";
import PrivateIdentityImage from "./PrivateIdentityImage";
export default function IdentityPrivateFields({ state, progress }: { state: MyIdentity | null; progress?: IdentityProgress | null }) {
  return <>
    <div className="min-w-0 rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-bold text-slate-400">Selfie xác minh</p>
      <p className={`my-2 text-sm font-bold ${(state?.selfieVerified || progress?.selfiePassed) ? "text-emerald-700" : "text-red-600"}`}>{(state?.selfieVerified || progress?.selfiePassed) ? "✓ Selfie đã đạt và lưu" : "! Chưa có selfie đã xác minh"}</p>
      {(state?.selfieUrl || progress?.selfieUrl) && <PrivateIdentityImage path={(state?.selfieUrl || progress?.selfieUrl)!} alt="Selfie của bạn" />}
      <p className="mt-2 text-xs leading-5 text-slate-500">Selfie khác ảnh đại diện. Chỉ đối tác đã mở kết nối sau thanh toán mới xem được.</p>
      <Link className="inline-flex min-h-11 items-center font-bold text-[#007f95]" to="/face-comparison">{(state?.selfieVerified || progress?.selfiePassed) ? "Cập nhật hồ sơ xác minh" : "Chụp selfie và xác minh"}</Link>
    </div>
    <div className="min-w-0 rounded-2xl border border-slate-200 p-4">
      <label className="text-xs font-bold text-slate-400" htmlFor="private-document-number">Số CCCD · Chỉ bạn và ADMIN</label>
      <input id="private-document-number" readOnly value={state?.documentNumber || progress?.documentNumber || ""} placeholder="Chưa trích xuất được số CCCD" className="mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" />
      <p className={`mt-2 text-sm font-bold ${state?.documentConfirmed ? "text-emerald-700" : "text-red-600"}`}>{state?.documentConfirmed ? "✓ Đã xác nhận" : progress?.documentNumber ? "Số đã đọc từ mặt trước; chờ hoàn tất đối chiếu" : "! Chưa xác nhận số CCCD"}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">Nếu số chưa đúng, chụp lại CCCD hoặc liên hệ ADMIN để đối chiếu và sửa. Bạn không thể sửa trực tiếp.</p>
      {state?.pendingReplacement && <p className="mt-2 text-xs text-amber-700">Bản cập nhật đang chờ xử lý. Hồ sơ đã xác minh trước đó vẫn được giữ.</p>}
    </div>
  </>;
}
