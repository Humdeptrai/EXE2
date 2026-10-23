import api from "../config/axios";
import { tokenService } from "./tokenService";

// Private blobs live only in this tab's memory, bounded to 16 MiB / 24 files / 2 minutes.
// No localStorage, service worker cache or public delivery URLs.
const files = new Map<string, { blob: Blob; expires: number }>();
const pending = new Map<string, { controller: AbortController; promise: Promise<Blob> }>();
let session: string | null = null;
let generation = 0;
function clear() {
  generation++;
  for (const request of pending.values()) request.controller.abort();
  pending.clear(); files.clear(); session = null;
}
window.addEventListener("handsfree:session-changed", clear);
window.addEventListener("storage", event => { if (!event.key || ["accessToken", "authUser", "authSessionId"].includes(event.key)) clear(); });
function trim() {
  let bytes = 0;
  for (const [key, value] of files) {
    if (value.expires <= Date.now()) files.delete(key); else bytes += value.blob.size;
  }
  for (const [key, value] of files) {
    if (bytes <= 16 * 1024 * 1024 && files.size <= 24) break;
    bytes -= value.blob.size; files.delete(key);
  }
}
export async function privateMedia(path: string): Promise<Blob> {
  const current = tokenService.getSessionId();
  if (current !== session) { clear(); session = current; }
  if (!current) throw new Error("Phiên đăng nhập đã kết thúc.");
  const cacheable = path.startsWith("/conversations/") || path.startsWith("/identity/requests/") || /[?&]v=/.test(path);
  trim();
  const cached = files.get(path);
  if (cached) { files.delete(path); files.set(path, cached); return cached.blob; }
  const existing = pending.get(path); if (existing) return existing.promise;
  const controller = new AbortController(); const version = generation;
  const promise = api.get<Blob>(path, { responseType: "blob", signal: controller.signal, timeout: 300000 }).then(response => {
    if (version !== generation || current !== tokenService.getSessionId()) throw new Error("Phiên đăng nhập đã thay đổi.");
    if (cacheable && response.data.size <= 16 * 1024 * 1024) { files.set(path, { blob: response.data, expires: Date.now() + 120000 }); trim(); }
    return response.data;
  }).finally(() => { if (pending.get(path)?.controller === controller) pending.delete(path); });
  pending.set(path, { controller, promise }); return promise;
}
