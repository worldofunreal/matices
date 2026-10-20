import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { contenido } from "./herramientas/contenido.ts";

export default defineConfig({
  base: "./",
  plugins: [react(), contenido()],
  define: { __VERSION_JUEGO__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? "local") },
  server: { host: true, proxy: { "/api": "http://127.0.0.1:3200" } },
  preview: { proxy: { "/api": "http://127.0.0.1:3200" } },
  // Code goes to js/ because assets/ is the art folder.
  build: { assetsDir: "js", rollupOptions: { input: { index: "index.html", admin: "admin.html" } } },
});
