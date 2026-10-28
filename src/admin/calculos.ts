// From events to what the dashboard shows. Pure functions: the content comes in as
// a parameter, so `npm test` runs them without the game.
import type { Apariencia } from "../personaje/apariencia";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Evento = { nino: string; id: number; tipo: string; sesion: number; t_ms: number; cuando?: number; [k: string]: any };
export interface Contenido {
  escenas: { id: string; nombre: string; areas?: string[] }[];
  areas: { id: string; nombre: string }[];
  objetos: Record<string, string[]>; // what can be touched in each place
}

export const porParticipante = (eventos: Evento[]) => {
  const m = new Map<string, Evento[]>();
  for (const e of eventos) m.set(e.nino, [...(m.get(e.nino) ?? []), e]);
  for (const l of m.values()) l.sort((a, b) => a.id - b.id);
  return m;
};

const de = (evs: Evento[], tipo: string) => evs.filter((e) => e.tipo === tipo);
const ultimo = (evs: Evento[], tipo: string) => de(evs, tipo).at(-1);
export const mediana = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// "Android · Chrome" from the browser's description: enough to tell devices apart, never a device id.
export function aparatoDe(ua: string | undefined) {
  if (!ua) return "—";
  const sistema = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /CrOS/.test(ua) ? "Chromebook" : /Linux/.test(ua) ? "Linux" : "Otro";
  const navegador = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Otro";
  return `${sistema} · ${navegador}`;
}

// Minutes played: each session lasts until its last event.
export function minutos(evs: Evento[]) {
  const fin = new Map<number, number>();
  for (const e of evs) fin.set(e.sesion, Math.max(fin.get(e.sesion) ?? 0, e.t_ms));
  return Math.round([...fin.values()].reduce((a, b) => a + b, 0) / 60000);
}

export function resumen(nino: string, evs: Evento[]) {
  const horas = evs.map((e) => e.cuando).filter((x): x is number => typeof x === "number");
  const elecciones = de(evs, "escena").filter((e) => e.paso === "opcion");
  const tramos = de(evs, "tramo");
  return {
    nino,
    primera: horas.length ? Math.min(...horas) : null,
    ultima: horas.length ? Math.max(...horas) : null,
    sesiones: new Set(evs.map((e) => e.sesion)).size,
    minutos: minutos(evs),
    dia: tramos.length ? Math.max(...tramos.map((t) => t.dia)) : 0,
    termino: tramos.some((t) => t.hora === "fin"),
    respuestas: elecciones.length,
    minijuegos: de(evs, "minijuego").length,
    quiereHablar: de(evs, "quiero_hablar").length,
    aparato: aparatoDe(ultimo(evs, "aparato")?.navegador),
    errores: de(evs, "error").length,
    ultimaPantalla: ultimo(evs, "pantalla")?.pantalla ?? "—",
  };
}
export type Resumen = ReturnType<typeof resumen>;

// How far each participant got, in the order of the game.
export function avance(grupos: Map<string, Evento[]>) {
  const pasos: [string, (evs: Evento[]) => boolean][] = [
    ["Personaje", (evs) => evs.some((e) => e.tipo === "personaje")],
    ["Mundo", (evs) => evs.some((e) => e.tipo === "pantalla" && e.pantalla === "mundo")],
    ["Día 2", (evs) => evs.some((e) => e.tipo === "tramo" && e.dia >= 2)],
    ["Día 3", (evs) => evs.some((e) => e.tipo === "tramo" && e.dia >= 3)],
    ["Final", (evs) => evs.some((e) => e.tipo === "tramo" && e.hora === "fin")],
  ];
  const todos = [...grupos.values()];
  return pasos.map(([nombre, llego]) => ({ nombre, n: todos.filter(llego).length, de: todos.length }));
}

