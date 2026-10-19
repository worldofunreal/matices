// Small UI kit: crisp text, stretchable frames and buttons that speak when tapped.
import Phaser from "phaser";
import { hablar } from "./voz";

export const COLOR = { tinta: "#2b2233", papel: 0xf4ecdc, elegido: 0xf2c14e };
const FUENTE = "system-ui, sans-serif";

// Text drawn at screen resolution so it stays sharp at any zoom.
export function texto(escena: Phaser.Scene, x: number, y: number, contenido: string, tam = 12, ancho?: number) {
  const t = escena.add.text(x, y, contenido, {
    fontFamily: FUENTE,
    fontSize: `${tam}px`,
    color: COLOR.tinta,
    align: "center",
    wordWrap: ancho ? { width: Math.max(ancho, 60), useAdvancedWrap: true } : undefined,
  });
  // The canvas renderer (no WebGL) draws high-resolution text at double size, so only WebGL gets it.
  if (escena.game.renderer.type === Phaser.WEBGL) t.setResolution(escena.scale.zoom * devicePixelRatio);
  return t.setOrigin(0.5);
}

// Stretchable 48×48 frame with 16×16 corners, built from 9 images so it works with or without
// WebGL (Phaser's NineSlice is WebGL only, and cheap tablets can fall back to canvas).
const B = 16;
export class Marco extends Phaser.GameObjects.Container {
  private partes: Phaser.GameObjects.Image[] = [];

  constructor(escena: Phaser.Scene, x: number, y: number, w: number, h: number, pieza: string) {
    super(escena, x, y);
    const tex = escena.textures.get(pieza);
    for (let fy = 0; fy < 3; fy++)
      for (let fx = 0; fx < 3; fx++) {
        const nombre = `9:${fx}${fy}`;
        if (!tex.has(nombre)) tex.add(nombre, 0, fx * B, fy * B, B, B);
        this.partes.push(escena.add.image(0, 0, pieza, nombre).setOrigin(0));
      }
    this.add(this.partes);
    this.medir(w, h);
    escena.add.existing(this);
  }

  medir(w: number, h: number) {
    const xs = [-w / 2, -w / 2 + B, w / 2 - B];
    const ys = [-h / 2, -h / 2 + B, h / 2 - B];
    const ws = [B, Math.max(0, w - 2 * B), B];
    const hs = [B, Math.max(0, h - 2 * B), B];
    this.partes.forEach((p, i) => p.setPosition(xs[i % 3], ys[Math.floor(i / 3)]).setDisplaySize(ws[i % 3], hs[Math.floor(i / 3)]));
    return this.setSize(w, h);
  }
}

export function marco(escena: Phaser.Scene, x: number, y: number, w: number, h: number, pieza = "interfaz/marco_panel") {
  return new Marco(escena, x, y, w, h, pieza);
}

export interface OpcionesBoton {
  ancho: number;
  alto: number;
  etiqueta?: string;
  voz?: { clave: string; texto: string };
  imagen?: string; // texture key drawn on the left (or centered without a label)
  muestra?: number; // color swatch instead of an image
  tamTexto?: number;
}

export class Boton extends Phaser.GameObjects.Container {
  private brillo: Phaser.GameObjects.Rectangle;
  private elegido = false;

  constructor(escena: Phaser.Scene, x: number, y: number, o: OpcionesBoton, alTocar: () => void) {
    super(escena, x, y);
    this.add(marco(escena, 0, 0, o.ancho, o.alto));
    // Chosen state: a drawn outline, since image tint does not exist without WebGL.
    this.brillo = escena.add.rectangle(0, 0, o.ancho - 2, o.alto - 2).setStrokeStyle(3, COLOR.elegido).setFillStyle(COLOR.elegido, 0.25).setVisible(false);
    this.add(this.brillo);
    const conIcono = o.imagen || o.muestra !== undefined;
    const ix = o.etiqueta ? -o.ancho / 2 + 6 + 12 : 0;
    if (o.muestra !== undefined) this.add(escena.add.rectangle(ix, 0, 22, 22, o.muestra).setStrokeStyle(2, 0x2b2233));
    if (o.imagen) {
      const img = escena.add.image(ix, 0, o.imagen);
      const lado = Math.min(o.alto - 8, 32);
      const escala = Math.max(1, Math.floor(lado / Math.max(img.width, img.height))) || lado / Math.max(img.width, img.height);
      this.add(img.setScale(escala));
    }
    if (o.etiqueta) {
      const libre = o.ancho - (conIcono ? 40 : 12);
      this.add(texto(escena, conIcono ? ix + 16 + libre / 2 : 0, 0, o.etiqueta, o.tamTexto ?? 11, libre));
    }
    this.setSize(o.ancho, o.alto).setInteractive({ useHandCursor: true });
    this.on("pointerup", () => {
      if (o.voz) hablar(o.voz.clave, o.voz.texto);
      alTocar();
    });
    escena.add.existing(this);
  }

  elegir(si: boolean) {
    if (si === this.elegido) return this;
    this.elegido = si;
    this.brillo.setVisible(si);
    return this;
  }
}

export interface OpcionesTarjeta {
  ancho: number;
  alto: number;
  etiqueta: string;
  imagen?: string; // icon or portrait texture key
}

// Option card for stories (GDD §9, §12): the first tap speaks it and marks it, the second confirms.
export class Tarjeta extends Phaser.GameObjects.Container {
  private brillo: Phaser.GameObjects.Image;

  constructor(escena: Phaser.Scene, x: number, y: number, o: OpcionesTarjeta, alTocar: () => void) {
    super(escena, x, y);
    this.add(escena.add.image(0, 0, "interfaz/tarjeta").setDisplaySize(o.ancho, o.alto));
    const lado = Math.min(o.ancho - 12, o.alto * 0.5);
    if (o.imagen) {
      const img = escena.add.image(0, -o.alto / 2 + 6 + lado / 2, o.imagen);
      img.setScale(lado / Math.max(img.width, img.height));
      this.add(img);
    }
    const t = texto(escena, 0, o.imagen ? lado / 2 + 6 - o.alto * 0.0 : 0, o.etiqueta, o.alto < 90 ? 9 : 10, o.ancho - 10);
    t.setY(o.imagen ? -o.alto / 2 + 10 + lado + (o.alto - lado - 14) / 2 : 0);
    this.add(t);
    this.brillo = escena.add.image(0, 0, "interfaz/tarjeta_elegida").setDisplaySize(o.ancho, o.alto).setVisible(false);
    this.add(this.brillo);
    this.setSize(o.ancho, o.alto).setInteractive({ useHandCursor: true });
    this.on("pointerup", alTocar);
    escena.add.existing(this);
  }

  marcar(si: boolean) {
    this.brillo.setVisible(si);
    return this;
  }
}
