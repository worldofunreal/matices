// The people of the child's house, as the stories use them ("¿Quién llega?", GDD §9).
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

// People who can arrive in a story: everyone in the house but pets; "casa_adultos" only adults.
export function personasDeCasa(soloAdultos = false) {
  return estado().casa.filter((f) => (soloAdultos ? tipoDe(f.figura) === "adulto" : tipoDe(f.figura) !== "mascota"));
}
