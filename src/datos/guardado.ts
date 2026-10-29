// Saved game: where the child is and how their character looks. Saved every few seconds and when
// the app goes to the background, so closing it at any point resumes there.
import { leer, guardar } from "./almacen";
import { APARIENCIA_INICIAL, LOOK, type Apariencia, type Direccion } from "../personaje/apariencia";
import { completarHistoria } from "./progreso";

export interface Estado {
  lugar: string;
  x: number | null; // null: the place's "inicio" point
  y: number | null;
  direccion: Direccion;
  apariencia: Apariencia;
  creado: boolean; // finished character creation
  semilla: string; // random once per partida: decides the animals and crowd of the background
  nombre: string; // stays on the device; never goes into an event
  dia: number; // 1 to 3
  hora: Hora;
  llegada: string | null; // arrival point after crossing a door
  visitas: Record<string, number>;
  historia: Historia; // the scenes of the story (contenido/escenas.yaml)
  libro: Pagina[]; // "Mi libro": the child's drawings
  opciones: Opciones; // the child's settings; saved at once when changed
}

// Levels go from 0 to 5. The voice never goes silent, so it starts at 1.
export interface Opciones {
  voz: number;
  musica: number;
  efectos: number;
  velocidad: "lenta" | "normal" | "rapida";
  lectura: boolean; // lectura sencilla
}

const OPCIONES_INICIALES: Opciones = { voz: 5, musica: 3, efectos: 3, velocidad: "normal", lectura: false };

export interface Pagina {
  dibujo: string; // the drawing, as an image
  cuando: number; // ms since epoch
}

export interface Historia {
  hechas: string[]; // scenes done or skipped: they never start again
  marcas: string[]; // what the child has lived or chosen; scenes ask for them with si and no
  mision: string | null; // the mission on screen
  progreso: Record<string, number>; // scene id -> the line a paused scene stopped at; gone once the scene is done
}

export type Hora = "manana" | "tarde" | "noche";

const NUEVO: Estado = { lugar: "casa", x: null, y: null, direccion: "abajo", apariencia: APARIENCIA_INICIAL, creado: false, semilla: "", nombre: "", dia: 1, hora: "manana", llegada: null, visitas: {}, historia: { hechas: [], marcas: [], mision: null, progreso: {} }, libro: [], opciones: OPCIONES_INICIALES };

let actual: Estado = NUEVO;
let leido = false; // never write before the saved game was read, or it would be overwritten
const escribir = () => leido && void guardar("estado", actual);

export async function cargarEstado(): Promise<Estado> {
  actual = { ...NUEVO, ...(await leer<Estado>("estado")) };
  // Games saved before the paused lines existed (historia.progreso) get an empty one.
  actual.historia = completarHistoria(actual.historia);
  // Games saved before the background was procedural get a seed now, and keep it from then on.
  if (!actual.semilla) actual.semilla = crypto.randomUUID();
  // Games saved before 2026-10-21: the neutral body continues as the girl's, and the three separate
  // colors (skin, hair, backpack) move into `colores`.
  const vieja = actual.apariencia as Apariencia & { piel?: number; colorCabello?: number; colorMochila?: number };
  if (!(vieja.cuerpo in LOOK)) vieja.cuerpo = "nina";
  if (!vieja.colores) {
    const { piel, colorCabello, colorMochila, ...resto } = vieja;
    actual.apariencia = { ...resto, colores: { piel: piel ?? 0, cabello: colorCabello ?? 0, mochila: colorMochila ?? 0 } };
  }
  // The old concept (before the story of 2026-10-27) is gone: its everyday situations and the house to arm.
  const anterior = actual as Estado & { situaciones?: unknown; casa?: unknown; casaLista?: unknown; protaCasa?: unknown };
  delete anterior.situaciones;
  delete anterior.casa;
  delete anterior.casaLista;
  delete anterior.protaCasa;
  // Games saved before 2026-10-28 in the school's yard: the yard is part of the ground floor now.
  if (actual.lugar === "escuela_patio") Object.assign(actual, { lugar: "escuela_planta_baja", llegada: "desde_calle", x: null, y: null });
  // Games saved before 2026-10-21 (version 0.1): the story pages keep only their drawings.
  const v01 = actual as Estado & { cuentos?: unknown };
  delete v01.cuentos;
  actual.libro = (actual.libro as (Pagina & { dibujos?: string[] })[]).flatMap((p) => (p.dibujos ? p.dibujos.map((d) => ({ dibujo: d, cuando: 0 })) : [p]));
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
