import type { BudgetType, JobStatus } from "../../../types/job";

export function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatJobDate(date: string, time: string): string {
  const parsed = new Date(`${date}T${time || "00:00"}`);
  if (Number.isNaN(parsed.getTime())) return `${date} ${time}`;
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function budgetLabel(type: BudgetType): string {
  return type === "HOURLY" ? "Theo giờ" : "Trọn gói";
}

export function statusLabel(status: JobStatus): string {
  return {
    DRAFT: "Bản nháp",
    PUBLISHED: "Đang tìm kiếm",
    COMPLETED: "Đã hoàn thành",
    CANCELLED: "Đã kết thúc",
  }[status];
}
