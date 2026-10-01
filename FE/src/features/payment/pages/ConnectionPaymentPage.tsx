import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import { useNotifications } from "../../../context/NotificationContext";
import { paymentService } from "../../../services/paymentService";
import type { ConnectionPayment, PaymentMethod, PaymentStatus } from "../../../types/payment";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import { formatJobDate, formatVnd } from "../../jobs/utils/jobFormat";

const methods: Array<{ value: PaymentMethod; label: string; short: string; className: string }> = [
  { value: "MOMO", label: "Ví MoMo", short: "MoMo", className: "bg-[#a50064] text-white" },
  { value: "ZALOPAY", label: "ZaloPay", short: "ZaloPay", className: "bg-[#0068ff] text-white" },
  { value: "BANK_TRANSFER", label: "Chuyển khoản ngân hàng", short: "BANK", className: "bg-[#007f95] text-white" },
];

function paymentStatusLabel(status: PaymentStatus) {
  if (status === "PAID") return "Đã thanh toán";
  if (status === "REFUNDED") return "Đã hoàn phí";
  return "Chưa thanh toán";
}

function overallStatusLabel(payment: ConnectionPayment) {
  if (payment.status === "REFUNDED") return "Đã hoàn phí";
  if (payment.connectionSucceeded) return "Kết nối thành công";
  if (payment.currentUserPaymentStatus === "PAID") return "Đã trả phí · chờ đối phương";
  return "Chờ bạn thanh toán";
}

function statusPill(status: PaymentStatus) {
  if (status === "PAID") return "bg-emerald-100 text-emerald-700";
  if (status === "REFUNDED") return "bg-slate-100 text-slate-600";
  return "bg-amber-100 text-amber-700";
}

