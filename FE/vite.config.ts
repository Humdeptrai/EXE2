import { handsfreePwa } from "./pwa/vite-pwa.ts";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), handsfreePwa()],
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
  },
});