// npm run tiempo: how long the story takes to play, estimated from contenido/escenas.yaml. It is a gauge for
// writing, not a measurement: the real minutes of each child are on the dashboard (src/admin/calculos.ts, minutos).
// The assumptions are below; change them when a timed playthrough says otherwise.
import { validar } from "./contenido.ts";
import { DIAS } from "../src/datos/progreso.ts";

const PALABRAS_POR_MINUTO = 150; // read aloud by the voice
const POR_LINEA = 2; // seconds: turning the page, the next speaker
const POR_DECISION = 7; // seconds to read the options and choose
const AL_ENTRAR = 15; // seconds to reach the scene
const POR_OBJETIVO = 30; // seconds walking to each objective of the day
const POR_EFECTO = 3;
const MINIJUEGO: Record<string, number> = { refri: 40, estufa: 20, ropero: 30, cuerda: 30, dibujo: 60, pistas: 60, examen: 90, tienda: 90, trabajo: 40 };

const C = validar();
const palabras = (t: string | null | undefined) => (t ?? "").split(/\s+/).filter(Boolean).length;
const leer = (t: string | null | undefined) => (palabras(t) / PALABRAS_POR_MINUTO) * 60;

// One scene: every line, each choice with the average of its answers, minigames and effects.
function segundos(e: (typeof C.escenas)[number]) {
  let s = AL_ENTRAR;
  for (const p of e.pasos) {
    if (p.texto) s += leer(p.texto) + POR_LINEA;
    if (p.opciones) s += POR_DECISION + p.opciones.reduce((a, o) => a + leer(o[1]) / 2 + leer(o[2]), 0) / p.opciones.length;
    if (p.minijuego) s += MINIJUEGO[p.minijuego] ?? 45;
    if (p.efecto) s += POR_EFECTO;
  }
  return s;
}

const min = (s: number) => (s / 60).toFixed(1).padStart(5);
const suma = (xs: typeof C.escenas) => xs.reduce((a, e) => a + segundos(e), 0);
let historia = 0, opcional = 0;
for (let dia = 1; dia <= DIAS; dia++) {
  const deHoy = C.escenas.filter((e) => e.dia === dia);
  const obligatorias = deHoy.filter((e) => !e.sugerida), sugeridas = deHoy.filter((e) => e.sugerida);
  const caminar = C.hitos.filter((h) => h.dia === dia).length * POR_OBJETIVO;
  historia += suma(obligatorias) + caminar;
  opcional += suma(sugeridas);
  console.log(`Día ${dia}: ${min(suma(obligatorias) + caminar)} min (${obligatorias.length} escenas, ${min(caminar).trim()} min caminando), opcionales ${min(suma(sugeridas)).trim()} min`);
  for (const e of deHoy) console.log(`  ${e.id.padEnd(14)}${min(segundos(e))}  ${e.nombre}${e.sugerida ? " (opcional)" : ""}`);
}
const libres = C.escenas.filter((e) => e.libre);
console.log(`Historia: ${min(historia).trim()} min, con opcionales ${min(historia + opcional).trim()} min`);
console.log(`Un día libre con todas sus escenas: ${min(suma(libres) + C.hitos.filter((h) => h.libre).length * POR_OBJETIVO).trim()} min`);
console.log("Cuenta las dos ramas de una escena que cambia según una marca (ej. T05 y T05b): el total puede pasar 1 o 2 min por día.");
