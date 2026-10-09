import api from "../config/axios";
import type { ApiResponse } from "../types/api";
export type Eligibility = { eligible: boolean; profileComplete: boolean; identityVerified: boolean; identityStatus: string; missingRequirements: string[] };
export const identityService = {
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