export default function ConnectionPaymentPage() {
  const { matchId = "" } = useParams();
  const navigate = useNavigate();
  const { subscribeNotifications } = useNotifications();
  const [payment, setPayment] = useState<ConnectionPayment | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("MOMO");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [justPaid, setJustPaid] = useState(false);

  const load = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    setError("");
    try {
      const result = await paymentService.getConnectionPayment(matchId);
      setPayment(result);
      if (result.currentUserPaymentMethod) setMethod(result.currentUserPaymentMethod);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể tải thông tin thanh toán."));
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => subscribeNotifications((notification) => {
    if (notification.referenceId === matchId
        && (notification.type === "PAYMENT_RECEIVED" || notification.type === "CONNECTION_SUCCEEDED")) {
      void load();
    }
  }), [matchId, load, subscribeNotifications]);

  async function handlePay() {
    if (!payment || payment.currentUserPaymentStatus !== "PENDING" || payment.status === "REFUNDED") return;
    setBusy(true);
    setError("");
    try {
      const result = await paymentService.payConnectionFee(payment.matchId, method);
      setPayment(result);
      setJustPaid(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể thanh toán phí kết nối lúc này."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="grid min-h-[55dvh] place-items-center rounded-3xl border border-slate-200 bg-white text-sm font-bold text-slate-500">Đang tải thanh toán...</div>;
  }

  if (!payment) {
    return (
      <section className="hf-page hf-page-connection-payment mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500"><AppIcon name="info" className="h-7 w-7" /></div>
        <h1 className="mt-4 text-xl font-black">Không thể mở thanh toán</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{error || "Matching không tồn tại hoặc bạn không có quyền truy cập."}</p>
        <button type="button" onClick={() => navigate(-1)} className="mt-5 min-h-11 rounded-xl bg-[#007f95] px-5 text-sm font-extrabold text-white">Quay lại</button>
      </section>
    );
  }

  const connectionSucceeded = payment.connectionSucceeded && payment.chatUnlocked;
  const currentUserPaid = payment.currentUserPaymentStatus === "PAID";
  const backTo = payment.currentUserIsConsumer ? "/candidates" : "/saved";
  const currentRoleLabel = payment.currentUserIsConsumer ? "Người thuê" : "Người nhận việc";
  const counterpartRoleLabel = payment.currentUserIsConsumer ? "Người nhận việc" : "Người thuê";

  return (
    <div className="hf-page hf-page-connection-payment mx-auto max-w-2xl space-y-5 pb-6">
      <section className="flex items-center justify-between gap-3">
        <Link to={backTo} className="inline-flex min-h-10 items-center gap-2 text-sm font-extrabold text-[#007f95]"><AppIcon name="arrow-left" className="h-4 w-4" /> Quay lại Matching</Link>
        <span className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide ${connectionSucceeded ? "bg-emerald-100 text-emerald-700" : payment.status === "REFUNDED" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700"}`}>{overallStatusLabel(payment)}</span>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#e5f3f6] text-[#007f95]"><AppIcon name="briefcase" className="h-7 w-7" /></div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#789198]">Matching đã xác nhận</p>
            <h1 className="mt-1 break-words text-xl font-black sm:text-2xl">{payment.jobTitle}</h1>
            <p className="mt-2 flex items-start gap-2 text-sm font-bold text-slate-500"><AppIcon name="location" className="mt-0.5 h-4 w-4 shrink-0 text-[#007f95]" />{payment.location}</p>
            <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-500"><AppIcon name="calendar" className="h-4 w-4 text-[#007f95]" />{formatJobDate(payment.scheduledDate, payment.startTime)}</p>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      {connectionSucceeded && (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-center sm:p-7">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><AppIcon name="check" className="h-8 w-8" /></div>
          <h2 className="mt-4 text-xl font-black text-emerald-900">Kết nối thành công!</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-emerald-800">Hai bên đã hoàn tất phí kết nối. Bạn có thể bắt đầu trò chuyện.</p>
          <Link to={`/messages/match/${payment.matchId}`} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#007f95] px-5 text-sm font-extrabold text-white"><AppIcon name="chat" className="h-4 w-4" /> Mở phòng chat</Link>
        </section>
      )}

      {!connectionSucceeded && currentUserPaid && (justPaid || payment.currentUserPaidAt) && (
        <section className="rounded-3xl border border-sky-200 bg-sky-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-700"><AppIcon name="check" className="h-5 w-5" /></div>
            <div>
              <h2 className="font-black text-sky-950">Bạn đã thanh toán {formatVnd(payment.currentUserFee)}</h2>
              <p className="mt-1 text-sm leading-6 text-sky-800">Đang chờ {counterpartRoleLabel.toLowerCase()} hoàn tất phí của họ. Chat chỉ được mở khi cả hai phía đều đã thanh toán.</p>
            </div>
          </div>
        </section>
      )}

      <section>
        <p className="px-1 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Phí kết nối hai phía</p>
        <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
            <div>
              <p className="font-extrabold">Người thuê</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Phí kết nối phía Consumer</p>
            </div>
            <div className="text-right">
              <p className="font-black">{formatVnd(payment.consumerFee)}</p>
              <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusPill(payment.consumerPaymentStatus)}`}>{paymentStatusLabel(payment.consumerPaymentStatus)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-slate-100 p-4 sm:p-5">
            <div>
              <p className="font-extrabold">Người nhận việc</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Phí kết nối phía Provider</p>
            </div>
            <div className="text-right">
              <p className="font-black">{formatVnd(payment.providerFee)}</p>
              <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusPill(payment.providerPaymentStatus)}`}>{paymentStatusLabel(payment.providerPaymentStatus)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-[#f1f8f9] p-4 sm:p-5">
            <div>
              <p className="text-lg font-black">Tổng phí nền tảng</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Chỉ hoàn tất kết nối khi đủ cả hai khoản</p>
            </div>
            <p className="text-xl font-black text-[#007f95]">{formatVnd(payment.platformFee)}</p>
          </div>
        </div>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold leading-5 text-slate-500">
          Mỗi phía tự thanh toán phần phí của mình: người thuê {formatVnd(payment.consumerFee)}, người nhận việc {formatVnd(payment.providerFee)}. Đây vẫn là thanh toán mô phỏng cho MVP; chưa gọi cổng MoMo/ZaloPay/ngân hàng thật.
        </div>
      </section>

      {!currentUserPaid && payment.status !== "REFUNDED" && (
        <section>
          <div className="flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Phương thức thanh toán</p>
              <p className="mt-1 text-sm font-bold text-slate-700">{currentRoleLabel} thanh toán <span className="text-[#007f95]">{formatVnd(payment.currentUserFee)}</span></p>
            </div>
          </div>
          <div className="mt-3 space-y-3">
            {methods.map((item) => {
              const selected = method === item.value;
              return (
                <button key={item.value} type="button" onClick={() => setMethod(item.value)} className={`flex min-h-20 w-full items-center justify-between gap-4 rounded-2xl border-2 bg-white p-4 text-left transition ${selected ? "border-[#007f95] shadow-sm" : "border-slate-200 hover:border-slate-300"}`}>
                  <span className="flex min-w-0 items-center gap-4"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[10px] font-black ${item.className}`}>{item.short}</span><span className="font-extrabold">{item.label}</span></span>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${selected ? "border-[#007f95]" : "border-slate-300"}`}>{selected && <span className="h-3 w-3 rounded-full bg-[#007f95]" />}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400"><AppIcon name="check" className="h-4 w-4" /> Mô phỏng thanh toán cho MVP, chưa gọi cổng thanh toán thật</div>
          <button type="button" disabled={busy} onClick={() => void handlePay()} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#007f95] px-6 text-sm font-black text-white shadow-[0_12px_28px_rgba(0,127,149,0.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? "Đang xử lý..." : payment.counterpartPaid ? `Thanh toán ${formatVnd(payment.currentUserFee)} & Hoàn tất kết nối` : `Thanh toán ${formatVnd(payment.currentUserFee)}`}<AppIcon name="send" className="h-4 w-4" />
          </button>
        </section>
      )}

      {currentUserPaid && !connectionSucceeded && payment.status !== "REFUNDED" && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-black text-amber-900">Đang chờ {counterpartRoleLabel.toLowerCase()} thanh toán</h2>
          <p className="mt-2 text-sm leading-6 text-amber-800">Phí của bạn đã được ghi nhận. Chat mở khi phía còn lại hoàn tất phí kết nối.</p>
          <button type="button" onClick={() => void load()} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 text-xs font-extrabold text-amber-800"><AppIcon name="refresh" className="h-4 w-4" /> Cập nhật trạng thái</button>
        </section>
      )}
    </div>
  );
}
