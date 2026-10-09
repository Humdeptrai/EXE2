import api from "../config/axios";
import type { ApiResponse } from "../types/api";
export type Eligibility = { eligible: boolean; profileComplete: boolean; identityVerified: boolean; identityStatus: string; selfieVerified: boolean; documentConfirmed: boolean; missingRequirements: string[] };
export type MyIdentity = {
  verification: { userId: string; status: string; reason: string | null; submittedAt: string | null; verifiedAt: string | null; enabled: boolean };
  documentNumber: string | null;
  documentConfirmed: boolean;
  selfieUploaded: boolean;
  selfieVerified: boolean;
  selfieUrl: string | null;
  pendingReplacement: boolean;
};
export const identityService = {
  async mine(signal?: AbortSignal): Promise<MyIdentity> {
    const r = await api.get<ApiResponse<MyIdentity>>("/identity/me", { signal });
    return r.data.result;
  },
  async eligibility(signal?: AbortSignal): Promise<Eligibility> {
    const r = await api.get<ApiResponse<Eligibility>>("/identity/eligibility", { signal });
    return r.data.result;
  },
};
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || !/^\/(home|discover|jobs|posts|saved|skipped|candidates|matches|messages|notifications|wallet|reports|profile)(\/|\?|#|$)/.test(value) || value.includes("\\")) return "/home";
  return value;
}
export function onboardingUrl(next?: unknown) {
  return `/onboarding?next=${encodeURIComponent(safeNext(next))}`;
}
