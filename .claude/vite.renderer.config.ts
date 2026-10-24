// renderer-only dev server for previewing UI in a browser (no electron window).
// the api points at a dead loopback port so nothing reaches the real backend.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import pkg from "../package.json" with { type: "json" };

const root = path.resolve(import.meta.dirname, "..");

export default defineConfig({
  root,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    "import.meta.env.VITE_API_URL": JSON.stringify("http://127.0.0.1:9"),
  },
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(root, "src") } },
  server: { port: 5199, strictPort: true },
});
