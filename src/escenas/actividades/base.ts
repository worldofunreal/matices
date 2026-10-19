import Phaser from "phaser";
import { marco } from "../../ui/ui";
import { registrar } from "../../datos/eventos";
import { terminar } from "../../datos/cuentos";

export interface DatosActividad {
  id: string;
  alTerminar: () => void;
}

// Shared frame for activities (GDD §10): La Cuentera's book over the frozen world, rebuilt on
// every change and on screen rotation, with start, end and "Ahora no" events.
export abstract class Actividad extends Phaser.Scene {
  protected id = "";
  protected t0 = 0;
  private alTerminar!: () => void;
  private cerrando = false;

  create(d: DatosActividad) {
    this.id = d.id;
    this.alTerminar = d.alTerminar;
    this.t0 = performance.now();
    this.cerrando = false;
    registrar("actividad", { actividad: this.id, que: "inicio" });
    this.empezar();
    this.armar();
    this.scale.on("resize", this.armar, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.armar, this));
  }

  protected abstract empezar(): void;
  protected abstract dibujar(zona: { x: number; y: number; w: number; h: number }, abajo: number): void;

  protected armar() {
    this.children.removeAll(true);
    const { width: w, height: h } = this.scale;
    this.cameras.main.setSize(w, h);
    this.add.rectangle(0, 0, w, h, 0x1d1a24, 0.45).setOrigin(0).setInteractive();
    const lh = Math.round(w > h ? h - 24 : h * 0.8);
    const ly = h - lh / 2 - 8;
    marco(this, w / 2, ly, w - 16, lh, "interfaz/marco_libro");
    this.dibujar({ x: 16, y: ly - lh / 2 + 10, w: w - 32, h: lh - 60 }, ly + lh / 2 - 26);
  }

  protected cerrar(como: "terminado" | "ahora_no", espera = 400) {
    if (this.cerrando) return;
    this.cerrando = true;
    terminar(this.id, como);
    registrar("actividad", { actividad: this.id, que: como === "terminado" ? "fin" : "ahora_no", ms: Math.round(performance.now() - this.t0) });
    this.time.delayedCall(espera, () => {
      this.scene.stop();
      this.alTerminar();
    });
  }
}
