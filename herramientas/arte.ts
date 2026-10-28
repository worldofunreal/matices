// Reads public/assets/manifiesto.yaml and expands it into the full list of pieces.
// Shared by the build check (contenido.ts) and the placeholder generator (provisionales.ts).
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { crc32 } from "node:zlib";
import { parse } from "yaml";

export const ROOT = resolve(import.meta.dirname, "..");
// Where the generator images live, outside the repository.
export const ARTE = join(homedir(), ".local/share/matices/arte");
export const ASSETS = join(ROOT, "public/assets");
export const MANIFIESTO = join(ASSETS, "manifiesto.yaml");
export const DOC_CODIGOS = join(ROOT, "contenido/codigos.md");

export type Tipo = "hoja" | "fondo" | "objeto";
// Color ramps the game can swap (manifiesto.yaml `colores`). One list, used by the build check and the game.
export const RAMPAS = ["piel", "cabello", "mochila", "sueter", "uniforme_abajo", "playera", "pants", "tenis", "gorra", "lentes", "aretes"] as const;
export type Rampa = (typeof RAMPAS)[number];

export interface Pieza {
  id: string; // texture key: carpeta/nombre, e.g. "personaje/cuerpo_nina"
  archivo: string; // relative to public/assets
  tipo: Tipo;
  medida: [number, number];
  que: string;
  colores: Rampa[];
  generacion?: {
    orden: number;
    prompt: string;
    referencias: string[]; // relative to ARTE
    destino: string; // relative to ARTE
    despues: "acomodar" | "avisar";
  };
}

export interface Manifiesto {
  colores: Record<Rampa, { clave: string[]; variantes: string[][] }>;
  piezas: Pieza[];
}

type Grupo = {
  carpeta: string;
  tipo: Tipo;
  medida?: [number, number];
  colores?: Rampa[];
  piezas?: Record<string, string | { que: string; medida?: [number, number]; colores?: Rampa[]; generacion?: Pieza["generacion"] }>;
};

export function codigosValidos(): Set<string> {
  const doc = readFileSync(DOC_CODIGOS, "utf8");
  return new Set([...doc.matchAll(/`([A-Z][A-Z_]+)`/g)].map((m) => m[1]));
}

export function leerManifiesto(): Manifiesto {
  const m = parse(readFileSync(MANIFIESTO, "utf8"));
  const piezas: Pieza[] = [];
  for (const g of m.grupos as Grupo[]) {
    const entradas = Object.entries(g.piezas ?? {});
    for (const [nombre, v] of entradas) {
      const que = typeof v === "string" ? v : v.que;
      const medida = (typeof v === "string" ? undefined : v.medida) ?? g.medida;
      const colores = (typeof v === "string" ? undefined : v.colores) ?? g.colores ?? [];
      const generacion = typeof v === "string" ? undefined : v.generacion;
      if (!medida) throw new Error(`manifiesto: ${g.carpeta}/${nombre} no tiene medida`);
      piezas.push({ id: `${g.carpeta}/${nombre}`, archivo: `${g.carpeta}/${nombre}.png`, tipo: g.tipo, medida, que, colores, ...(generacion ? { generacion } : {}) });
    }
  }
  const repetidos = piezas.filter((p, i) => piezas.findIndex((q) => q.id === p.id) !== i);
  if (repetidos.length) throw new Error(`manifiesto: piezas repetidas ${repetidos.map((p) => p.id).join(", ")}`);
  return { colores: m.colores, piezas };
}

// Width and height from the PNG header, or null if the file is missing or not a PNG.
export function medidaPng(archivo: string): [number, number] | null {
  const ruta = join(ASSETS, archivo);
  if (!existsSync(ruta)) return null;
  const b = readFileSync(ruta);
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

// Placeholders carry a PNG text chunk "matices: provisional" so tools can tell them from final art.
const MARCA = Buffer.from("matices\0provisional", "latin1");

export function marcarProvisional(png: Buffer): Buffer {
  const fin = png.length - 12; // IEND chunk
  const tipo = Buffer.from("tEXt", "latin1");
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(MARCA.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tipo, MARCA])));
  return Buffer.concat([png.subarray(0, fin), largo, tipo, MARCA, crc, png.subarray(fin)]);
}

export function esProvisional(archivo: string): boolean {
  const ruta = join(ASSETS, archivo);
  return existsSync(ruta) && readFileSync(ruta).includes(MARCA);
}

// Art of each figure of the house (contenido/figuras.yaml): who it is for the generator, which body of the
// protagonist it is drawn from (same style) and how tall it stands in the game, feet to top of the head, in game
// pixels. The protagonist measures 60. Every figure is cut to exactly this height (acomodar.ts), so an adult is
// always taller than the child however big the generator drew it.
export const FIGURAS: Record<string, { que: string; base: "cuerpo_nina" | "cuerpo_nino"; alto: number }> = {
  mama: { que: "a mother of about 35, hair tied back, a plain blouse and jeans, flat shoes", base: "cuerpo_nina", alto: 74 },
  papa: { que: "a father of about 35, short dark hair, a plain polo shirt and jeans, sneakers", base: "cuerpo_nino", alto: 77 },
  tio: { que: "an uncle of about 30, short hair and a short beard, a plain t-shirt and jeans, sneakers", base: "cuerpo_nino", alto: 76 },
};
