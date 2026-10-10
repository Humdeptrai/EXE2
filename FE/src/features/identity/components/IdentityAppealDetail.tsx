import type { IdentityAppeal } from "../../../services/identityAppealService";
import { appealLabels } from "../../../services/identityAppealService";
import PrivateIdentityImage from "./PrivateIdentityImage";
export default function IdentityAppealDetail({ appeal }: { appeal: IdentityAppeal }) {
  return <section><h2>{appealLabels[appeal.status] || appeal.status}</h2><p>Ngày gửi: {new Date(appeal.createdAt).toLocaleString("vi-VN")}</p>
    {appeal.resolvedAt && <p>Ngày xử lý: {new Date(appeal.resolvedAt).toLocaleString("vi-VN")}</p>}
    <p>Ghi chú của người dùng: {appeal.note || "Không có"}</p><p>Lý do xử lý: {appeal.reason || "Chưa có kết quả"}</p>
    <p>Họ tên OCR: {appeal.fullName || "Chưa đọc được"}</p><p>Số CCCD: {appeal.documentNumber || "Chưa đọc được"}</p><p>Điểm so khớp: {appeal.similarity ?? "—"}</p>
    <div className="hf-appeal-images">{[["face", "Khuôn mặt đã quét"], ["selfie", "Selfie trực tiếp"], ["front", "Mặt trước CCCD"], ["back", "Mặt sau CCCD"]].map(([kind, alt]) => <figure key={`${appeal.id}-${kind}`}><figcaption>{alt}</figcaption><PrivateIdentityImage path={`/identity/requests/${appeal.id}/images/${kind}`} alt={alt} /></figure>)}</div>
    <p>Đây là ảnh trong hồ sơ tại thời điểm gửi yêu cầu.</p>
  </section>;
}
