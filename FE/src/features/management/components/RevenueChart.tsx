import { useState } from "react";
import { formatVnd } from "../../jobs/utils/jobFormat";
import "./revenue.css";
export type RevenueBucket = { date: string; fees: number; refunds: number; topups: number };
export default function RevenueChart({ days, today }: { days: RevenueBucket[]; today: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [metric, setMetric] = useState<"fees" | "topups">("fees");
  const recorded = days.filter(d => d.date <= today);
  const amount = (d: RevenueBucket) => metric === "fees" ? d.fees - d.refunds : d.topups;
  const values = recorded.map(amount);
  const max = Math.max(...values, 1000), min = Math.min(...values, 0);
  const left = 84, width = 630, height = 210;
  const y = (v: number) => 20 + height - ((v - min) / (max - min)) * height;
  const x = (i: number) => left + i / Math.max(1, days.length - 1) * width;
  const path = values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const bucket = recorded.find(d => d.date === selected) || recorded.at(-1);
  const chosen = bucket ? days.findIndex(d => d.date === bucket.date) : -1;
  const ticks = [...new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])].filter(i => i >= 0);
  return <>
    <div className="op-chart-tools"><div className="op-segment"><button aria-pressed={metric === "fees"} className={metric === "fees" ? "selected" : ""} onClick={() => setMetric("fees")}>Phí kết nối thuần</button><button aria-pressed={metric === "topups"} className={metric === "topups" ? "selected" : ""} onClick={() => setMetric("topups")}>Tiền nạp vào ví</button></div></div>
    <p className="op-revenue-help">{metric === "fees" ? "Phí kết nối đã thu − phí đã hoàn. Đây chưa phải lợi nhuận sau chi phí vận hành." : "Tiền người dùng nạp vào ví; không tính là doanh thu phí kết nối."}</p>
    <div className="op-revenue-selection" aria-live="polite">{bucket ? <><span>Ngày {bucket.date.split("-").reverse().join("/")}{bucket.date === today ? " · Hôm nay (chưa hết ngày)" : ""}</span><strong>{formatVnd(amount(bucket))}</strong></> : "Chưa có ngày phát sinh trong kỳ này."}</div>
    <div className="op-revenue-plot"><svg viewBox="0 0 740 270" role="img" aria-label="Biểu đồ dòng tiền theo ngày, đơn vị đồng. Chọn ngày bên dưới để xem chi tiết.">
      {[0, .25, .5, .75, 1].map(f => { const value = min + (max - min) * f; return <g key={f}><line x1={left} x2={left + width} y1={y(value)} y2={y(value)} stroke="#dce8eb" strokeDasharray="4 5" /><text x={left - 10} y={y(value) + 4} textAnchor="end" fontSize="12" fill="#526b74">{new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)}</text></g>; })}
      <text x="6" y="12" fontSize="12" fill="#526b74">VNĐ</text>
      {recorded.length > 0 && <><path d={`${path} L${x(recorded.length - 1)},${y(0)} L${left},${y(0)} Z`} fill="#007f9515" /><path d={path} fill="none" stroke="#007f95" strokeWidth="3" />{values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={chosen === i ? 5 : 3} fill="#007f95"><title>{recorded[i].date}: {formatVnd(v)}</title></circle>)}</>}
      {chosen >= 0 && <line x1={x(chosen)} x2={x(chosen)} y1="20" y2={230} stroke="#007f95" strokeDasharray="3 5" />}
      {ticks.map(i => <text key={i} x={x(i)} y="256" textAnchor="middle" fontSize="13" fill="#526b74">{days[i].date.slice(-2)}</text>)}
    </svg></div>
    <div className="op-chart-days" aria-label="Chọn ngày xem chi tiết">{days.map(d => <button key={d.date} disabled={d.date > today} aria-pressed={bucket?.date === d.date} className={bucket?.date === d.date ? "selected" : ""} onClick={() => setSelected(d.date)} aria-label={`${d.date}: ${d.date > today ? "Chưa đến ngày" : formatVnd(amount(d))}`}>{Number(d.date.slice(-2))}</button>)}</div>
    <p className="op-revenue-help">Ngày tương lai chưa có dữ liệu và không được vẽ thành 0. Các khoản hoàn được ghi nhận vào ngày hoàn tiền.</p>
    {bucket && <dl className="op-day-breakdown"><div><dt>Phí đã thu</dt><dd>{formatVnd(bucket.fees)}</dd></div><div><dt>Phí đã hoàn</dt><dd>{formatVnd(bucket.refunds)}</dd></div><div><dt>Nạp vào ví</dt><dd>{formatVnd(bucket.topups)}</dd></div></dl>}
  </>;
}
