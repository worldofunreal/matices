// How the child's character looks (GDD §6) and which art layers draw it.
export type Direccion = "abajo" | "izq" | "der" | "arriba";
// Rows of a character sheet. "der" has no row: it is "izq" mirrored.
const FILAS: Direccion[] = ["abajo", "izq", "arriba"];
export const filaDe = (d: Direccion) => ({ fila: FILAS.indexOf(d === "der" ? "izq" : d), voltear: d === "der" });
export type Expresion = "contento" | "neutral" | "triste" | "enojado" | "asustado";
export type Extra = "lentes" | "aretes" | "gorra" | "mochila";

export interface Apariencia {
  cuerpo: "nina" | "nino";
  piel: number; // index into colores.piel.variantes
  cabello: string; // "01".."10"
  colorCabello: number; // index into colores.cabello.variantes
  ropa: "uniforme" | "casa";
  abajo: "pantalon" | "falda"; // only for the uniform
  extras: Extra[];
  colorMochila: number; // index into colores.mochila.variantes
}

// Each body starts with its usual look; hair and clothes stay free for both (GDD §6).
export const LOOK: Record<Apariencia["cuerpo"], Pick<Apariencia, "cabello" | "abajo">> = {
  nina: { cabello: "01", abajo: "falda" },
  nino: { cabello: "06", abajo: "pantalon" },
};

export const APARIENCIA_INICIAL: Apariencia = {
  cuerpo: "nina",
  piel: 0,
  ...LOOK.nina,
  colorCabello: 0,
  ropa: "uniforme",
  extras: [],
  colorMochila: 0,
};

// Walking sheets stacked bottom to top. Every layer shares the same frame, so they always line up.
export function capas(a: Apariencia): string[] {
  const ropa = a.ropa === "uniforme" ? ["ropa_uniforme_" + a.abajo, "ropa_uniforme_arriba"] : ["ropa_casa_abajo", "ropa_casa_arriba"];
  const extras = (["mochila", "lentes", "aretes", "gorra"] as const).filter((e) => a.extras.includes(e)).map((e) => "extra_" + e);
  return ["cuerpo_" + a.cuerpo, "calzado_tenis", ...ropa, "cabello_" + a.cabello, ...extras].map((c) => "personaje/" + c);
}

// The 96×96 portrait, stacked from the same choices.
export function capasRetrato(a: Apariencia, expresion: Expresion = "neutral"): string[] {
  const extras = (["aretes", "lentes", "gorra"] as const).filter((e) => a.extras.includes(e)).map((e) => "retrato_extra_" + e);
  return [`retrato_cara_${a.cuerpo}_${expresion}`, `retrato_ropa_${a.ropa}`, `retrato_cabello_${a.cabello}`, ...extras].map((c) => "personaje/" + c);
}

export const coloresDe = (a: Apariencia) => ({ piel: a.piel, cabello: a.colorCabello, mochila: a.colorMochila });
