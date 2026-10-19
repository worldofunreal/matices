import Phaser from "phaser";
import { marco, texto } from "../ui/ui";
import { hablar } from "../ui/voz";

// Layer above the world for everything that is not part of it: speech bubbles and, from H7,
// the buttons that are always at hand. It runs alongside the world and never moves with the camera.
export class Interfaz extends Phaser.Scene {
  private globo: Phaser.GameObjects.Container | null = null;
  private quitar: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super("Interfaz");
  }

  create() {
    this.scale.on("resize", () => this.cameras.main.setSize(this.scale.width, this.scale.height), this);
  }

  // A short line shown at the top of the screen and spoken.
  decir(clave: string, linea: string, quien?: string) {
    this.globo?.destroy();
    this.quitar?.remove();
    const { width: w } = this.scale;
    const ancho = Math.min(w - 24, 360);
    const t = texto(this, 0, 0, quien ? `${quien}: ${linea}` : linea, 13, ancho - 24);
    const alto = t.height + 24;
    this.globo = this.add.container(w / 2, 16 + alto / 2, [marco(this, 0, 0, ancho, alto), t]);
    hablar(clave, linea);
    this.quitar = this.time.delayedCall(Math.max(2500, linea.length * 80), () => this.globo?.destroy());
  }

  // A full-screen card between days; with ms null it stays.
  cartel(linea: string, ms: number | null, alTerminar?: () => void) {
    const { width: w, height: h } = this.scale;
    const c = this.add.container(0, 0, [this.add.rectangle(0, 0, w, h, 0x1d1a24).setOrigin(0), texto(this, w / 2, h / 2, linea, 22).setColor("#f4ecdc")]);
    hablar("mundo.dia", linea);
    if (ms === null) return;
    this.time.delayedCall(ms, () => {
      c.destroy();
      alTerminar?.();
    });
  }
}
