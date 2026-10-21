// The people of the child's house (GDD §7), as the situations use them (GDD §9).
import contenido from "virtual:contenido";
import { estado, type FiguraPuesta } from "./guardado";

const porId = new Map(contenido.figuras.map((f) => [f.id, f]));

export const tipoDe = (figura: string) => porId.get(figura)?.tipo ?? "adulto";
export const nombreDe = (f: FiguraPuesta) => f.nombre ?? porId.get(f.figura)?.nombre ?? f.figura;
export const codigoDe = (f: FiguraPuesta) => `FIGURA:${f.inst}`;

// The nameplate in the house (GDD §7): the child's name for it, or the figure's name. A second copy of a
// figure gets its number, so two "Hermano menor" can be told apart.
export const etiquetaDe = (f: FiguraPuesta) => (f.nombre ? f.nombre : nombreDe(f) + (f.inst.includes("#") ? ` ${f.inst.split("#")[1]}` : ""));

// Next free instance id: abuela, then abuela#2, abuela#3…
export function nuevaInstancia(figura: string, casa: FiguraPuesta[]) {
  const usadas = new Set(casa.map((f) => f.inst));
  if (!usadas.has(figura)) return figura;
  let n = 2;
  while (usadas.has(`${figura}#${n}`)) n++;
  return `${figura}#${n}`;
}

// Who reacts in the house: the adult the child put closest to where they stand, or nobody (GDD §9).
export function adultoMasCerca(x: number, y: number): FiguraPuesta | null {
  let mejor: FiguraPuesta | null = null;
  for (const f of estado().casa)
    if (tipoDe(f.figura) === "adulto" && (!mejor || Math.hypot(f.x - x, f.y - y) < Math.hypot(mejor.x - x, mejor.y - y))) mejor = f;
  return mejor;
}
