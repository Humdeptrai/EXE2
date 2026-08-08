import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { UserMode } from "../../types/auth";

const options: Array<{ mode: UserMode; label: string; shortLabel: string }> = [
  { mode: "CONSUMER", label: "Tôi cần người hỗ trợ", shortLabel: "Thuê việc" },
  { mode: "PROVIDER", label: "Tôi muốn nhận việc", shortLabel: "Nhận việc" },
];

export default function ModeSwitcher() {
  const { user, switchMode } = useAuth();
  const navigate = useNavigate();
  const [loadingMode, setLoadingMode] = useState<UserMode | null>(null);

  async function handleSwitch(mode: UserMode) {
    if (!user || user.currentMode === mode || loadingMode) return;
    setLoadingMode(mode);
    try {
      await switchMode(mode);
      navigate(mode === "PROVIDER" ? "/discover" : "/home");
    } catch {
      window.alert("Không thể chuyển chế độ lúc này. Vui lòng thử lại.");
    } finally {
      setLoadingMode(null);
    }
  }

  return (
    <div className="w-full rounded-2xl bg-[#e9f5f7] p-1" aria-label="Chuyển chế độ sử dụng">
      <div className="grid grid-cols-2 gap-1">
        {options.map((option) => {
          const active = user?.currentMode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              onClick={() => void handleSwitch(option.mode)}
              disabled={Boolean(loadingMode)}
              className={`min-h-11 min-w-0 rounded-xl px-2 py-2 text-[11px] font-extrabold leading-4 transition sm:px-4 sm:text-xs ${
                active
                  ? "bg-[#007f95] text-white shadow-sm"
                  : "text-[#42636b] hover:bg-white/70"
              }`}
              title={option.label}
            >
              <span className="block truncate">{loadingMode === option.mode ? "Đang chuyển..." : option.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
