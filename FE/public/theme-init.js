// Apply before the application/styles load to avoid a light flash on dark visits.
(() => {
  let theme;
  try { theme = localStorage.getItem("handsfree-theme"); } catch { /* Storage may be blocked. */ }
  if (theme !== "light" && theme !== "dark") theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
