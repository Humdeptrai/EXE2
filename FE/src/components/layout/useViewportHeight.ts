import { useEffect } from "react";

export function useViewportHeight() {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.getPropertyValue("--hf-viewport-height");
    const resize = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty("--hf-viewport-height", `${height}px`);
      root.classList.toggle("hf-keyboard-open", window.innerHeight - height > 140);
    };
    resize();
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const key = entry.target.classList.contains("hf-app-header") ? "--hf-header-height" : "--hf-nav-height";
        root.style.setProperty(key, `${entry.target.getBoundingClientRect().height}px`);
      }
    });
    for (const element of document.querySelectorAll(".hf-app-header, .hf-bottomnav")) observer.observe(element);
    window.visualViewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    return () => {
      window.visualViewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
      observer.disconnect();
      root.style.removeProperty("--hf-header-height");
      root.style.removeProperty("--hf-nav-height");
      root.classList.remove("hf-keyboard-open");
      if (previous) root.style.setProperty("--hf-viewport-height", previous);
      else root.style.removeProperty("--hf-viewport-height");
    };
  }, []);
}
