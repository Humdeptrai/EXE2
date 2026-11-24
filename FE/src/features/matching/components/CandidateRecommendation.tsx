import type { Recommendation } from "../../../types/recommendation";
import RecommendationBadge from "../../../components/ui/RecommendationBadge";
import { AppIcon } from "../../../components/ui/AppIcon";
import "./candidate-recommendation.css";

export default function CandidateRecommendation({ value }: { value?: Recommendation | null }) {
  if (!value) return <p className="candidate-rank-unavailable">Chưa có dữ liệu điểm phù hợp.</p>;
  // Visual tiers only: retain the score calculated by the server.
  const rank = value.score >= 95 ? { key: "diamond", label: "Kim cương" }
    : value.score >= 85 ? { key: "platinum", label: "Bạch kim" }
    : value.score >= 75 ? { key: "gold", label: "Vàng" }
    : value.score >= 60 ? { key: "silver", label: "Bạc" }
    : { key: "bronze", label: "Đồng" };
  return <section className={`candidate-rank candidate-rank-${rank.key}`} aria-label="Điểm phù hợp và lịch sử kết nối">
    <div className="candidate-rank-hero">
      <div className="candidate-rank-crest" aria-hidden="true">
        <svg viewBox="0 0 64 72" fill="none"><path d="M32 3 55 14v24c0 14-15 25-23 30C24 63 9 52 9 38V14L32 3Z" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="2" /><path d="m32 16 5 10 11 2-8 8 2 12-10-6-10 6 2-12-8-8 11-2 5-10Z" fill="currentColor" /><path d="M5 25 2 38l6 13M59 25l3 13-6 13M17 58l-6-3M47 58l6-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </div>
      <div className="candidate-rank-score">
        <span className="candidate-rank-eyebrow">Điểm phù hợp</span>
        <p><strong>{value.score}</strong><span>/100</span></p>
        <span className="candidate-rank-tier">{rank.label}</span>
      </div>
      {value.limitedData && <span className="candidate-rank-limited">Ít dữ liệu</span>}
    </div>
    <details className="candidate-rank-explanation">
      <summary>Điểm này có ý nghĩa gì? <AppIcon name="info" className="h-4 w-4" /></summary>
      <div className="candidate-rank-copy">
        <p>Điểm đề xuất từ lịch sử của ứng viên cho loại công việc này: rating nhận việc chiếm 45%, lịch sử cùng loại việc 35%, kinh nghiệm kết nối 20%.</p>
        <p>Khung hạng chỉ minh họa điểm: Đồng dưới 60 · Bạc 60–74 · Vàng 75–84 · Bạch kim 85–94 · Kim cương từ 95. Đây không phải hạng được chứng nhận hay tỷ lệ hoàn thành công việc.</p>
        <RecommendationBadge value={value} role="working" />
      </div>
    </details>
    <div className="candidate-rank-signals">
      <details>
        <summary><AppIcon name="briefcase" className="h-5 w-5" /><strong>{value.sameCategoryConnections}</strong><span>Lịch sử kết nối cùng loại công việc</span><small>Xem ý nghĩa <span aria-hidden="true">＋</span></small></summary>
        <div className="candidate-rank-copy">
          <p>Ứng viên đã có <strong>{value.sameCategoryConnections} kết nối thành công</strong> trong cùng danh mục với bài đăng này.</p>
          <p>Chỉ số cùng loại việc: <strong>{value.categoryScore.toFixed(1)}/100</strong>, có trọng số <strong>35%</strong> trong tổng điểm. Số kết nối này phản ánh lịch sử, không phải chứng nhận kỹ năng hay số công việc đã hoàn thành.</p>
        </div>
      </details>
      <details>
        <summary><AppIcon name="chat" className="h-5 w-5" /><strong>{value.successfulConnections}</strong><span>Kinh nghiệm kết nối thành công</span><small>Xem ý nghĩa <span aria-hidden="true">＋</span></small></summary>
        <div className="candidate-rank-copy">
          <p>Ứng viên có tổng cộng <strong>{value.successfulConnections} kết nối nhận việc thành công</strong> ở tất cả danh mục. Các kết nối cùng loại ở ô bên cạnh nằm trong tổng này.</p>
          <p>Chỉ số kinh nghiệm: <strong>{value.experienceScore.toFixed(1)}/100</strong>, có trọng số <strong>20%</strong> trong tổng điểm. Kết nối thành công được ghi nhận khi hai bên hoàn tất phí kết nối; không đồng nghĩa đã hoàn thành công việc.</p>
        </div>
      </details>
    </div>
  </section>;
}
