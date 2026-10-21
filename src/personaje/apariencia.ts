// How the child's character looks (GDD §6) and which art layers draw it.
export type Direccion = "abajo" | "izq" | "der" | "arriba";
// Rows of a character sheet. "der" has no row: it is "izq" mirrored.
const FILAS: Direccion[] = ["abajo", "izq", "arriba"];
export const filaDe = (d: Direccion) => ({ fila: FILAS.indexOf(d === "der" ? "izq" : d), voltear: d === "der" });
export type Extra = "lentes" | "aretes" | "gorra" | "mochila";
import type { Colores } from "../lienzo/arte";

export interface Apariencia {
  cuerpo: "nina" | "nino";
  cabello: string; // "01".."10"
  ropa: "uniforme" | "casa";
  abajo: "pantalon" | "falda"; // only for the uniform
  extras: Extra[];
  // Chosen variant of each color ramp (skin, hair, each garment and extra); a missing ramp is variant 0.
  colores: Colores;
}

// Each body starts with its usual look; hair and clothes stay free for both (GDD §6).
export const LOOK: Record<Apariencia["cuerpo"], Pick<Apariencia, "cabello" | "abajo">> = {
  nina: { cabello: "01", abajo: "falda" },
  nino: { cabello: "06", abajo: "pantalon" },
};

export const APARIENCIA_INICIAL: Apariencia = {
  cuerpo: "nina",
  ...LOOK.nina,
  ropa: "uniforme",
  extras: [],
  colores: {},
};

// Walking sheets stacked bottom to top. Every layer shares the same frame, so they always line up.
export function capas(a: Apariencia): string[] {
  const ropa = a.ropa === "uniforme" ? ["ropa_uniforme_" + a.abajo, "ropa_uniforme_arriba"] : ["ropa_casa_abajo", "ropa_casa_arriba"];
  const extras = (["mochila", "lentes", "aretes", "gorra"] as const).filter((e) => a.extras.includes(e)).map((e) => "extra_" + e);
  return ["cuerpo_" + a.cuerpo, "calzado_tenis", ...ropa, "cabello_" + a.cabello, ...extras].map((c) => "personaje/" + c);
}

export const coloresDe = (a: Apariencia) => a.colores;
