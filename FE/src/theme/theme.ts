export type Theme = "light" | "dark";
const key = "handsfree-theme";
const event = "handsfree:theme";
const system = window.matchMedia("(prefers-color-scheme: dark)");
function preference(): Theme | null {
  try {
    const value = localStorage.getItem(key);
    return value === "light" || value === "dark" ? value : null;
  } catch { return null; }
}
function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#101b26" : "#007f95");
  window.dispatchEvent(new Event(event));
}
export function initializeTheme() {
  apply(preference() ?? (system.matches ? "dark" : "light"));
  system.addEventListener("change", () => {
    if (!preference()) apply(system.matches ? "dark" : "light");
  });
  window.addEventListener("storage", e => {
    if (e.key === key || e.key === null) apply(preference() ?? (system.matches ? "dark" : "light"));
  });
}
export const getTheme = (): Theme => document.documentElement.dataset.theme === "dark" ? "dark" : "light";
export function subscribeTheme(callback: () => void) {
  window.addEventListener(event, callback);
  return () => window.removeEventListener(event, callback);
}
export function toggleTheme() {
  const next = getTheme() === "dark" ? "light" : "dark";
  try { localStorage.setItem(key, next); } catch { /* Theme still works when storage is unavailable. */ }
  apply(next);
}
