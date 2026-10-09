import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Plugin } from "vite";

export function handsfreePwa(): Plugin {
  return {
    name: "handsfree-pwa", apply: "build",
    generateBundle(_, bundle) {
      const staticFiles = ["/offline.html", "/offline.js", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png", "/icons/apple-touch-icon.png"];
      const entries = Object.entries(bundle).filter(([name]) => name.startsWith("assets/") && /\.(js|css)$/.test(name)).sort(([a], [b]) => a.localeCompare(b));
      const hash = createHash("sha256");
      for (const [name, item] of entries) hash.update(name).update(item.type === "chunk" ? item.code : item.source);
      for (const name of staticFiles) hash.update(readFileSync(new URL(`../public${name}`, import.meta.url)));
      const template = readFileSync(new URL("./sw-template.js", import.meta.url), "utf8");
      hash.update(template);
      const source = template
        .replace("__BUILD_ID__", JSON.stringify(hash.digest("hex").slice(0, 16)))
        .replace("__PRECACHE__", JSON.stringify([...staticFiles, ...entries.map(([name]) => `/${name}`)]));
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}
