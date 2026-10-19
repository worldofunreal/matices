import { defineConfig } from "vite";
import { contenido } from "./herramientas/contenido";

export default defineConfig({
  base: "./",
  plugins: [contenido()],
  server: { host: true },
  build: { chunkSizeWarningLimit: 1500 }, // Phaser alone is ~1.2 MB
});
