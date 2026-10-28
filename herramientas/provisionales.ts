// Creates a placeholder PNG for every piece in public/assets/manifiesto.yaml that has no file yet.
// Run: npm run provisionales. With --rehacer it also redraws its own placeholders (marked inside
// the PNG with esProvisional); final art never carries the mark, so it is never touched.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { ASSETS, ROOT, FIGURAS, leerManifiesto, marcarProvisional, esProvisional, type Pieza, type Manifiesto } from "./arte.ts";

type Ctx = SKRSContext2D;
const FUENTE = "Adwaita Sans, sans-serif";

// Stable pastel color per name, so each placeholder is easy to tell apart.
function tono(nombre: string, l = 70) {
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 45% ${l}%)`;
}

function etiqueta(ctx: Ctx, texto: string, x: number, y: number, ancho: number, max = 14) {
  let t = max;
  ctx.font = `${t}px ${FUENTE}`;
  while (t > 6 && ctx.measureText(texto).width > ancho) ctx.font = `${--t}px ${FUENTE}`;
  ctx.fillStyle = "#1d1a24";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(texto, x, y);
}

function caja(ctx: Ctx, w: number, h: number, color: string, texto: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  etiqueta(ctx, texto, w / 2, h / 2, w - 6);
}

// One 32×48 figure, drawn at the bottom of a 48×64 frame. dir: 0 down, 1 left, 2 right, 3 up. paso: 0 still, 1..4 walk.
function figura(ctx: Ctx, ox: number, oy: number, dir: number, paso: number, capa: string, m: Manifiesto, nombre: string) {
  const [pc, pm, ps] = m.colores.piel.clave;
  const [cc, cm] = m.colores.cabello.clave;
  const pierna = paso === 0 ? 0 : [0, 2, 0, -2, 0][paso];
  const r = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + x, oy + y, w, h);
  };
  const cuerpoCompleto = capa === "cuerpo" || capa === "figura";
  if (cuerpoCompleto) {
    r(10, 6, 12, 12, pc); // head
    r(10, 16, 12, 2, pm);
    r(9, 18, 14, 14, capa === "figura" ? tono(nombre, 55) : pm); // torso
    r(6, 19, 3, 11, ps); // arms
    r(23, 19, 3, 11, ps);
    r(10, 32, 5, 12 + pierna, pm); // legs
    r(17, 32, 5, 12 - pierna, pm);
    if (dir === 0) {
      r(13, 10, 2, 2, "#1d1a24");
      r(18, 10, 2, 2, "#1d1a24");
    }
    if (dir === 1) r(11, 10, 2, 2, "#1d1a24");
    if (dir === 2) r(19, 10, 2, 2, "#1d1a24");
  }
  if (capa === "figura" || capa === "cabello") {
    r(9, 4, 14, 4, cc);
    if (dir === 3) r(9, 4, 14, 12, cm);
    else if (dir === 1) r(16, 4, 7, 9, cm);
    else if (dir === 2) r(9, 4, 7, 9, cm);
  }
  if (capa === "arriba") r(8, 18, 16, 14, tono(nombre, 55));
  if (capa === "abajo") {
    r(9, 30, 14, 4, tono(nombre, 45));
    r(10, 32, 5, 10 + pierna, tono(nombre, 45));
    r(17, 32, 5, 10 - pierna, tono(nombre, 45));
  }
  if (capa === "falda") r(8, 30, 16, 8, tono(nombre, 45));
  if (capa === "calzado") {
    r(10, 43 + pierna, 6, 4, "#3b3b4f");
    r(17, 43 - pierna, 6, 4, "#3b3b4f");
  }
  if (capa === "mochila") r(dir === 0 ? 6 : 8, 19, dir === 0 ? 3 : 16, 12, m.colores.mochila.clave[1]);
  if (capa === "extra") r(dir === 3 ? 8 : 11, dir === 3 ? 20 : 9, dir === 3 ? 16 : 10, dir === 3 ? 10 : 3, tono(nombre, 40));
}

const nombre = (p: Pieza) => p.id.split("/").at(-1)!;

function capaDe(p: Pieza) {
  const n = nombre(p);
  if (n.startsWith("cuerpo_")) return "cuerpo";
  if (n.startsWith("cabello_")) return "cabello";
  if (n.endsWith("_falda")) return "falda";
  if (n.endsWith("_arriba")) return "arriba";
  if (n.endsWith("_pantalon") || n.endsWith("_abajo")) return "abajo";
  if (n.startsWith("calzado_")) return "calzado";
  if (n === "extra_mochila") return "mochila";
  if (n.startsWith("extra_")) return "extra";
  return "figura";
}

// A figure of the house: a simple person (or a round pet) as tall as its age, feet at the bottom.
function persona(ctx: Ctx, p: Pieza, m: Manifiesto) {
  const n = nombre(p), { alto } = FIGURAS[n], [w, h] = p.medida;
  const pie = h - 2, cabeza = Math.round(alto * (alto < 40 ? 0.5 : 26 / alto + 0.04));
  const r = (x: number, y: number, ancho: number, a: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(w / 2 - ancho / 2 + x), Math.round(y), ancho, Math.round(a));
  };
  const [pc, pm, ps] = m.colores.piel.clave;
  const top = pie - alto, cuerpo = alto - cabeza;
  r(0, top, cabeza * 0.8, cabeza * 0.25, tono(n, 30)); // hair
  r(0, top + cabeza * 0.25, cabeza * 0.8, cabeza * 0.75, pc); // face
  r(-cabeza * 0.15, top + cabeza * 0.55, 2, 2, "#1d1a24");
  r(cabeza * 0.15, top + cabeza * 0.55, 2, 2, "#1d1a24");
  r(0, top + cabeza, cabeza * 0.9, cuerpo * 0.5, tono(n, 55)); // torso
  r(-cabeza * 0.55, top + cabeza + 1, 3, cuerpo * 0.42, ps); // arms
  r(cabeza * 0.55, top + cabeza + 1, 3, cuerpo * 0.42, ps);
  r(-cabeza * 0.2, top + cabeza + cuerpo * 0.5, cabeza * 0.32, cuerpo * 0.5, pm); // legs
  r(cabeza * 0.2, top + cabeza + cuerpo * 0.5, cabeza * 0.32, cuerpo * 0.5, pm);
}

function hoja(ctx: Ctx, p: Pieza, m: Manifiesto) {
  if (p.id.startsWith("figuras/")) return persona(ctx, p, m);
  const capa = capaDe(p);
  const filas = [0, 1, 3]; // abajo, izquierda, arriba (derecha is izquierda mirrored)
  for (let fila = 0; fila < p.medida[1] / 64; fila++)
    for (let paso = 0; paso < p.medida[0] / 48; paso++) figura(ctx, paso * 48 + 8, fila * 64 + 16, filas[fila], paso, capa, m, p.id);
}

// Walls from the map, if there is one for this place, so the placeholder matches the collisions.
function fondo(ctx: Ctx, p: Pieza) {
  const [w, h] = p.medida;
  const lugar = p.id.split("/")[1];
  ctx.fillStyle = tono(lugar, 80);
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  for (let x = 0; x <= w; x += 32) ctx.strokeRect(x, 0, 0, h);
  for (let y = 0; y <= h; y += 32) ctx.strokeRect(0, y, w, 0);
  const mapa = join(ROOT, "public/mapas", `${lugar}.json`);
  if (existsSync(mapa)) {
    const datos = JSON.parse(readFileSync(mapa, "utf8"));
    const muros = datos.layers.find((l: { name: string }) => l.name === "muros");
    ctx.fillStyle = tono(lugar, 40);
    muros?.data.forEach((t: number, i: number) => t && ctx.fillRect((i % datos.width) * 32, Math.floor(i / datos.width) * 32, 32, 32));
  }
}

function dibujar(p: Pieza, m: Manifiesto) {
  const [w, h] = p.medida;
  const lienzo = createCanvas(w, h);
  const ctx = lienzo.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const n = nombre(p).replace(/_/g, " ");
  if (p.tipo === "hoja") hoja(ctx, p, m);
  else if (p.tipo === "fondo") fondo(ctx, p);
  else caja(ctx, w, h, tono(n), n);
  return marcarProvisional(lienzo.encodeSync("png"));
}

const rehacer = process.argv.includes("--rehacer");
const m = leerManifiesto();
let creados = 0;
// Until the boy's body is drawn, his placeholder is the girl's body: both share the same silhouette, so
// every hair, garment and extra already fits him.
const COPIA: Record<string, string> = { "personaje/cuerpo_nino": "personaje/cuerpo_nina.png" };

for (const p of m.piezas) {
  const ruta = join(ASSETS, p.archivo);
  if (existsSync(ruta) && !(rehacer && esProvisional(p.archivo))) continue;
  mkdirSync(dirname(ruta), { recursive: true });
  const copia = COPIA[p.id];
  writeFileSync(ruta, copia && !esProvisional(copia) ? marcarProvisional(readFileSync(join(ASSETS, copia))) : dibujar(p, m));
  creados++;
}
console.log(`${m.piezas.length} piezas en el manifiesto; ${creados} provisionales nuevos`);
