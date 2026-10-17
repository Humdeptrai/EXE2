import type { Recommendation } from "../../types/recommendation";

export default function RecommendationBadge({ value, role }: { value?: Recommendation | null; role: "hiring" | "working" }) {
  if (!value) return null;
  const mode = role === "hiring" ? "thuê người" : "nhận việc";
  const factors = [
    { name: `Rating ${mode}`, weight: 45, score: value.ratingScore },
    { name: "Cùng loại công việc", weight: 35, score: value.categoryScore },
    { name: "Kinh nghiệm kết nối", weight: 20, score: value.experienceScore },
  ];
  return (
    <details className="min-w-0 rounded-2xl border border-[#bfe0e5] bg-[#f0f9fa] text-left text-slate-700 select-text"
      onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-[#007f95] sm:px-4">
        <span className="text-sm font-extrabold">Điểm đề xuất <strong className="ml-1 text-lg font-black">{value.score}/100</strong></span>
        <span className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          {value.limitedData && <span className="rounded-full bg-white px-2 py-1 text-slate-500">Ít dữ liệu</span>}
          <span className="underline underline-offset-2">Cách tính</span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-[#cbe7eb] px-3 py-3 text-xs leading-5 sm:px-4">
        {factors.map(factor => <div key={factor.name}>
          <div className="flex flex-wrap justify-between gap-x-2"><span>{factor.name} · {factor.weight}%</span><strong>{factor.score.toFixed(1)}/100</strong></div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#dceef1]" aria-hidden="true"><div className="h-full rounded-full bg-[#007f95]" style={{ width: `${factor.score}%` }} /></div>
        </div>)}
        <p>Rating {mode}: <strong>{value.averageRating == null ? "Chưa có đánh giá" : `${value.averageRating.toFixed(2)}/5`}</strong> · {value.ratingCount} lượt đánh giá.</p>
        <p>{value.successfulConnections} kết nối {mode} thành công. Người nhận việc có {value.sameCategoryConnections} kết nối cùng loại việc này.</p>
        <p className="text-slate-500">Điểm dựa trên lịch sử, không phải xác suất hoàn thành công việc; chưa tính lịch rảnh, khoảng cách hoặc kỹ năng. Kết nối thành công không đồng nghĩa đã hoàn thành việc.</p>
        {value.limitedData && <p className="text-slate-500">Chưa đủ 5 đánh giá đúng vai trò. Hệ thống dùng điểm khởi tạo; ít dữ liệu không có nghĩa là không phù hợp.</p>}
      </div>
    </details>
  );
}
