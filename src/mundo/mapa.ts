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
  puntosEstaticos?: Punto[];
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
export async function cargarMapa(
  lugar: string,
  semilla: string,
  dia = 1,
  hora: Hora = "manana",
  visitas = 0,
  cicloEscena = 0,
  misionActiva?: string
): Promise<Mapa> {
  const json = await (await fetch(`mapas/${lugar}.json`)).json();
  const capa = (nombre: string) => json.layers.find((l: { name: string }) => l.name === nombre);
  const objetos: ObjetoTiled[] = capa("objetos").objects;
  const llegadas: Record<string, { x: number; y: number }> = {};
  for (const o of objetos) if (o.type === "llegada") llegadas[o.name] = { x: o.x, y: o.y };
  const inicio = objetos.find((o) => o.name === "inicio") ?? objetos.find((o) => o.type === "llegada")!;
  const puntosEstaticos: Punto[] = objetos
    .filter((o) => o.type === "objeto" || o.type === "npc")
    .map((o) => ({
      nombre: o.name,
      tipo: o.type === "npc" ? ("npc" as const) : ("objeto" as const),
      x: o.x,
      y: o.y,
      arte: o.type === "npc" ? `personajes/${o.name}` : variante(propiedad(o, "arte") ?? `lugares/${lugar}/${o.name}`, `${semilla}:${lugar}:${o.x},${o.y}`),
      horas: propiedad(o, "horas"),
    }));

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
    puntos: [...puntosEstaticos],
    puntosEstaticos,
  };
  m.puntos.push(...vidaProcedural(m, semilla, lugar, dia, hora, visitas, cicloEscena, misionActiva));
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
export function vidaProcedural(
  m: Mapa,
  semillaBase: string,
  lugar: string,
  dia: number,
  hora: Hora,
  visitas = 0,
  cicloEscena = 0,
  misionActiva?: string
): Punto[] {
  const r = azar(`${semillaBase}:${lugar}:${dia}:${hora}:v${visitas}:c${cicloEscena}`);
  const sitios: Punto[] = [];

  // Protect all doors, doorsteps and arrival points from having procedural objects/vehicles blocking them.
  const ocupadas = new Set<string>();

  // Static points and arrival spots
  const basePuntos = m.puntosEstaticos ?? m.puntos;
  for (const p of basePuntos) {
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor((p.y - 1) / TILE);
    ocupadas.add(`${tx},${ty}`);

    // If this object is a counter (mostrador), keep the front interaction area clear (3 tiles wide, 2 tiles deep)
    if (p.nombre === "mostrador" || p.arte.includes("mostrador")) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = 0; dy <= 2; dy++) {
          ocupadas.add(`${tx + dx},${ty + dy}`);
        }
      }
    }

    // If this point is the active mission target, keep adjacent tiles clear
    if (misionActiva && p.nombre === misionActiva) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          ocupadas.add(`${tx + dx},${ty + dy}`);
        }
      }
    }
  }

  for (const l of Object.values(m.llegadas)) {
    const cx = Math.floor(l.x / TILE);
    const cy = Math.floor(l.y / TILE);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        ocupadas.add(`${cx + dx},${cy + dy}`);
      }
    }
  }

  // Generous door clearance (minimum 3 tiles in front of every door entrance)
  for (const d of m.puertas) {
    const minTx = Math.floor(d.x / TILE) - 1;
    const maxTx = Math.ceil((d.x + d.w) / TILE);
    const minTy = Math.floor(d.y / TILE) - 1;
    const maxTy = Math.ceil((d.y + d.h) / TILE) + 3;
    for (let tx = minTx; tx <= maxTx; tx++) {
      for (let ty = minTy; ty <= maxTy; ty++) {
        ocupadas.add(`${tx},${ty}`);
      }
    }
  }

  // Specifically in tiendita: clear the entire central walking aisle between door and counter
  if (lugar === "tiendita") {
    for (let tx = 5; tx <= 9; tx++) {
      for (let ty = 3; ty <= 8; ty++) {
        ocupadas.add(`${tx},${ty}`);
      }
    }
  }

  // In biblioteca_planta_baja: clear the central walkway from entrance to counter
  if (lugar === "biblioteca_planta_baja") {
    for (let tx = 13; tx <= 16; tx++) {
      for (let ty = 10; ty <= 18; ty++) {
        ocupadas.add(`${tx},${ty}`);
      }
    }
  }

  const buscarLibre = (intentos = 150, minFila = 0): Celda | null => {
    for (let i = 0; i < intentos; i++) {
      const tx = Math.floor(r.frac() * m.columnas);
      const ty = minFila + Math.floor(r.frac() * (m.filas - minFila));
      if (libre(m, tx, ty) && !ocupadas.has(`${tx},${ty}`)) {
        ocupadas.add(`${tx},${ty}`);
        return { tx, ty };
      }
    }
    return null;
  };

  // 1. Gatos
  if (LUGARES_CON_FAUNA.includes(lugar)) {
    // In tiendita, at most 1 cozy cat (or 0), while streets have 2-4
    const cuantosGatos = lugar === "tiendita" ? (r.frac() > 0.4 ? 1 : 0) : 2 + Math.floor(r.frac() * 3);
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

  // 4. Transeúntes y clientes al azar
  if (lugar === "tiendita") {
    // Small store (15x10): max 1 customer or empty (55% chance of 1 shopper, 45% empty)
    const hayCliente = r.frac() > 0.45;
    if (hayCliente) {
      // Anchors: right side (shelves / abarrotes) or left side (cooler / refrescos)
      const anclas = [
        { minTx: 10, maxTx: 12, minTy: 5, maxTy: 7 }, // Estante de abarrotes (derecha)
        { minTx: 2, maxTx: 4, minTy: 5, maxTy: 7 },   // Refrigerador de bebidas (izquierda)
        { minTx: 11, maxTx: 13, minTy: 7, maxTy: 8 }, // Esquina lateral
      ];
      const ancla = anclas[Math.floor(r.frac() * anclas.length)];
      let celdaCliente: Celda | null = null;
      for (let intento = 0; intento < 30; intento++) {
        const tx = ancla.minTx + Math.floor(r.frac() * (ancla.maxTx - ancla.minTx + 1));
        const ty = ancla.minTy + Math.floor(r.frac() * (ancla.maxTy - ancla.minTy + 1));
        if (libre(m, tx, ty) && !ocupadas.has(`${tx},${ty}`)) {
          ocupadas.add(`${tx},${ty}`);
          celdaCliente = { tx, ty };
          break;
        }
      }
      if (!celdaCliente) celdaCliente = buscarLibre(50);
      if (celdaCliente) {
        const personas = r.barajar(PERSONAS_FONDO);
        const figura = personas[0];
        const piel = Math.floor(r.frac() * 8);
        sitios.push({
          nombre: "vecino_generico",
          tipo: "npc",
          x: celdaCliente.tx * TILE + TILE / 2,
          y: celdaCliente.ty * TILE + TILE - 1,
          arte: `figuras/${figura}`,
          piel,
        });
      }
    }
  } else if (["calle", "parque", "biblioteca_planta_baja"].includes(lugar)) {
    const maxGente = lugar === "biblioteca_planta_baja" ? 2 : 3;
    const cuantasPersonas = 1 + Math.floor(r.frac() * maxGente);
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
  // Only parked in the roadway / curb area (rows 11-15), never on the pedestrian sidewalk or store entrance.
  if (lugar === "calle") {
    const cBici = buscarLibre(150, 11);
    if (cBici) {
      sitios.push({
        nombre: "bicicleta",
        tipo: "objeto",
        x: cBici.tx * TILE + TILE / 2,
        y: cBici.ty * TILE + TILE - 1,
        arte: "lugares/calle/bicicleta",
      });
    }
    const cMoto = buscarLibre(150, 11);
    if (cMoto) {
      sitios.push({
        nombre: "moto",
        tipo: "objeto",
        x: cMoto.tx * TILE + TILE / 2,
        y: cMoto.ty * TILE + TILE - 1,
        arte: "lugares/calle/moto",
      });
    }

    // Car needs 3 horizontal tiles and sits strictly on the lower roadway
    for (let intento = 0; intento < 100; intento++) {
      const tx = 4 + Math.floor(r.frac() * (m.columnas - 8));
      const ty = 12 + Math.floor(r.frac() * 3); // rows 12, 13, 14
      const despejado = [0, 1, 2].every((dx) => libre(m, tx + dx, ty) && !ocupadas.has(`${tx + dx},${ty}`));
      if (despejado) {
        [0, 1, 2].forEach((dx) => ocupadas.add(`${tx + dx},${ty}`));
        sitios.push({
          nombre: "carro",
          tipo: "objeto",
          x: (tx + 1) * TILE + TILE / 2,
          y: ty * TILE + TILE - 1,
          arte: "lugares/calle/carro",
        });
        break;
      }
    }
  }

  return sitios;
}

// Refreshes procedural life in-place on scene completions or dynamic state shifts
export function refrescarVidaProcedural(
  m: Mapa,
  semillaBase: string,
  lugar: string,
  dia: number,
  hora: Hora,
  visitas: number,
  cicloEscena: number,
  misionActiva?: string
): Punto[] {
  const base = m.puntosEstaticos ?? m.puntos.filter((p) => p.nombre !== "vecino_generico" && p.tipo !== "fauna");
  m.puntosEstaticos = base;
  const nuevaVida = vidaProcedural(m, semillaBase, lugar, dia, hora, visitas, cicloEscena, misionActiva);
  m.puntos = [...base, ...nuevaVida];
  return nuevaVida;
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
