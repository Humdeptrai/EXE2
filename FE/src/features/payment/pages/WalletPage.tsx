import UserNotice from "../../../components/feedback/UserNotice";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import VndInput from "../../../components/ui/VndInput";
import {
  walletService,
  type WalletSummary,
  type WalletEntry,
  type TopUp,
} from "../../../services/walletService";
import { formatVnd } from "../../jobs/utils/jobFormat";
import { getApiErrorMessage } from "../../auth/utils/apiError";
export default function WalletPage() {
  const [query] = useSearchParams();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [orders, setOrders] = useState<TopUp[]>([]);
  const [amount, setAmount] = useState("50000");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const load = useCallback(async () => {
    try {
      const [s, e, o] = await Promise.all([
        walletService.summary(),
        walletService.entries(page),
        walletService.orders(),
      ]);
      setSummary(s);
      setEntries(e.content);
      setLast(e.last);
      setOrders(o.content);
    } catch (err) {
      setError(getApiErrorMessage(err, "Không thể tải ví."));
    }
  }, [page]);
  useEffect(() => {
    let active = true;
    const code = Number(query.get("orderCode"));
    void (async () => {
      try {
        if (Number.isSafeInteger(code) && code > 0)
          await walletService.refresh(code);
      } catch (err) {
        if (active)
          setError(getApiErrorMessage(err, "Đang chờ xác nhận tiền nạp."));
      }
      if (active) void load();
    })();
    return () => {
      active = false;
    };
  }, [load, query]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [load]);
  async function create() {
    if (lock.current || !summary) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const order = await walletService.create(
        Number(amount),
        requestId.current,
      );
      if (order.checkoutUrl) {
        const url = new URL(order.checkoutUrl);
        if (url.protocol !== "https:" || url.hostname !== "pay.payos.vn")
          throw new Error("URL thanh toán không hợp lệ");
        window.location.assign(url.href);
      } else {
        requestId.current = crypto.randomUUID();
        await load();
      }
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Không thể tạo đơn nạp. Vui lòng thử lại cùng số tiền.",
        ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function refresh(code: number) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await walletService.refresh(code);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Không thể đối soát đơn nạp."));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="hf-page hf-page-wallet mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">Ví HandsFree</h1>
        <Link to="/reports" className="text-sm font-bold text-[#007f95]">
          Báo cáo / hỗ trợ
        </Link>
      </div>
      {error && (
        <UserNotice message={error} error />
      )}
      <section className="rounded-3xl bg-[#007f95] p-6 text-white shadow-lg">
        <p className="text-sm">Số dư khả dụng</p>
        <p className="hf-wallet-balance mt-2 text-4xl font-black">
          {summary ? formatVnd(summary.balance) : "Đang tải..."}
        </p>
        <p className="mt-3 text-sm text-white/85">
          Dùng để trả phí mở liên hệ theo từng matching.
        </p>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">Nạp tiền qua payOS</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {[20000, 50000, 100000, 200000].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setAmount(String(v));
                requestId.current = crypto.randomUUID();
              }}
              className="rounded-full border border-[#b7dce2] px-4 py-2 text-sm font-bold text-[#007f95]"
            >
              {formatVnd(v)}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-sm font-bold">
          Số tiền (VNĐ)
          <VndInput
            value={amount}
            onValueChange={(v) => {
              setAmount(v);
              requestId.current = crypto.randomUUID();
            }}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          {summary
            ? `Từ ${formatVnd(summary.minTopUp)} đến ${formatVnd(summary.maxTopUp)}`
            : ""}
        </p>
        <button
          onClick={() => void create()}
          disabled={
            busy ||
            !summary?.topUpEnabled ||
            Number(amount) < summary.minTopUp ||
            Number(amount) > summary.maxTopUp
          }
          className="mt-4 min-h-12 w-full rounded-xl bg-[#007f95] px-4 font-bold text-white disabled:opacity-40"
        >
          {busy
            ? "Đang xử lý..."
            : summary?.topUpEnabled
              ? "Tiếp tục thanh toán"
              : "Nạp tiền chưa được kích hoạt"}
        </button>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Tiền được cộng sau khi máy chủ xác nhận giao dịch. Nếu đã chuyển tiền
          nhưng số dư chưa tăng, chọn kiểm tra đơn nạp bên dưới.
        </p>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">Đơn nạp gần đây</h2>
        <div className="mt-3 space-y-3">
          {orders.map((o) => (
            <article
              key={o.orderCode}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3"
            >
              <div>
                <p className="font-bold">
                  #{o.orderCode} · {formatVnd(o.amount)}
                </p>
                <p className="text-xs text-slate-500">
                  {o.status} · {new Date(o.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
              <div className="flex gap-2">
                {o.checkoutUrl && o.status === "PENDING" && (
                  <a
                    href={o.checkoutUrl}
                    className="rounded-xl border px-3 py-2 text-sm text-[#007f95]"
                  >
                    Thanh toán
                  </a>
                )}
                <button
                  disabled={busy}
                  onClick={() => void refresh(o.orderCode)}
                  className="rounded-xl border px-3 py-2 text-sm text-[#007f95] disabled:opacity-40"
                >
                  Kiểm tra
                </button>
              </div>
            </article>
          ))}
          {!orders.length && (
            <p className="text-sm text-slate-500">Chưa có đơn nạp.</p>
          )}
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">Lịch sử ví</h2>
        {entries.map((e) => (
          <article
            key={e.id}
            className="hf-wallet-entry flex items-center justify-between gap-3 border-b py-4"
          >
            <div>
              <p className="font-bold">{e.description}</p>
              <p className="mt-1 text-xs text-slate-500">
                {new Date(e.occurredAt).toLocaleString("vi-VN")} · Số dư{" "}
                {formatVnd(e.balanceAfter)}
              </p>
            </div>
            <p
              className={`shrink-0 font-black ${e.amount >= 0 ? "text-emerald-700" : "text-rose-600"}`}
            >
              {e.amount >= 0 ? "+" : ""}
              {formatVnd(e.amount)}
            </p>
          </article>
        ))}
        {!entries.length && (
          <p className="mt-3 text-sm text-slate-500">Chưa có giao dịch.</p>
        )}
        <div className="mt-4 flex justify-between">
          <button
            disabled={!page}
            onClick={() => setPage((p) => p - 1)}
            className="text-[#007f95] disabled:opacity-30"
          >
            Trước
          </button>
          <span>{page + 1}</span>
          <button
            disabled={last}
            onClick={() => setPage((p) => p + 1)}
            className="text-[#007f95] disabled:opacity-30"
          >
            Tiếp
          </button>
        </div>
      </section>
    </div>
  );
}
