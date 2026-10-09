export interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
export interface PwaState {
  installed: boolean;
  online: boolean;
  prompt: InstallPrompt | null;
  updateReady: boolean;
  updating: boolean;
  error: string;
}
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
let state: PwaState = { installed: standalone(), online: navigator.onLine, prompt: null, updateReady: false, updating: false, error: "" };
const listeners = new Set<() => void>();
let registration: ServiceWorkerRegistration | undefined;
let reloadRequested = false;
let started = false;
const emit = (change: Partial<PwaState>) => { state = { ...state, ...change }; listeners.forEach(listener => listener()); };
export const getPwaState = () => state;
export const subscribePwa = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function startPwa() {
  if (started) return;
  started = true;
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault(); emit({ prompt: event as InstallPrompt });
  });
  window.addEventListener("appinstalled", () => emit({ installed: true, prompt: null }));
  window.matchMedia("(display-mode: standalone)").addEventListener("change", () => emit({ installed: standalone() }));
  window.addEventListener("online", () => emit({ online: true }));
  window.addEventListener("offline", () => emit({ online: false }));
  window.addEventListener("vite:preloadError", event => {
    event.preventDefault(); emit({ updateReady: true });
  });
  if (!import.meta.env.PROD || !window.isSecureContext || !("serviceWorker" in navigator)) return;
  let hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadRequested) { window.location.reload(); return; }
    if (hadController) emit({ updateReady: true });
    hadController = true;
  });
  void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then(reg => {
    registration = reg;
    const checkWaiting = () => { if (reg.waiting && navigator.serviceWorker.controller) emit({ updateReady: true }); };
    checkWaiting();
    reg.addEventListener("updatefound", () => {
      reg.installing?.addEventListener("statechange", checkWaiting);
    });
    let lastCheck = Date.now();
    const check = () => {
      if (!navigator.onLine || Date.now() - lastCheck < 60_000) return;
      lastCheck = Date.now(); void reg.update().catch(() => undefined);
    };
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    window.setInterval(check, 60 * 60 * 1000);
  }).catch(() => {
    // Network failures never block login or normal website use.
  });
}

export async function installPwa() {
  const prompt = state.prompt;
  if (!prompt) return;
  emit({ error: "" });
  try { await prompt.prompt(); await prompt.userChoice; }
  catch { emit({ error: "Chưa mở được hộp thoại cài đặt. Hãy thử từ menu trình duyệt." }); }
  finally { emit({ prompt: null }); }
}

export function applyPwaUpdate() {
  if (!navigator.onLine) { emit({ error: "Kết nối mạng trước khi cập nhật." }); return; }
  emit({ updating: true, error: "" });
  const waiting = registration?.waiting;
  if (!waiting) { window.location.reload(); return; }
  reloadRequested = true;
  waiting.postMessage({ type: "ACTIVATE_UPDATE" });
  window.setTimeout(() => {
    if (reloadRequested) { reloadRequested = false; emit({ updating: false, error: "Chưa cập nhật được. Vui lòng thử lại." }); }
  }, 15_000);
}
