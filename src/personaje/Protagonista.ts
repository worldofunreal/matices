import Phaser from "phaser";
import { animar, variante, type Direccion } from "../arte";

export interface Apariencia {
  cuerpo: "nina" | "nino" | "neutro";
  piel: number; // index into colores.piel.variantes
  cabello: string; // "01".."10"
  colorCabello: number; // index into colores.cabello.variantes
  ropa: "uniforme" | "casa";
  abajo: "pantalon" | "falda"; // only for the uniform
  extras: ("lentes" | "aretes" | "gorra" | "mochila")[];
  colorMochila: number; // index into colores.mochila.variantes
}

export const APARIENCIA_INICIAL: Apariencia = {
  cuerpo: "neutro",
  piel: 0,
  cabello: "06",
  colorCabello: 0,
  ropa: "uniforme",
  abajo: "pantalon",
  extras: [],
  colorMochila: 0,
};

// Sheets stacked bottom to top. Every layer shares the same frame, so they always line up.
export function capas(a: Apariencia): string[] {
  const ropa = a.ropa === "uniforme" ? ["ropa_uniforme_" + a.abajo, "ropa_uniforme_arriba"] : ["ropa_casa_abajo", "ropa_casa_arriba"];
  const extras = (["mochila", "lentes", "aretes", "gorra"] as const).filter((e) => a.extras.includes(e)).map((e) => "extra_" + e);
  return ["cuerpo_" + a.cuerpo, "calzado_tenis", ...ropa, "cabello_" + a.cabello, ...extras].map((c) => "personaje/" + c);
}

// The player character: a container whose position is the feet.
export class Protagonista extends Phaser.GameObjects.Container {
  private hojas: Phaser.GameObjects.Sprite[] = [];
  direccion: Direccion = "abajo";

  constructor(escena: Phaser.Scene, x: number, y: number, apariencia: Apariencia) {
    super(escena, x, y);
    escena.add.existing(this);
    this.vestir(apariencia);
  }

  vestir(a: Apariencia) {
    this.removeAll(true);
    this.hojas = capas(a).map((id) => {
      const clave = variante(this.scene, id, { piel: a.piel, cabello: a.colorCabello, mochila: a.colorMochila });
      animar(this.scene, clave);
      return this.scene.add.sprite(0, 0, clave, 0).setOrigin(0.5, 1);
    });
    this.add(this.hojas);
    this.animar(false);
  }

  // Faces the dominant axis of the movement and walks, or stands still.
  mover(vx: number, vy: number) {
    const camina = vx !== 0 || vy !== 0;
    if (camina) this.direccion = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? "izq" : "der") : vy < 0 ? "arriba" : "abajo";
    this.animar(camina);
  }

  private animar(camina: boolean) {
    for (const s of this.hojas) s.play(`${s.texture.key}:${this.direccion}${camina ? "" : ":quieto"}`, true);
  }
}
