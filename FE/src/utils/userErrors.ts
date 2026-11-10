import { friendlyText } from "./errorMessages";

export const USER_ERROR_EVENT = "handsfree:user-error";
const reported = new WeakSet<object>();

// Called when an error is presented to a person, after existing retry/fallback
// handling. Background polling and recoverable internal attempts stay silent.
export function reportUserError(message: string, source?: unknown) {
  if (!message || typeof window === "undefined") return;
  if (typeof source === "object" && source !== null) {
    if (reported.has(source)) return;
    reported.add(source);
  }
  window.dispatchEvent(new window.CustomEvent(USER_ERROR_EVENT, { detail: { message: friendlyText(message) } }));
}
