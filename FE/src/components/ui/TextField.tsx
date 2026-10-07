import UserNotice from "../feedback/UserNotice";
import { useId, type InputHTMLAttributes, type ReactNode } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: ReactNode;
  error?: string;
  trailing?: ReactNode;
}

export function TextField({ label, icon, error, trailing, id, ...inputProps }: TextFieldProps) {
  const generatedId = useId();
  const errorId = `${id || generatedId}-error`;
  const describedBy = [inputProps["aria-describedby"], error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block pl-1 text-[15px] font-semibold text-[#48515c] sm:text-[17px]">
        {label}
      </label>
      <div className={`flex min-h-14 items-center rounded-2xl border bg-white px-4 transition sm:min-h-[70px] sm:px-5 ${error ? "border-red-400 ring-1 ring-red-100" : "border-[#b7c3cd] focus-within:border-[#007087] focus-within:ring-2 focus-within:ring-[#007087]/10"}`}>
        <span className="mr-3 shrink-0 text-[#7f8b91] sm:mr-5">{icon}</span>
        <input id={id} className="min-w-0 flex-1 bg-transparent text-base text-[#10213c] outline-none placeholder:text-[#9aa4ac] sm:text-[20px]" {...inputProps} aria-invalid={error ? true : inputProps["aria-invalid"]} aria-describedby={describedBy} />
        {trailing}
      </div>
      {error && <UserNotice id={errorId} message={error} error compact />}
    </div>
  );
}
