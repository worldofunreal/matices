// The story's rules, pure: what can start now, what waits for another scene, where a paused scene goes on, and the
// objective of the moment. escenas.ts feeds them the saved game and the story file; `npm test` runs them on their own.
import type { Escena, Hito, Pendiente } from "virtual:contenido";
import type { Historia, Hora } from "./guardado.ts";

const ids = (x: string | string[] | undefined): string[] => ([] as string[]).concat(x ?? []);

// The days of the story. After them come the free days, all alike (docs/diseno.md).
export const DIAS = 6;

// A free-day scene or objective (`libre`) belongs to every day after the story; the rest to their day, or to any day.
const deHoy = (x: { dia?: number; libre?: boolean }, dia: number) => (x.libre ? dia > DIAS : x.dia === undefined || x.dia === dia);

// The name a scene is done under: a free-day one is done once per day, so it comes back the next day.
export const claveEscena = (x: { id: string; libre?: boolean }, dia: number) => (x.libre ? `${x.id}@${dia}` : x.id);

// Due here and now: right place, time and marks, and not done yet. Its earlier scenes (tras) are not checked here.
const aqui = (x: Escena, historia: Historia, dia: number, hora: Hora, lugar: string, al: string) =>
  x.donde === lugar &&
  x.al === al &&
  deHoy(x, dia) &&
  (x.hora === undefined || x.hora === hora) &&
  !historia.hechas.includes(claveEscena(x, dia)) &&
  (x.si ?? []).every((m) => historia.marcas.includes(m)) &&
  (x.no ?? []).every((m) => !historia.marcas.includes(m));

// Any one of the scenes in `tras` done is enough; without `tras` a scene can always start.
export function cumpleTras(tras: string | string[] | undefined, hechas: string[]): boolean {
  const antes = ids(tras);
  return antes.length === 0 || antes.some((t) => hechas.includes(t));
}

// The scenes that can start now.
export function escenasDisponibles(escenas: Escena[], historia: Historia, dia: number, hora: Hora, lugar: string, al: string): Escena[] {
  return escenas.filter((x) => aqui(x, historia, dia, hora, lugar, al) && cumpleTras(x.tras, historia.hechas));
}

// A scene is due here and now but an earlier one is not done yet: the child is told what comes first.
export function esperaTras(escenas: Escena[], historia: Historia, dia: number, hora: Hora, lugar: string, al: string): boolean {
  return escenas.some((x) => aqui(x, historia, dia, hora, lugar, al) && !cumpleTras(x.tras, historia.hechas));
}

// Something is still to say or do with this person or object: a family member stays in the house until then.
export function escenaPendiente(escenas: Escena[], historia: Historia, dia: number, hora: Hora, lugar: string, objeto: string): boolean {
  return escenas.some((x) => aqui(x, historia, dia, hora, lugar, objeto));
}

// The line a scene goes on from: 0 when it never stopped midway.
export const pasoDeEscena = (historia: Historia, id: string): number => historia.progreso[id] ?? 0;

// A scene stops: finished ones never come back, and a paused one keeps the line it stopped at.
export function cerrarEscena(historia: Historia, id: string, hecha: boolean, paso: number): Historia {
  if (historia.hechas.includes(id)) return historia;
  if (!hecha) return { ...historia, progreso: { ...historia.progreso, [id]: paso } };
  const progreso = { ...historia.progreso };
  delete progreso[id];
  return { ...historia, hechas: [...historia.hechas, id], progreso };
}

// The thing left open in this place: its `abre` mark is given and its `cierra` mark is not.
export function pendienteAbierta(pendientes: Pendiente[], historia: Historia, lugar: string): Pendiente | null {
  return pendientes.find((p) => p.lugar === lugar && historia.marcas.includes(p.abre) && !historia.marcas.includes(p.cierra)) ?? null;
}

// The objective of the moment: the first one of this part of the day that is not done. One without `cumple` lasts
// until the part of the day changes.
export function hitoActual(hitos: Hito[], hechas: string[], dia: number, hora: Hora): Hito | undefined {
  return hitos.find((h) => deHoy(h, dia) && h.hora === hora && !ids(h.cumple).some((id) => hechas.includes(claveEscena({ id, libre: h.libre }, dia))));
}

// A saved game from before a field existed keeps what it had and gets the new field empty.
export function completarHistoria(parcial: Partial<Historia>): Historia {
  return { hechas: [], marcas: [], mision: null, progreso: {}, ...parcial };
}
