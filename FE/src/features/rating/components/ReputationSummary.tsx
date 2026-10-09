import type { RatingAggregate } from "../../../types/rating";
export default function ReputationSummary({ value, label }: { value?: RatingAggregate; label: string }) {
  return <section className="rounded-2xl border border-[#c5e4e8] bg-[#f2fafb] p-4">
    <h3 className="text-xs font-extrabold uppercase tracking-wide text-[#547982]">{label}</h3>
    <p className="mt-2 text-xl font-black text-[#007f95]">{value?.averageRating == null ? "Chưa có đánh giá" : `${value.averageRating.toFixed(2)}/5 ★`}</p>
    <p className="mt-1 text-xs font-bold text-slate-500">{value?.ratingCount ?? 0} đánh giá · {value?.successfulMatchCount ?? 0} kết nối thành công</p>
  </section>;
}
