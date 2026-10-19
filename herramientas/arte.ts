// Reads public/assets/manifiesto.yaml and expands it into the full list of pieces.
// Shared by the build check (contenido.ts) and the placeholder generator (provisionales.ts).
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { crc32 } from "node:zlib";
import { parse } from "yaml";

export const ROOT = resolve(import.meta.dirname, "..");
export const ASSETS = join(ROOT, "public/assets");
export const MANIFIESTO = join(ASSETS, "manifiesto.yaml");
export const DOC_CODIGOS = join(ROOT, "docs/clinico/codigos-y-eventos.md");
export const PANEL_CPE = join(ROOT, "contenido/panel-cpe.yaml");

export type Tipo = "hoja" | "retrato" | "fondo" | "objeto" | "marco" | "tarjeta" | "boton" | "icono" | "ilustracion";
export type Rampa = "piel" | "cabello";

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
  expresiones?: string[];
  desde?: "codigos" | "panel-cpe";
  piezas?: Record<string, string | { que: string; medida: [number, number] }>;
};

export function codigosValidos(): Set<string> {
  const doc = readFileSync(DOC_CODIGOS, "utf8");
  return new Set([...doc.matchAll(/`([A-Z][A-Z_]+)`/g)].map((m) => m[1]));
}

export function panelCpe(): Record<string, [string, string][]> {
  return parse(readFileSync(PANEL_CPE, "utf8"));
}

export function leerManifiesto(): Manifiesto {
  const m = parse(readFileSync(MANIFIESTO, "utf8"));
  const piezas: Pieza[] = [];
  for (const g of m.grupos as Grupo[]) {
    let entradas: [string, string | { que: string; medida: [number, number] }][] = Object.entries(g.piezas ?? {});
    if (g.desde === "codigos")
      entradas = [...codigosValidos()].sort().map((c) => [c.toLowerCase(), `Código ${c}`]);
    if (g.desde === "panel-cpe")
      entradas = Object.entries(panelCpe()).flatMap(([grupo, ops]) => ops.map(([id, t]) => [id, `${grupo}: ${t}`]));
    for (const [nombre, v] of entradas) {
      const que = typeof v === "string" ? v : v.que;
      const medida = typeof v === "string" ? g.medida : v.medida;
      if (!medida) throw new Error(`manifiesto: ${g.carpeta}/${nombre} no tiene medida`);
      for (const sufijo of g.expresiones ?? [""]) {
        const n = sufijo ? `${nombre}_${sufijo}` : nombre;
        piezas.push({
          id: `${g.carpeta}/${n}`,
          archivo: `${g.carpeta}/${n}.png`,
          tipo: g.tipo,
          medida,
          que: sufijo ? `${que} (${sufijo})` : que,
          colores: g.colores ?? [],
        });
      }
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
