import Phaser from "phaser";
import { variante } from "../arte";
import type { Apariencia } from "./Protagonista";

export type Expresion = "contento" | "neutral" | "triste" | "enojado" | "asustado";

// The player's 96×96 portrait, stacked from the same choices as the walking character.
export function capasRetrato(a: Apariencia, expresion: Expresion): string[] {
  const extras = (["aretes", "lentes", "gorra"] as const).filter((e) => a.extras.includes(e)).map((e) => "retrato_extra_" + e);
  return [`retrato_cara_${a.cuerpo}_${expresion}`, `retrato_ropa_${a.ropa}`, `retrato_cabello_${a.cabello}`, ...extras].map((c) => "personaje/" + c);
}

export class Retrato extends Phaser.GameObjects.Container {
  constructor(escena: Phaser.Scene, x: number, y: number, a: Apariencia, expresion: Expresion = "neutral") {
    super(escena, x, y);
    escena.add.existing(this);
    this.vestir(a, expresion);
  }

  vestir(a: Apariencia, expresion: Expresion = "neutral") {
    this.removeAll(true);
    for (const id of capasRetrato(a, expresion))
      this.add(this.scene.add.image(0, 0, variante(this.scene, id, { piel: a.piel, cabello: a.colorCabello })));
  }
}
