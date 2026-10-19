import Phaser from "phaser";
import arte from "virtual:arte";

// Every texture key is the piece id from public/assets/manifiesto.yaml (e.g. "personaje/cuerpo_nina").
export const CUADRO = { ancho: 32, alto: 48 };
export const DIRECCIONES = ["abajo", "izq", "der", "arriba"] as const;
export type Direccion = (typeof DIRECCIONES)[number];

export function cargarArte(escena: Phaser.Scene) {
  for (const p of arte.piezas) {
    const url = `assets/${p.archivo}`;
    if (p.tipo === "hoja") escena.load.spritesheet(p.id, url, { frameWidth: CUADRO.ancho, frameHeight: CUADRO.alto });
    else escena.load.image(p.id, url);
  }
}

export type Colores = { piel?: number; cabello?: number; mochila?: number };

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// Same texture with the key skin and hair colors swapped for the chosen tone and color.
// Returns the key of the new texture; it is built once and reused.
export function variante(escena: Phaser.Scene, id: string, colores: Colores): string {
  const pieza = arte.piezas.find((p) => p.id === id);
  const cambios = (pieza?.colores ?? []).filter((r) => (colores[r] ?? 0) > 0);
  if (!cambios.length) return id;
  const clave = `${id}~${cambios.map((r) => `${r}${colores[r]}`).join("~")}`;
  if (escena.textures.exists(clave)) return clave;

  const fuente = escena.textures.get(id).getSourceImage() as HTMLImageElement;
  const lienzo = document.createElement("canvas");
  lienzo.width = fuente.width;
  lienzo.height = fuente.height;
  const ctx = lienzo.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(fuente, 0, 0);
  const img = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
  const mapa = new Map<number, number[]>();
  for (const r of cambios) {
    const { clave: claves, variantes } = arte.colores[r];
    claves.forEach((c, i) => {
      const [a, b, d] = hex(c);
      mapa.set((a << 16) | (b << 8) | d, hex(variantes[colores[r]!][i]));
    });
  }
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    const nuevo = mapa.get((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
    if (nuevo) [px[i], px[i + 1], px[i + 2]] = nuevo;
  }
  ctx.putImageData(img, 0, 0);
  if (pieza?.tipo === "hoja")
    escena.textures.addSpriteSheet(clave, lienzo as unknown as HTMLImageElement, { frameWidth: CUADRO.ancho, frameHeight: CUADRO.alto });
  else escena.textures.addCanvas(clave, lienzo);
  return clave;
}

// Walk animations for a character sheet: "<key>:<direction>" (4 steps) and "<key>:<direction>:quieto".
export function animar(escena: Phaser.Scene, clave: string) {
  DIRECCIONES.forEach((dir, fila) => {
    const nombre = `${clave}:${dir}`;
    if (escena.anims.exists(nombre)) return;
    escena.anims.create({ key: nombre, frames: escena.anims.generateFrameNumbers(clave, { start: fila * 5 + 1, end: fila * 5 + 4 }), frameRate: 8, repeat: -1 });
    escena.anims.create({ key: `${nombre}:quieto`, frames: [{ key: clave, frame: fila * 5 }] });
  });
}

export const totalPiezas = arte.piezas.length;
