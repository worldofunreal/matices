// Pixel art from public/assets (manifiesto.yaml): loaded only when a screen needs it, with the key
// skin, hair and backpack colors swapped for the chosen ones. Every piece is a canvas ready to draw.
import arte from "virtual:arte";

export type Colores = { piel?: number; cabello?: number; mochila?: number };
export const CUADRO = { ancho: 32, alto: 48 }; // one frame of a character sheet

const piezas = new Map(arte.piezas.map((p) => [p.id, p]));
const imagenes = new Map<string, Promise<HTMLImageElement>>();
const listos = new Map<string, HTMLCanvasElement>();

function imagen(id: string): Promise<HTMLImageElement> {
  let p = imagenes.get(id);
  if (!p) {
    const pieza = piezas.get(id);
    if (!pieza) throw new Error(`No hay pieza ${id} en el manifiesto`);
    p = new Promise((ok, mal) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => mal(new Error(`No cargó ${pieza.archivo}`));
      img.src = `assets/${pieza.archivo}`;
    });
    imagenes.set(id, p);
  }
  return p;
}

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

function clave(id: string, colores: Colores) {
  const usa = piezas.get(id)?.colores ?? [];
  return [id, ...usa.filter((r) => (colores[r] ?? 0) > 0).map((r) => `${r}${colores[r]}`)].join("~");
}

// The piece as a canvas with its key colors swapped. Built once per color combination.
export async function pieza(id: string, colores: Colores = {}): Promise<HTMLCanvasElement> {
  const k = clave(id, colores);
  const hecho = listos.get(k);
  if (hecho) return hecho;
  const img = await imagen(id);
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const cambios = (piezas.get(id)?.colores ?? []).filter((r) => (colores[r] ?? 0) > 0);
  if (cambios.length) {
    const datos = ctx.getImageData(0, 0, c.width, c.height);
    const mapa = new Map<number, number[]>();
    for (const r of cambios)
      arte.colores[r].clave.forEach((h, i) => {
        const [a, b, d] = hex(h);
        mapa.set((a << 16) | (b << 8) | d, hex(arte.colores[r].variantes[colores[r]!][i]));
      });
    const px = datos.data;
    for (let i = 0; i < px.length; i += 4) {
      const nuevo = mapa.get((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
      if (nuevo) [px[i], px[i + 1], px[i + 2]] = nuevo;
    }
    ctx.putImageData(datos, 0, 0);
  }
  listos.set(k, c);
  return c;
}

// The same piece if it is already built, read without waiting (the drawing loop uses this).
export const piezaYa = (id: string, colores: Colores = {}) => listos.get(clave(id, colores));

// Warms the cache so a screen draws at once when it opens.
export const precargar = (ids: string[]) => Promise.all(ids.map(imagen));

export const idsDe = (prefijo: string) => arte.piezas.filter((p) => p.id.startsWith(prefijo)).map((p) => p.id);
export const queEs = (id: string) => piezas.get(id)?.que ?? id;
export const colorMedio = (rampa: "piel" | "cabello" | "mochila", i: number) => arte.colores[rampa].variantes[i][1];
export const cuantos = (rampa: "piel" | "cabello" | "mochila") => arte.colores[rampa].variantes.length;
