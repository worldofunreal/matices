// Reads public/assets/manifiesto.yaml and expands it into the full list of pieces.
// Shared by the build check (contenido.ts) and the placeholder generator (provisionales.ts).
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { crc32 } from "node:zlib";
import { parse } from "yaml";

export const ROOT = resolve(import.meta.dirname, "..");
// Where the generator images live, outside the repository (docs/arte/direccion-de-arte.md).
export const ARTE = join(homedir(), ".local/share/matices/arte");
export const ASSETS = join(ROOT, "public/assets");
export const MANIFIESTO = join(ASSETS, "manifiesto.yaml");
export const DOC_CODIGOS = join(ROOT, "docs/clinico/codigos-y-eventos.md");

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
  piezas?: Record<string, string | { que: string; medida?: [number, number]; colores?: Rampa[] }>;
};

export function codigosValidos(): Set<string> {
  const doc = readFileSync(DOC_CODIGOS, "utf8");
  return new Set([...doc.matchAll(/`([A-Z][A-Z_]+)`/g)].map((m) => m[1]));
}

export function leerManifiesto(): Manifiesto {
  const m = parse(readFileSync(MANIFIESTO, "utf8"));
  const piezas: Pieza[] = [];
  for (const g of m.grupos as Grupo[]) {
    const entradas: [string, string | { que: string; medida?: [number, number]; colores?: Rampa[] }][] = Object.entries(g.piezas ?? {});
    for (const [nombre, v] of entradas) {
      const que = typeof v === "string" ? v : v.que;
      const medida = (typeof v === "string" ? undefined : v.medida) ?? g.medida;
      const colores = (typeof v === "string" ? undefined : v.colores) ?? g.colores ?? [];
      if (!medida) throw new Error(`manifiesto: ${g.carpeta}/${nombre} no tiene medida`);
      piezas.push({ id: `${g.carpeta}/${nombre}`, archivo: `${g.carpeta}/${nombre}.png`, tipo: g.tipo, medida, que, colores });
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
  abuela: { que: "a grandmother of about 65, short gray hair, a plain cardigan over a blouse and a long skirt, flat shoes", base: "cuerpo_nina", alto: 70 },
  abuelo: { que: "a grandfather of about 65, short gray hair and a gray mustache, a plain button shirt and trousers, shoes", base: "cuerpo_nino", alto: 72 },
  mama: { que: "a mother of about 35, hair tied back, a plain blouse and jeans, flat shoes", base: "cuerpo_nina", alto: 74 },
  papa: { que: "a father of about 35, short dark hair, a plain polo shirt and jeans, sneakers", base: "cuerpo_nino", alto: 77 },
  tia: { que: "an aunt of about 30, shoulder-length hair, a plain t-shirt and trousers, sneakers", base: "cuerpo_nina", alto: 73 },
  tio: { que: "an uncle of about 30, short hair and a short beard, a plain t-shirt and jeans, sneakers", base: "cuerpo_nino", alto: 76 },
  madrastra: { que: "a stepmother of about 35, long loose hair, a plain sweater and trousers, flat shoes", base: "cuerpo_nina", alto: 74 },
  padrastro: { que: "a stepfather of about 35, very short hair, a plain button shirt and trousers, shoes", base: "cuerpo_nino", alto: 77 },
  otra_persona: { que: "an adult of about 40, short neat hair, a plain jacket over a t-shirt and trousers, shoes", base: "cuerpo_nino", alto: 75 },
  hermano_mayor: { que: "an older brother, a teenager of about 15, messy short hair, a plain hoodie and jeans, sneakers", base: "cuerpo_nino", alto: 70 },
  hermana_mayor: { que: "an older sister, a teenager of about 15, long hair in a ponytail, a plain hoodie and jeans, sneakers", base: "cuerpo_nina", alto: 68 },
  hermano_menor: { que: "a younger brother of about 5, short hair, a plain t-shirt and shorts, sneakers", base: "cuerpo_nino", alto: 50 },
  hermana_menor: { que: "a younger sister of about 5, two short pigtails, a plain t-shirt and a skirt, sneakers", base: "cuerpo_nina", alto: 50 },
  bebe: { que: "a baby of about 1, sitting on the floor facing the viewer, a few wisps of hair, a plain onesie", base: "cuerpo_nina", alto: 32 },
  primo: { que: "a boy cousin of about 9, short curly hair, a plain striped t-shirt and shorts, sneakers", base: "cuerpo_nino", alto: 59 },
  prima: { que: "a girl cousin of about 9, a short bob haircut, a plain t-shirt and leggings, sneakers", base: "cuerpo_nina", alto: 58 },
  perro: { que: "a friendly medium-size dog sitting and facing the viewer, plain fur in one color, no collar text", base: "cuerpo_nina", alto: 32 },
  gato: { que: "a house cat sitting and facing the viewer, plain fur in one color", base: "cuerpo_nina", alto: 26 },
};
