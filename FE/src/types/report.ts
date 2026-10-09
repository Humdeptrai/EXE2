export type ReportStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
export type ReportTarget = "JOB" | "USER" | "MATCH" | "SUPPORT";
export interface ReportEvidence {
  id: string; originalName: string; contentType: string; sizeBytes: number; path: string;
}
export interface Report {
  id: string; reporterId: string; targetType: ReportTarget; targetId: string;
  reason: string; status: ReportStatus; resolution: string | null;
  createdAt: string; resolvedAt: string | null; resolvedBy: string | null;
  assignedTo: string | null; assignedName: string | null; assignedAt: string | null;
  canClaim: boolean; canRelease: boolean; canResolve: boolean;
  links: string[]; evidence: ReportEvidence[];
}
export interface ReportRequest { targetType: ReportTarget; targetId: string; reason: string; links: string[]; }
export const reportStatuses: Record<ReportStatus, string> = {
  OPEN: "Mới gửi", IN_REVIEW: "Đang xử lý", RESOLVED: "Đã giải quyết", REJECTED: "Từ chối",
};
export const reportTargets: Record<ReportTarget, string> = {
  JOB: "Bài đăng", USER: "Người dùng", MATCH: "Đối tác trong matching", SUPPORT: "Hỗ trợ tài khoản / thanh toán",
};