// Use per screen: time on it (from one screen event to the next in the same session) and the signs of trouble.
export function usoPorPantalla(grupos: Map<string, Evento[]>) {
  const filas = new Map<string, { tiempos: number[]; sinEfecto: number; pausas: number; voz: number }>();
  const fila = (p: string) => filas.get(p) ?? (filas.set(p, { tiempos: [], sinEfecto: 0, pausas: 0, voz: 0 }), filas.get(p)!);
  for (const evs of grupos.values()) {
    const vistas = de(evs, "pantalla");
    vistas.forEach((v, i) => {
      const sig = vistas[i + 1];
      const fin = sig && sig.sesion === v.sesion ? sig.t_ms : Math.max(...evs.filter((e) => e.sesion === v.sesion).map((e) => e.t_ms));
      fila(v.pantalla).tiempos.push(fin - v.t_ms);
    });
    for (const e of evs) {
      if (e.tipo === "toque_sin_efecto") fila(e.pantalla ?? "—").sinEfecto++;
      if (e.tipo === "inactividad") fila(e.pantalla ?? "—").pausas++;
      if (e.tipo === "repetir_voz") fila(e.pantalla ?? "—").voz++;
    }
  }
  return [...filas].map(([pantalla, f]) => ({ pantalla, segundos: Math.round(mediana(f.tiempos) / 1000), sinEfecto: f.sinEfecto, pausas: f.pausas, voz: f.voz })).sort((a, b) => b.sinEfecto + b.pausas - (a.sinEfecto + a.pausas));
}

export function errores(grupos: Map<string, Evento[]>) {
  const m = new Map<string, { n: number; ninos: Set<string>; aparatos: Set<string> }>();
  for (const [nino, evs] of grupos) {
    const aparato = aparatoDe(ultimo(evs, "aparato")?.navegador);
    for (const e of de(evs, "error")) {
      const f = m.get(e.mensaje) ?? (m.set(e.mensaje, { n: 0, ninos: new Set(), aparatos: new Set() }), m.get(e.mensaje)!);
      f.n++;
      f.ninos.add(nino);
      f.aparatos.add(aparato);
    }
  }
  return [...m].map(([mensaje, f]) => ({ mensaje, n: f.n, participantes: f.ninos.size, aparatos: [...f.aparatos].join(", ") })).sort((a, b) => b.n - a.n);
}

export function fpsPorAparato(grupos: Map<string, Evento[]>) {
  const m = new Map<string, number[]>();
  for (const evs of grupos.values()) {
    const aparato = aparatoDe(ultimo(evs, "aparato")?.navegador);
    m.set(aparato, [...(m.get(aparato) ?? []), ...de(evs, "rendimiento").map((r) => r.fps)]);
  }
  return [...m].filter(([, f]) => f.length).map(([aparato, f]) => ({ aparato, fps: Math.round(mediana(f)), medidas: f.length }));
}

// For each area, how many times each code was chosen in the scenes that cover it, and from which ones.
export function codigosPorArea(evs: Evento[], c: Contenido) {
  const areasDe = new Map(c.escenas.map((x) => [x.id, x.areas ?? []]));
  const m = new Map<string, Map<string, { n: number; escenas: Set<string> }>>();
  for (const e of de(evs, "escena").filter((x) => x.paso === "opcion")) {
    for (const area of areasDe.get(e.escena) ?? []) {
      const codigos = m.get(area) ?? (m.set(area, new Map()), m.get(area)!);
      const f = codigos.get(e.elegida) ?? (codigos.set(e.elegida, { n: 0, escenas: new Set() }), codigos.get(e.elegida)!);
      f.n++;
      f.escenas.add(e.escena);
    }
  }
  return m;
}

// The same count among everyone who chose in a scene of that area: how many, the middle one, lowest, highest.
export function referencia(todos: Map<string, Map<string, { n: number }>>[], area: string, codigo: string) {
  const cuentas = todos.filter((m) => m.has(area)).map((m) => m.get(area)!.get(codigo)?.n ?? 0);
  return { N: cuentas.length, mediana: mediana(cuentas), min: cuentas.length ? Math.min(...cuentas) : 0, max: cuentas.length ? Math.max(...cuentas) : 0 };
}

