interface FormMessageProps {
  kind: "success" | "error" | "info";
  text: string;
}

export function FormMessage({ kind, text }: FormMessageProps) {
  const classes = kind === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : kind === "info"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-red-200 bg-red-50 text-red-700";

  return <div role="status" className={`rounded-xl border px-4 py-3 text-sm font-semibold ${classes}`}>{text}</div>;
}
