// The words the educator reads: codes, places, scenes, dates and numbers in Spanish, never the game's own names.
import contenido from "virtual:contenido";
import type { Contenido } from "./calculos";

export const CONTENIDO: Contenido = { escenas: contenido.escenas, areas: contenido.areas, objetos: contenido.objetos };
const nombreDe = new Map(contenido.escenas.map((x) => [x.id, x.nombre]));
const figuraDe = new Map(contenido.figuras.map((f) => [f.id, f.nombre]));

// PIDE_AYUDA → "Pide ayuda"; a blank reads as a dash.
export function legible(id = "—") {
  const texto = (id || "—").replaceAll("_", " ").toLowerCase();
  return texto[0].toUpperCase() + texto.slice(1);
}

// FIGURA:tia#2 → "Tía (2)"; any other code reads as words.
export function etiqueta(codigo: string) {
  const [tipo, resto] = codigo.split(":");
  if (tipo === "FIGURA" && resto) {
    const [id, n] = resto.split("#");
    return `${figuraDe.get(id) ?? id}${n ? ` (${n})` : ""}`;
  }
  return legible(resto ?? codigo);
}

export const escena = (id: string) => nombreDe.get(id) ?? id;
export const fecha = (ms: number | null | undefined) => (ms ? new Date(ms).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "—");
export const numero = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 1 });

// Screens as an educator reads them; any other screen is written from its id.
const pantallas = new Map([["mundo", "Jugando"], ["creacion", "Creando personaje"], ["—", "Sin dato"]]);
export const lugar = (id = "—") => pantallas.get(id) ?? legible(id);

export function avanceMinijuego(p: Record<string, unknown> | null) {
  if (!p) return "—";
  const etapa = typeof p.etapa === "string" ? p.etapa.replaceAll("_", " ") : "avance";
  const claves = ["respondidas", "aciertos", "selecciones", "seleccionados", "intentos", "fallos", "ronda", "porcentaje", "presiones", "trazos", "puntos"];
  const datos = claves.filter((k) => typeof p[k] === "number").map((k) => `${k}: ${p[k]}`);
  return [etapa, ...datos].join(" · ");
}
