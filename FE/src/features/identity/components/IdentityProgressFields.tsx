import { Link } from "react-router-dom";
import type { IdentityProgress } from "../../../services/identityService";
export default function IdentityProgressFields({ state, verified }: { state: IdentityProgress | null; verified: boolean }) {
  const steps = [{ label: "Quét khuôn mặt", passed: state?.scanPassed }, { label: "Selfie trực tiếp", passed: state?.selfiePassed },
    { label: "CCCD mặt trước", passed: state?.frontPassed }, { label: "CCCD mặt sau", passed: state?.backPassed }];
  return <div className="grid min-w-0 gap-3 sm:col-span-2 sm:grid-cols-2">{steps.map(step => <div key={step.label} className="min-w-0 rounded-2xl border border-slate-200 p-4">
    <p className="text-xs font-bold text-slate-400">{step.label}</p>
    <p className={`mt-2 text-sm font-bold ${verified || step.passed ? "text-emerald-700" : "text-red-600"}`}>{verified || step.passed ? "✓ Đã hoàn tất và lưu" : "! Cần hoàn thiện"}</p>
    {!(verified || step.passed) && <Link to="/face-comparison" className="mt-2 inline-flex min-h-11 items-center font-bold text-[#007f95]">Tiếp tục xác minh</Link>}
  </div>)}</div>;
}
