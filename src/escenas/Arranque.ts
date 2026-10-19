import Phaser from "phaser";
import contenido from "virtual:contenido";

// Placeholder art until the real PNGs arrive: same sizes as docs/arte/direccion-de-arte.md.
const TILES = ["#c9a27a", "#d9d4c7", "#7a5c4f", "#b8b2a6", "#7fa65a"]; // piso, mosaico, muro, patio, pasto

export class Arranque extends Phaser.Scene {
  constructor() {
    super("Arranque");
  }

  preload() {
    this.load.tilemapTiledJSON("casa", "mapas/casa.json");
  }

  create() {
    const tiles = this.textures.createCanvas("provisional", 32 * TILES.length, 32)!;
    const ctx = tiles.getContext();
    TILES.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(i * 32, 0, 32, 32);
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.strokeRect(i * 32 + 0.5, 0.5, 31, 31);
    });
    tiles.refresh();

    const prota = this.textures.createCanvas("prota", 32, 48)!;
    const p = prota.getContext();
    p.fillStyle = "#3b6ea8";
    p.fillRect(8, 16, 16, 24);
    p.fillStyle = "#e0b48c";
    p.fillRect(9, 2, 14, 14);
    p.fillStyle = "#2b2b2b";
    p.fillRect(9, 40, 6, 6);
    p.fillRect(17, 40, 6, 6);
    prota.refresh();

    this.registry.set("contenido", contenido);
    this.scene.start("Mundo", { mapa: "casa" });
  }
}
