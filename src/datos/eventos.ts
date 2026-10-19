// Event log (docs/clinico/codigos-y-eventos.md). Every event is encrypted on the device with a key
// that never leaves it. Clinical and product events go to the same log; the product ones are
// also queued for the team's analytics server (PRD F16), which is sent in H8.
import contenido from "virtual:contenido";
import { leer, guardar, agregarEvento } from "./almacen";

// Until signed consents exist, only the team plays and all data is marked as a test (DECISIONES.md).
const ENTORNO = "prueba";
const VERSION_JUEGO = __VERSION_JUEGO__;

const PRODUCTO = new Set(["pantalla", "sesion", "toque_sin_efecto", "carga", "rendimiento", "error", "aparato"]);

interface Partida {
  nino: string;
  semilla: number;
  sesion: number;
  // The child's own yes (docs/legal/consentimiento-y-datos.md, step 3). null: not asked yet.
  // Until the answer, events wait in memory; with "Ahora no" nothing is ever stored.
  registro: boolean | null;
}

let pendientes: object[] = [];

let partida: Partida;
let inicio = performance.now();
let llave: CryptoKey;

async function obtenerLlave(): Promise<CryptoKey> {
  const guardada = await leer<CryptoKey>("llave");
  if (guardada) return guardada;
  const nueva = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await guardar("llave", nueva);
  return nueva;
}

// Starts a session: same child code and seed as before, next session number.
export async function iniciarRegistro(): Promise<Partida> {
  llave = await obtenerLlave();
  const previa = await leer<Partida>("partida");
  partida = previa
    ? { ...previa, sesion: previa.sesion + 1 }
    : { nino: `PRUEBA-${crypto.getRandomValues(new Uint16Array(1))[0].toString(16).padStart(4, "0")}`, semilla: crypto.getRandomValues(new Uint32Array(1))[0], sesion: 1, registro: null };
  await guardar("partida", partida);
  inicio = performance.now();
  return partida;
}

export const preguntado = () => partida.registro !== null;

export async function fijarRegistro(si: boolean) {
  partida = { ...partida, registro: si };
  await guardar("partida", partida);
  const cola = pendientes;
  pendientes = [];
  if (si) for (const e of cola) guardarEvento(e);
}

function guardarEvento(evento: object & { tipo?: unknown }) {
  void cifrar(evento).then((cifrado) => agregarEvento({ ...cifrado, enviar: PRODUCTO.has(String(evento.tipo)) }));
}

export function registrar(tipo: string, datos: Record<string, unknown> = {}) {
  if (partida.registro === false) return;
  const evento = {
    nino: partida.nino,
    sesion: partida.sesion,
    contenido: contenido.version,
    juego: VERSION_JUEGO,
    entorno: ENTORNO,
    semilla: partida.semilla,
    t_ms: Math.round(performance.now() - inicio),
    tipo,
    ...datos,
  };
  if (partida.registro === null) pendientes.push(evento);
  else guardarEvento(evento);
  if (import.meta.env.DEV) console.debug("evento", evento);
}

async function cifrar(evento: object) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const datos = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, llave, new TextEncoder().encode(JSON.stringify(evento)));
  return { iv, datos };
}

export async function descifrar(e: { iv: Uint8Array<ArrayBuffer>; datos: ArrayBuffer }) {
  const plano = await crypto.subtle.decrypt({ name: "AES-GCM", iv: e.iv }, llave, e.datos);
  return JSON.parse(new TextDecoder().decode(plano));
}
