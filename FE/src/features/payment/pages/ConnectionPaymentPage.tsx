import CounterpartIdentity from "../../identity/components/CounterpartIdentity";
import UserNotice from "../../../components/feedback/UserNotice";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { paymentService } from "../../../services/paymentService";
import { walletService } from "../../../services/walletService";
import type { ConnectionPayment } from "../../../types/payment";
import { formatVnd } from "../../jobs/utils/jobFormat";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import { useNotifications } from "../../../context/NotificationContext";
export default function ConnectionPaymentPage() {
  const { matchId } = useParams();
  const { subscribeNotifications } = useNotifications();
  const [payment, setPayment] = useState<ConnectionPayment | null>(null);
  const [balance, setBalance] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!matchId) return;
    try {
      const [p, w] = await Promise.all([
        paymentService.getConnectionPayment(matchId),
        walletService.summary(),
      ]);
      setPayment(p);
      setBalance(w.balance);
    } catch (e) {
      setError(getApiErrorMessage(e, "Không thể tải phí kết nối."));
    }
  }, [matchId]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(
    () =>
      subscribeNotifications((n) => {
        if (n.referenceId === matchId) void load();
      }),
    [subscribeNotifications, matchId, load],
  );
  async function pay() {
    if (lock.current || !payment) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      setPayment(
        await paymentService.payConnectionFee(payment.matchId, "WALLET"),
      );
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e, "Không thể trừ phí. Kiểm tra số dư ví."));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const paid = payment?.currentUserPaymentStatus === "PAID";
  const open = payment?.connectionSucceeded && payment.chatUnlocked;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to="/wallet" className="font-bold text-[#007f95]">
        Ví của tôi · {formatVnd(balance)}
      </Link>
      <h1 className="text-2xl font-black">Mở liên hệ và trò chuyện</h1>
      {error && (
        <UserNotice message={error} error />
      )}
      {payment ? (
        <>
          <section className="rounded-3xl border bg-white p-5">
            <h2 className="text-lg font-black">{payment.jobTitle}</h2>
            <p className="mt-2 text-sm text-slate-500">
              Phí tính theo matching này. Hai bên cần hoàn tất phí để mở liên
              hệ.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#eef8fa] p-4">
                <p className="text-sm">Người thuê</p>
                <p className="mt-1 font-black text-[#007f95]">
                  {formatVnd(payment.consumerFee)}
                </p>
                <p className="mt-2 text-xs">
                  {payment.consumerPaymentStatus === "PAID"
                    ? "Đã trả phí"
                    : "Chưa trả phí"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#eef8fa] p-4">
                <p className="text-sm">Người nhận việc</p>
                <p className="mt-1 font-black text-[#007f95]">
                  {formatVnd(payment.providerFee)}
                </p>
                <p className="mt-2 text-xs">
                  {payment.providerPaymentStatus === "PAID"
                    ? "Đã trả phí"
                    : "Chưa trả phí"}
                </p>
              </div>
            </div>
          </section>
          {payment.status === "REFUNDED" ? (
            <p className="rounded-xl bg-amber-50 p-4">
              Phí đã được hoàn vào ví. Kết nối này đã khóa.
            </p>
          ) : open ? (
            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="text-lg font-black">Kết nối đã mở</h2>
              <p className="mt-3 font-bold">{payment.counterpart.fullName}</p>
              <CounterpartIdentity person={payment.counterpart} />
              {payment.counterpart.phone && (
                <a
                  className="mt-2 block text-[#007f95]"
                  href={`tel:${payment.counterpart.phone}`}
                >
                  Điện thoại: {payment.counterpart.phone}
                </a>
              )}
              {payment.counterpart.email && (
                <a
                  className="mt-2 block break-all text-[#007f95]"
                  href={`mailto:${payment.counterpart.email}`}
                >
                  Email: {payment.counterpart.email}
                </a>
              )}
              <Link
                to={`/messages/match/${payment.matchId}`}
                className="mt-4 inline-block rounded-xl bg-[#007f95] px-5 py-3 font-bold text-white"
              >
                Mở chat
              </Link>
            </section>
          ) : paid ? (
            <section className="rounded-3xl bg-amber-50 p-5">
              <h2 className="font-black">Bạn đã trả phí · Chờ phía còn lại</h2>
              <p className="mt-2 text-sm">
                Thông tin liên hệ vẫn được khóa đến khi cả hai hoàn tất.
              </p>
              <button
                onClick={() => void load()}
                className="mt-4 rounded-xl border px-4 py-2 text-[#007f95]"
              >
                Cập nhật trạng thái
              </button>
            </section>
          ) : (
            <section className="rounded-3xl border bg-white p-5">
              <p className="font-bold">
                Phí của bạn: {formatVnd(payment.currentUserFee)}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Trừ từ số dư ví. Không bao gồm tiền công trả cho người nhận
                việc.
              </p>
              {balance < payment.currentUserFee && (
                <Link
                  to="/wallet"
                  className="mt-3 block font-bold text-[#007f95]"
                >
                  Số dư chưa đủ · Nạp tiền vào ví
                </Link>
              )}
              <button
                disabled={busy || balance < payment.currentUserFee}
                onClick={() => void pay()}
                className="mt-4 min-h-12 w-full rounded-xl bg-[#007f95] font-bold text-white disabled:opacity-40"
              >
                {busy
                  ? "Đang xử lý..."
                  : `Xác nhận trừ ${formatVnd(payment.currentUserFee)}`}
              </button>
            </section>
          )}
          <Link
            to={`/reports?targetType=${payment.connectionSucceeded ? "MATCH" : "SUPPORT"}&targetId=${payment.matchId}`}
            className="inline-block text-sm text-[#007f95]"
          >
            {payment.connectionSucceeded ? "Báo cáo đối tác" : "Yêu cầu hỗ trợ thanh toán"}
          </Link>
        </>
      ) : (
        !error && <p>Đang tải...</p>
      )}
    </div>
  );
}
