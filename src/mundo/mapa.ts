// A map from public/mapas, in Tiled's format: walls (muros), doors,
// arrival points, objects and people. Positions are game pixels; a tile is TILE × TILE.
import type { Hora } from "../datos/guardado";
import { azar } from "../datos/azar";

export const TILE = 32;
// Places where animals wander in by chance: each partida gets its own, from its seed.
const LUGARES_CON_FAUNA = ["calle", "parque", "escuela_planta_baja", "tiendita", "biblioteca_planta_baja"];
const GATOS = ["gato_blanco", "gato_calico", "gato_ginger_dormido", "gato_kitten", "gato_negro", "gato_persa", "gato_siames"];
// Things drawn in several pictures so the places don't look the same: the first is the piece itself, the rest are _2, _3…
const VARIANTES: Record<string, number> = { "lugares/biblioteca_interior/librero": 5, "lugares/casa/maceta": 4 };
const PERSONAS_FONDO = [
  "abuela", "abuelo", "tia", "madrastra", "padrastro", "otra_persona",
  "hermano_mayor", "hermana_mayor", "hermano_menor", "hermana_menor",
  "primo", "prima"
];
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
  tipo: "objeto" | "npc" | "fauna"; // fauna: an animal that only walks by, never tapped
  x: number;
  y: number;
  arte: string;
  horas?: string;
  piel?: number;
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
export async function cargarMapa(lugar: string, semilla: string, dia = 1, hora: Hora = "manana"): Promise<Mapa> {
  const json = await (await fetch(`mapas/${lugar}.json`)).json();
  const capa = (nombre: string) => json.layers.find((l: { name: string }) => l.name === nombre);
  const objetos: ObjetoTiled[] = capa("objetos").objects;
  const llegadas: Record<string, { x: number; y: number }> = {};
  for (const o of objetos) if (o.type === "llegada") llegadas[o.name] = { x: o.x, y: o.y };
  const inicio = objetos.find((o) => o.name === "inicio") ?? objetos.find((o) => o.type === "llegada")!;
  const m: Mapa = {
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
        arte: o.type === "npc" ? `personajes/${o.name}` : variante(propiedad(o, "arte") ?? `lugares/${lugar}/${o.name}`, `${semilla}:${lugar}:${o.x},${o.y}`),
        horas: propiedad(o, "horas"),
      })),
  };
  m.puntos.push(...vidaProcedural(m, semilla, lugar, dia, hora));
  return m;
}

// Which picture of a thing with variants: the same seed and place always give the same one.
function variante(arte: string, semilla: string) {
  const n = VARIANTES[arte];
  if (!n) return arte;
  const k = 1 + Math.floor(azar(semilla).frac() * n);
  return k === 1 ? arte : `${arte}_${k}`;
}

// Procedural life: cats, dogs, background people and street vehicles.
function vidaProcedural(m: Mapa, semillaBase: string, lugar: string, dia: number, hora: Hora): Punto[] {
  const r = azar(`${semillaBase}:${lugar}:${dia}:${hora}`);
  const sitios: Punto[] = [];
  const ocupadas = new Set([
    ...m.puntos.map((p) => celdaDe(p.x, p.y)),
    ...m.puertas.map((d) => celdaDe(d.x, d.y)),
    celdaDe(m.inicio.x, m.inicio.y),
    ...Object.values(m.llegadas).map((l) => celdaDe(l.x, l.y)),
  ].map((c) => `${c.tx},${c.ty}`));

  const buscarLibre = (intentos = 150): Celda | null => {
    for (let i = 0; i < intentos; i++) {
      const tx = Math.floor(r.frac() * m.columnas);
      const ty = Math.floor(r.frac() * m.filas);
      if (libre(m, tx, ty) && !ocupadas.has(`${tx},${ty}`)) {
        ocupadas.add(`${tx},${ty}`);
        return { tx, ty };
      }
    }
    return null;
  };

  // 1. Gatos
  if (LUGARES_CON_FAUNA.includes(lugar)) {
    const cuantosGatos = 2 + Math.floor(r.frac() * 3);
    const gatos = r.barajar(GATOS);
    for (let i = 0; i < cuantosGatos; i++) {
      const c = buscarLibre();
      if (!c) break;
      const nombre = gatos[i % gatos.length];
      sitios.push({
        nombre,
        tipo: "fauna",
        x: c.tx * TILE + TILE / 2,
        y: c.ty * TILE + TILE - 1,
        arte: `fauna/${nombre}`,
      });
    }
  }

  // 3. Perros en la calle y parque
  if (lugar === "calle" || lugar === "parque") {
    const c = buscarLibre();
    if (c) {
      sitios.push({
        nombre: "perro",
        tipo: "fauna",
        x: c.tx * TILE + TILE / 2,
        y: c.ty * TILE + TILE - 1,
        arte: "figuras/perro",
      });
    }
  }

  // 4. Transeúntes y vecinos al azar
  if (["calle", "parque", "tiendita", "biblioteca_planta_baja"].includes(lugar)) {
    const cuantasPersonas = 1 + Math.floor(r.frac() * 3);
    const personas = r.barajar(PERSONAS_FONDO);
    for (let i = 0; i < cuantasPersonas; i++) {
      const c = buscarLibre();
      if (!c) break;
      const figura = personas[i % personas.length];
      const piel = Math.floor(r.frac() * 8);
      sitios.push({
        nombre: "vecino_generico",
        tipo: "npc",
        x: c.tx * TILE + TILE / 2,
        y: c.ty * TILE + TILE - 1,
        arte: `figuras/${figura}`,
        piel,
      });
    }
  }

  // 5. Vehículos en la calle (bicicletas, moto, carro)
  if (lugar === "calle") {
    const cBici = buscarLibre();
    if (cBici) {
      sitios.push({
        nombre: "bicicleta",
        tipo: "objeto",
        x: cBici.tx * TILE + TILE / 2,
        y: cBici.ty * TILE + TILE - 1,
        arte: "lugares/calle/bicicleta",
      });
    }
    const cMoto = buscarLibre();
    if (cMoto) {
      sitios.push({
        nombre: "moto",
        tipo: "objeto",
        x: cMoto.tx * TILE + TILE / 2,
        y: cMoto.ty * TILE + TILE - 1,
        arte: "lugares/calle/moto",
      });
    }
    const cCarro = buscarLibre();
    if (cCarro) {
      sitios.push({
        nombre: "carro",
        tipo: "objeto",
        x: cCarro.tx * TILE + TILE / 2,
        y: cCarro.ty * TILE + TILE - 1,
        arte: "lugares/calle/carro",
      });
    }
  }

  return sitios;
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
