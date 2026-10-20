// From events to what the dashboard shows (docs/clinico/reporte.md). Pure functions: the content comes in as
// a parameter, so `npm test` runs them without the game.
import type { Apariencia } from "../personaje/apariencia";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Evento = { nino: string; id: number; tipo: string; sesion: number; t_ms: number; cuando?: number; [k: string]: any };
export interface Contenido {
  cuentos: { id: string; titulo: string; area_principal: string; areas: string[] }[];
  areas: { id: string; nombre: string }[];
  sobreMi: { frases: { id: string; area: string; a: string; b: string }[] };
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
const contar = <K>(xs: K[]) => {
  const m = new Map<K, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
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
  const cuentos = de(evs, "cuento");
  const tramos = de(evs, "tramo");
  return {
    nino,
    primera: horas.length ? Math.min(...horas) : null,
    ultima: horas.length ? Math.max(...horas) : null,
    sesiones: new Set(evs.map((e) => e.sesion)).size,
    minutos: minutos(evs),
    dia: tramos.length ? Math.max(...tramos.map((t) => t.dia)) : 0,
    termino: tramos.some((t) => t.hora === "fin"),
    terminados: cuentos.filter((c) => c.que === "fin").length,
    ahoraNo: de(evs, "ahora_no").length,
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
    ["Casa", (evs) => evs.some((e) => e.tipo === "casa_lista")],
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

// For each area, how many times each code came up in the stories that cover it, and from which stories.
export function codigosPorArea(evs: Evento[], c: Contenido) {
  const areasDe = new Map(c.cuentos.map((x) => [x.id, [x.area_principal, ...x.areas]]));
  const m = new Map<string, Map<string, { n: number; cuentos: Set<string> }>>();
  for (const e of de(evs, "cuento_paso")) {
    for (const area of areasDe.get(e.cuento) ?? []) {
      const codigos = m.get(area) ?? (m.set(area, new Map()), m.get(area)!);
      // "Who comes" choices name a person; the area counts them with the rest.
      const f = codigos.get(e.elegida) ?? (codigos.set(e.elegida, { n: 0, cuentos: new Set() }), codigos.get(e.elegida)!);
      f.n++;
      f.cuentos.add(e.cuento);
    }
  }
  return m;
}

// The same count among everyone who played a story of that area: how many, the middle one, lowest, highest.
export function referencia(todos: Map<string, Map<string, { n: number }>>[], area: string, codigo: string) {
  const cuentas = todos.filter((m) => m.has(area)).map((m) => m.get(area)!.get(codigo)?.n ?? 0);
  return { N: cuentas.length, mediana: mediana(cuentas), min: cuentas.length ? Math.min(...cuentas) : 0, max: cuentas.length ? Math.max(...cuentas) : 0 };
}

export function patrones(evs: Evento[]) {
  const pasos = de(evs, "cuento_paso");
  return {
    buscoAyuda: pasos.filter((p) => p.elegida === "BUSCA_AYUDA").length,
    quienLlega: [...contar(pasos.filter((p) => p.paso === "quien_llega").map((p) => p.elegida as string))].sort((a, b) => b[1] - a[1]),
    ahoraNo: de(evs, "ahora_no").map((e) => ({ cuento: e.cuento, paso: e.paso })),
    lentas: [...pasos].sort((a, b) => b.ms_decidir - a.ms_decidir).slice(0, 3).map((p) => ({ cuento: p.cuento, paso: p.paso, elegida: p.elegida, segundos: Math.round(p.ms_decidir / 100) / 10 })),
  };
}

export function sobreMi(evs: Evento[], c: Contenido) {
  const frases = new Map(c.sobreMi.frases.map((f) => [f.id, f]));
  const m = new Map<string, { a: string; b: string; respuesta: string }[]>();
  for (const e of de(evs, "sobre_mi")) {
    const f = frases.get(e.frase);
    if (!f) continue;
    m.set(e.area, [...(m.get(e.area) ?? []), { a: f.a, b: f.b, respuesta: e.respuesta }]);
  }
  return m;
}

export function exploracion(evs: Evento[], c: Contenido) {
  const lugares = new Map<string, { ms: number; visitas: number; tocados: Set<string> }>();
  const lugar = (l: string) => lugares.get(l) ?? (lugares.set(l, { ms: 0, visitas: 0, tocados: new Set() }), lugares.get(l)!);
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
    piel: p.tono - 1,
    cabello: p.cabello,
    colorCabello: p.color_cabello - 1,
    ropa: uniforme ? "uniforme" : "casa",
    abajo: uniforme && String(p.ropa).endsWith("falda") ? "falda" : "pantalon",
    extras: p.extras ?? [],
    colorMochila: (p.color_mochila ?? 1) - 1,
  };
}

export function casa(evs: Evento[]) {
  const l = ultimo(evs, "casa_lista");
  if (!l) return null;
  const cuartos = new Map<string, { figura: string; distancia: number; renombrada: boolean }[]>();
  for (const f of l.figuras) cuartos.set(f.cuarto, [...(cuartos.get(f.cuarto) ?? []), f]);
  return { cuartos, protaCuarto: l.prota_cuarto as string | null };
}

export const csv = (evs: Evento[]) => {
  const q = (x: unknown) => `"${String(x ?? "").replaceAll('"', '""')}"`;
  return ["nino,id,sesion,tipo,t_ms,cuando,datos", ...evs.map((e) => [e.nino, e.id, e.sesion, e.tipo, e.t_ms, e.cuando ?? "", q(JSON.stringify(e))].join(","))].join("\n");
};
