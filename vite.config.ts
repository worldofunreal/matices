import { defineConfig } from "vite";
import { contenido } from "./herramientas/contenido.ts";

export default defineConfig({
  base: "./",
  plugins: [contenido()],
  define: { __VERSION_JUEGO__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? "local") },
  server: { host: true },
  // Code goes to js/ because assets/ is the art folder. Phaser alone is ~1.2 MB.
  build: { chunkSizeWarningLimit: 1500, assetsDir: "js" },
});