// Each scene as it went: how many times it started, how many times it was skipped or paused, and every choice in
// order with who spoke and how many seconds it took to choose. Only what happened, never what it means.
export function escenas(evs: Evento[]) {
  const m = new Map<string, { veces: number; saltada: number; pausada: number; elecciones: { codigo: string; de: string; segundos: number }[] }>();
  const fila = (id: string) => m.get(id) ?? (m.set(id, { veces: 0, saltada: 0, pausada: 0, elecciones: [] }), m.get(id)!);
  for (const e of de(evs, "escena")) {
    const f = fila(e.escena);
    if (e.paso === "inicio") f.veces++;
    if (e.paso === "opcion") f.elecciones.push({ codigo: e.elegida, de: e.de, segundos: Math.round(e.ms_decidir / 100) / 10 });
    if (e.paso === "fin" && e.saltada) f.saltada++;
    if (e.paso === "fin" && e.pausada) f.pausada++;
  }
  return m;
}

// Each minigame as it was played: what it was, how it ended, how long it took and the choice it left, if any.
export const minijuegos = (evs: Evento[]) => de(evs, "minijuego").map((e) => ({ minijuego: e.minijuego, resultado: e.resultado, segundos: Math.round(e.ms / 100) / 10, codigo: e.codigo ?? "" }));

export function exploracion(evs: Evento[], c: Contenido) {
  const lugares = new Map<string, { ms: number; visitas: number; corrio: number; tocados: Set<string> }>();
  const lugar = (l: string) => lugares.get(l) ?? (lugares.set(l, { ms: 0, visitas: 0, corrio: 0, tocados: new Set() }), lugares.get(l)!);
  for (const e of de(evs, "corre")) lugar(e.lugar).corrio += e.ms;
  for (const e of de(evs, "explora")) {
    const l = lugar(e.lugar);
    if (e.ms != null) {
      l.ms += e.ms;
      l.visitas = Math.max(l.visitas, e.visitas ?? 0);
    }
    if (e.objeto) l.tocados.add(e.objeto);
    if (e.persona) l.tocados.add(e.persona);
  }
  return [...lugares].map(([nombre, l]) => ({
    lugar: nombre,
    minutos: Math.round(l.ms / 6000) / 10,
    visitas: l.visitas,
    segundosCorriendo: Math.round(l.corrio / 1000),
    tocados: [...l.tocados],
    noTocados: [...new Set(c.objetos[nombre] ?? [])].filter((o) => !l.tocados.has(o)),
  })).sort((a, b) => b.minutos - a.minutos);
}

export function calidad(evs: Evento[]) {
  const pausas = de(evs, "inactividad");
  return {
    sesiones: new Set(evs.map((e) => e.sesion)).size,
    minutos: minutos(evs),
    pausas: pausas.length,
    minutosEnPausa: Math.round(pausas.reduce((a, p) => a + p.ms, 0) / 6000) / 10,
    voz: de(evs, "repetir_voz").length,
    sinEfecto: de(evs, "toque_sin_efecto").length,
    errores: de(evs, "error").length,
  };
}

// The character as the child left it, rebuilt from the last "personaje" event.
export function aparienciaDe(evs: Evento[]): Apariencia | null {
  const p = ultimo(evs, "personaje");
  if (!p) return null;
  const uniforme = String(p.ropa).startsWith("uniforme");
  return {
    cuerpo: p.cuerpo,
    cabello: p.cabello,
    ropa: uniforme ? "uniforme" : "casa",
    abajo: uniforme && String(p.ropa).endsWith("falda") ? "falda" : "pantalon",
    extras: p.extras ?? [],
    colores: {
      ...Object.fromEntries(Object.entries((p.colores ?? {}) as Record<string, number>).map(([r, n]) => [r, n - 1])),
      piel: p.tono - 1,
      cabello: p.color_cabello - 1,
      mochila: (p.color_mochila ?? 1) - 1,
    },
  };
}

export const csv = (evs: Evento[]) => {
  const q = (x: unknown) => `"${String(x ?? "").replaceAll('"', '""')}"`;
  return ["nino,id,sesion,tipo,t_ms,cuando,datos", ...evs.map((e) => [e.nino, e.id, e.sesion, e.tipo, e.t_ms, e.cuando ?? "", q(JSON.stringify(e))].join(","))].join("\n");
};
