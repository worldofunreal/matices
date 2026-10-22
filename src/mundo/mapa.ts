// A map from public/mapas, in Tiled's format: walls (muros), doors,
// arrival points, objects and people. Positions are game pixels; a tile is TILE × TILE.
import type { Hora } from "../datos/guardado";

export const TILE = 32;
const VECINOS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export interface Celda {
  tx: number;
  ty: number;
}
export interface Zona {
  nombre: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Puerta extends Zona {
  destino: string;
  llegada: string;
  horas?: string;
}
// Something the child can tap: an object (x, y at its base) or a fixed person (x, y at the feet).
export interface Punto {
  nombre: string;
  tipo: "objeto" | "npc";
  x: number;
  y: number;
  arte: string;
  horas?: string;
}
export interface Mapa {
  lugar: string;
  ancho: number;
  alto: number;
  columnas: number;
  filas: number;
  muros: Uint8Array; // 1 where the floor is blocked
  puertas: Puerta[];
  llegadas: Record<string, { x: number; y: number }>;
  inicio: { x: number; y: number };
  puntos: Punto[];
}

interface ObjetoTiled {
  name: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties?: { name: string; value: string }[];
}

const propiedad = (o: ObjetoTiled, nombre: string) => o.properties?.find((p) => p.name === nombre)?.value;

// Reads public/mapas/<lugar>.json. Read again on every visit, so the walls always start whole.
export async function cargarMapa(lugar: string): Promise<Mapa> {
  const json = await (await fetch(`mapas/${lugar}.json`)).json();
  const capa = (nombre: string) => json.layers.find((l: { name: string }) => l.name === nombre);
  const objetos: ObjetoTiled[] = capa("objetos").objects;
  const llegadas: Record<string, { x: number; y: number }> = {};
  for (const o of objetos) if (o.type === "llegada") llegadas[o.name] = { x: o.x, y: o.y };
  const inicio = objetos.find((o) => o.name === "inicio") ?? objetos.find((o) => o.type === "llegada")!;
  return {
    lugar,
    ancho: json.width * json.tilewidth,
    alto: json.height * json.tileheight,
    columnas: json.width,
    filas: json.height,
    muros: Uint8Array.from(capa("muros").data as number[], (v) => (v ? 1 : 0)),
    puertas: objetos
      .filter((o) => o.type === "puerta")
      .map((o) => ({ nombre: o.name, x: o.x, y: o.y, w: o.width ?? 0, h: o.height ?? 0, destino: propiedad(o, "destino")!, llegada: propiedad(o, "llegada")!, horas: propiedad(o, "horas") })),
    llegadas,
    inicio: { x: inicio.x, y: inicio.y },
    puntos: objetos
      .filter((o) => o.type === "objeto" || o.type === "npc")
      .map((o) => ({
        nombre: o.name,
        tipo: o.type === "npc" ? ("npc" as const) : ("objeto" as const),
        x: o.x,
        y: o.y,
        arte: o.type === "npc" ? `personajes/${o.name}` : (propiedad(o, "arte") ?? `lugares/${lugar}/${o.name}`),
        horas: propiedad(o, "horas"),
      })),
  };
}

export const visible = (p: Punto, hora: Hora) => !p.horas || p.horas.split(",").includes(hora);

// People who are not around at this hour stop blocking the floor where they stand.
export function quitarAusentes(m: Mapa, hora: Hora) {
  for (const p of m.puntos) if (p.tipo === "npc" && !visible(p, hora)) m.muros[Math.floor((p.y - 1) / TILE) * m.columnas + Math.floor(p.x / TILE)] = 0;
}

export const celdaDe = (x: number, y: number): Celda => ({ tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) });

export function libre(m: Mapa, tx: number, ty: number) {
  return tx >= 0 && ty >= 0 && tx < m.columnas && ty < m.filas && !m.muros[ty * m.columnas + tx];
}

// The nearest free tile to a tap, up to 3 tiles away: a tap on a wall or furniture walks to its side.
export function libreCerca(m: Mapa, tx: number, ty: number): Celda | null {
  for (let r = 0; r <= 3; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (libre(m, tx + dx, ty + dy)) return { tx: tx + dx, ty: ty + dy };
      }
  return null;
}

// Shortest walk over the tiles (breadth first), without the starting tile. Empty when there is none.
export function rutaA(m: Mapa, desde: Celda, hasta: Celda): Celda[] {
  if (!libre(m, hasta.tx, hasta.ty)) return [];
  const origen = desde.ty * m.columnas + desde.tx;
  const meta = hasta.ty * m.columnas + hasta.tx;
  const previo = new Int32Array(m.columnas * m.filas).fill(-1);
  previo[origen] = origen;
  const cola = [origen];
  for (let i = 0; i < cola.length && previo[meta] === -1; i++) {
    const tx = cola[i] % m.columnas;
    const ty = Math.floor(cola[i] / m.columnas);
    for (const [dx, dy] of VECINOS) {
      if (!libre(m, tx + dx, ty + dy)) continue;
      const k = (ty + dy) * m.columnas + tx + dx;
      if (previo[k] !== -1) continue;
      previo[k] = cola[i];
      cola.push(k);
    }
  }
  if (previo[meta] === -1) return [];
  const ruta: Celda[] = [];
  for (let k = meta; k !== origen; k = previo[k]) ruta.unshift({ tx: k % m.columnas, ty: Math.floor(k / m.columnas) });
  return ruta;
}
