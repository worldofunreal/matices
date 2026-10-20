// Event log (docs/clinico/codigos-y-eventos.md). Every event is encrypted on the device with a key
// that never leaves it, and sent to the server (docs/tecnico/arquitectura.md) when there is a network.
import contenido from "virtual:contenido";
import { leer, guardar, agregarEvento, eventosDesde } from "./almacen";

// Demo phase (DECISIONES.md): anonymous participants.
const ENTORNO = "demo";
const VERSION_JUEGO = __VERSION_JUEGO__;

interface Partida {
  nino: string;
  semilla: number;
  sesion: number;
}

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
    : { nino: crypto.randomUUID().slice(0, 8), semilla: crypto.getRandomValues(new Uint32Array(1))[0], sesion: 1 };
  await guardar("partida", partida);
  inicio = performance.now();
  return partida;
}

export const semilla = () => partida.semilla;

function guardarEvento(evento: object) {
  void cifrar(evento).then(agregarEvento);
}

export function registrar(tipo: string, datos: Record<string, unknown> = {}) {
  // Common fields go last so an event's own data can never overwrite them.
  const evento = {
    ...datos,
    nino: partida.nino,
    sesion: partida.sesion,
    contenido: contenido.version,
    juego: VERSION_JUEGO,
    entorno: ENTORNO,
    semilla: partida.semilla,
    t_ms: Math.round(performance.now() - inicio),
    cuando: Date.now(),
    tipo,
  };
  guardarEvento(evento);
  if (import.meta.env.DEV) console.debug("evento", evento);
}

async function cifrar(evento: object) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const datos = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, llave, new TextEncoder().encode(JSON.stringify(evento)));
  return { iv, datos };
}

type Cifrado = { iv: Uint8Array<ArrayBuffer>; datos: ArrayBuffer };

export async function descifrar(e: Cifrado) {
  const plano = await crypto.subtle.decrypt({ name: "AES-GCM", iv: e.iv }, llave, e.datos);
  return JSON.parse(new TextDecoder().decode(plano));
}

// Sends what the server has not confirmed, in batches, oldest first. Without a network the events wait
// on the device; the server keeps one copy of each (nino, id), so a batch sent twice is harmless.
const TANDA = 200;
let enviando = false;
async function enviar() {
  if (enviando || !navigator.onLine) return;
  enviando = true;
  try {
    for (;;) {
      const desde = (await leer<number>("enviadoHasta")) ?? 0;
      const { claves, valores } = await eventosDesde(desde, TANDA);
      if (!claves.length) return;
      const lote = await Promise.all(valores.map(async (v, i) => ({ ...(await descifrar(v as Cifrado)), id: claves[i] })));
      const r = await fetch("api/eventos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(lote), signal: AbortSignal.timeout(30_000) });
      if (!r.ok) return;
      await guardar("enviadoHasta", claves[claves.length - 1]);
    }
  } catch {
    // no network or the server is down: the next round tries again
  } finally {
    enviando = false;
  }
}
setInterval(enviar, 10_000);
addEventListener("online", enviar);
document.addEventListener("visibilitychange", () => document.hidden && void enviar());
