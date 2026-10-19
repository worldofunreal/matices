// Saved game: where the child is and how their character looks. Saved every few seconds and when
// the app goes to the background, so closing it at any point resumes there.
import { leer, guardar } from "./almacen";
import { APARIENCIA_INICIAL, type Apariencia } from "../personaje/Protagonista";
import type { Direccion } from "../arte";

export interface Estado {
  lugar: string;
  x: number | null; // null: the place's "inicio" point
  y: number | null;
  direccion: Direccion;
  apariencia: Apariencia;
  creado: boolean; // finished character creation
  nombre: string; // stays on the device; never goes into an event
  casa: FiguraPuesta[]; // who the child put in the house (GDD §7)
  casaLista: boolean;
  protaCasa: { x: number; y: number } | null; // where the child put their own character
}

export interface FiguraPuesta {
  inst: string; // figure id, or id#2, id#3 when placed more than once
  figura: string; // id in contenido/figuras.yaml
  cuarto: string;
  x: number;
  y: number;
  nombre: string | null; // the child's own name for it; stays on the device
  piel: number;
}

const NUEVO: Estado = { lugar: "casa", x: null, y: null, direccion: "abajo", apariencia: APARIENCIA_INICIAL, creado: false, nombre: "", casa: [], casaLista: false, protaCasa: null };

let actual: Estado = NUEVO;
let leido = false; // never write before the saved game was read, or it would be overwritten
const escribir = () => leido && void guardar("estado", actual);

export async function cargarEstado(): Promise<Estado> {
  actual = { ...NUEVO, ...(await leer<Estado>("estado")) };
  leido = true;
  return actual;
}

export function estado() {
  return actual;
}

export function cambiarEstado(cambios: Partial<Estado>, ahora = false) {
  actual = { ...actual, ...cambios };
  if (ahora) escribir();
}

setInterval(escribir, 5000);
document.addEventListener("visibilitychange", () => document.hidden && escribir());
addEventListener("pagehide", escribir);
