// The story (contenido/escenas.yaml) as the saved game sees it: which scene starts where the child is, what it leaves
// behind, and the objective that guides the child next. The rules themselves are in progreso.ts.
import contenido, { type Escena, type Hito } from "virtual:contenido";
import { estado, cambiarEstado } from "./guardado";
import { cerrarEscena, escenaPendiente, escenasDisponibles, esperaTras, hitoActual, pasoDeEscena, pendienteAbierta } from "./progreso";

export type Objetivo = Pick<Hito, "lugar" | "objeto" | "puertaDestino" | "mision" | "etiqueta">;

// The goal of the moment: the open pending thing in this place first, then the first objective of this part of the day.
export function objetivoActual(): Objetivo | null {
  const { dia, hora, historia, lugar } = estado();
  const abierta = pendienteAbierta(contenido.pendientes, historia, lugar);
  if (abierta) return { lugar: abierta.lugar, objeto: abierta.objeto, mision: abierta.mision, etiqueta: abierta.etiqueta };
  return hitoActual(contenido.hitos, historia.hechas, dia, hora) ?? null;
}

// Keeps the mission saved with the game in step with the goal.
export function sincronizarHistoria(): Objetivo | null {
  const obj = objetivoActual();
  const mision = obj?.mision ?? null;
  if (estado().historia.mision !== mision) cambiarEstado({ historia: { ...estado().historia, mision } }, true);
  return obj;
}

// Touching something whose scene must wait for an earlier one: the child is told what comes first.
export function pistaPaso(lugar: string, al: string): string | null {
  const { dia, hora, historia } = estado();
  if (!esperaTras(contenido.escenas, historia, dia, hora, lugar, al)) return null;
  const obj = objetivoActual();
  return obj ? `Primero: ${obj.mision}.` : null;
}

// The scene that starts now at `al` (a place: "entrar" or "salir:<lugar>"; or an object or a person touched), or null.
export function escenaPara(lugar: string, al: string): Escena | null {
  const { dia, hora, historia } = estado();
  return escenasDisponibles(contenido.escenas, historia, dia, hora, lugar, al)[0] ?? null;
}

// A person or object still has something to say or do here and now: a family member stays in the house until then.
export function quedaAlgoCon(lugar: string, objeto: string): boolean {
  const { dia, hora, historia } = estado();
  return escenaPendiente(contenido.escenas, historia, dia, hora, lugar, objeto);
}

// The line a scene goes on from, when it was paused.
export function pasoGuardado(id: string): number {
  return pasoDeEscena(estado().historia, id);
}

// The words marked {o} follow the child's body: "list{o}" is "listo" or "lista" (contenido/README.md).
export const conGenero = (texto: string) => texto.replace(/\{o\}/g, estado().apariencia.cuerpo === "nina" ? "a" : "o");

export const marcar = (marca: string) => {
  const h = estado().historia;
  if (!h.marcas.includes(marca)) cambiarEstado({ historia: { ...h, marcas: [...h.marcas, marca] } }, true);
};

// A scene stops: finished or skipped ones never come back, a paused one keeps the line it stopped at (progreso.ts).
export function terminarEscena(id: string, hecha: boolean, paso: number) {
  cambiarEstado({ historia: cerrarEscena(estado().historia, id, hecha, paso) }, true);
  sincronizarHistoria();
}
