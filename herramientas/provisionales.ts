// Creates a placeholder PNG for every piece in public/assets/manifiesto.yaml that has no file yet.
// Run: npm run provisionales. With --rehacer it also redraws its own placeholders (marked inside
// the PNG with esProvisional); final art never carries the mark, so it is never touched.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { ASSETS, ROOT, leerManifiesto, marcarProvisional, esProvisional, type Pieza, type Manifiesto } from "./arte.ts";

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

// One 32×48 frame. dir: 0 down, 1 left, 2 right, 3 up. paso: 0 still, 1..4 walk.
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

function hoja(ctx: Ctx, p: Pieza, m: Manifiesto) {
  const capa = capaDe(p);
  for (let dir = 0; dir < 4; dir++)
    for (let paso = 0; paso < 5; paso++) figura(ctx, paso * 32, dir * 48, dir, paso, capa, m, p.id);
}

function retrato(ctx: Ctx, p: Pieza, m: Manifiesto) {
  const n = nombre(p).replace(/^retrato_/, "");
  const [pc, pm] = m.colores.piel.clave;
  const [cc] = m.colores.cabello.clave;
  const expresion = ["contento", "neutral", "triste", "enojado", "asustado"].find((e) => n.endsWith(`_${e}`));
  const capa = n.startsWith("cara_") ? "cara" : n.startsWith("cabello_") ? "cabello" : n.startsWith("ropa_") ? "ropa" : n.startsWith("extra_") ? "extra" : "completo";
  const c = (x: number, y: number, rad: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  };
  if (capa === "cara" || capa === "completo") {
    ctx.fillStyle = capa === "completo" ? tono(n, 55) : pm;
    ctx.fillRect(18, 74, 60, 22); // shoulders
    c(48, 44, 26, pc);
    ctx.fillStyle = "#1d1a24";
    ctx.fillRect(37, 40, 5, 5);
    ctx.fillRect(54, 40, 5, 5);
    ctx.strokeStyle = "#1d1a24";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const boca = { contento: [56, 1], neutral: [58, 0], triste: [62, -1], enojado: [60, -0.5], asustado: [58, 0] }[expresion ?? "neutral"]!;
    ctx.moveTo(39, boca[0]);
    ctx.quadraticCurveTo(48, boca[0] + 8 * boca[1], 57, boca[0]);
    ctx.stroke();
    if (expresion === "asustado") c(48, 60, 4, "#1d1a24");
  }
  if (capa === "cabello" || capa === "completo") {
    ctx.fillStyle = cc;
    ctx.beginPath();
    ctx.arc(48, 40, 28, Math.PI, 0);
    ctx.fill();
  }
  if (capa === "ropa") {
    ctx.fillStyle = tono(n, 55);
    ctx.fillRect(18, 76, 60, 20);
  }
  if (capa === "extra") {
    ctx.strokeStyle = tono(n, 35);
    ctx.lineWidth = 4;
    ctx.strokeRect(32, 36, 32, 12);
  }
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

function marco(ctx: Ctx, p: Pieza) {
  ctx.fillStyle = tono(p.id, 85);
  ctx.fillRect(0, 0, 48, 48);
  ctx.strokeStyle = tono(p.id, 35);
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 40, 40);
  ctx.fillStyle = tono(p.id, 35);
  for (const [x, y] of [[0, 0], [40, 0], [0, 40], [40, 40]]) ctx.fillRect(x, y, 8, 8);
}

function icono(ctx: Ctx, p: Pieza) {
  const [w, h] = p.medida;
  const n = nombre(p);
  ctx.fillStyle = tono(n, 75);
  ctx.beginPath();
  ctx.roundRect(1, 1, w - 2, h - 2, 6);
  ctx.fill();
  ctx.strokeStyle = tono(n, 35);
  ctx.lineWidth = 2;
  ctx.stroke();
  const carita = n.match(/^carita_(\d)$/);
  if (carita) {
    const k = Number(carita[1]) - 3;
    ctx.fillStyle = "#1d1a24";
    ctx.fillRect(10, 11, 3, 3);
    ctx.fillRect(19, 11, 3, 3);
    ctx.strokeStyle = "#1d1a24";
    ctx.beginPath();
    ctx.moveTo(9, 21);
    ctx.quadraticCurveTo(16, 21 + k * 3, 23, 21);
    ctx.stroke();
    return;
  }
  // No letters: a child reads them as words ("SOL"); the text under the icon already says what it is.
}

// The scene to describe (contenido/escena-para-describir.yaml): a child looks out of a window at night, and
// two plates are served on the table. A box with a name cannot be described, so the placeholder shows it.
function escena(ctx: Ctx, w: number, h: number) {
  ctx.fillStyle = "#eadfca";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#b98d63";
  ctx.fillRect(0, h - 50, w, 50);
  ctx.fillStyle = "#1d2340";
  ctx.fillRect(190, 30, 110, 110);
  ctx.fillStyle = "#f2e9a0";
  for (const [x, y] of [[205, 48], [262, 62], [236, 40], [284, 96], [214, 88]]) ctx.fillRect(x, y, 3, 3);
  ctx.strokeStyle = "#7a5c4f";
  ctx.lineWidth = 6;
  ctx.strokeRect(190, 30, 110, 110);
  ctx.beginPath();
  ctx.moveTo(245, 30);
  ctx.lineTo(245, 140);
  ctx.moveTo(190, 85);
  ctx.lineTo(300, 85);
  ctx.stroke();
  ctx.fillStyle = "#3c4fa8";
  ctx.fillRect(228, 166, 10, 26);
  ctx.fillRect(242, 166, 10, 26);
  ctx.fillStyle = "#6cbf6a";
  ctx.fillRect(224, 118, 32, 50);
  ctx.fillStyle = "#4a3426";
  ctx.beginPath();
  ctx.arc(240, 106, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a5a3a";
  ctx.fillRect(24, 148, 140, 10);
  ctx.fillRect(34, 158, 8, 34);
  ctx.fillRect(146, 158, 8, 34);
  for (const x of [62, 126]) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x, 144, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#9a9a9a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#f28c38";
    ctx.beginPath();
    ctx.ellipse(x, 142, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function dibujar(p: Pieza, m: Manifiesto) {
  const [w, h] = p.medida;
  const lienzo = createCanvas(w, h);
  const ctx = lienzo.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const n = nombre(p).replace(/_/g, " ");
  if (p.tipo === "hoja") hoja(ctx, p, m);
  else if (p.tipo === "retrato") retrato(ctx, p, m);
  else if (p.tipo === "fondo") fondo(ctx, p);
  else if (p.tipo === "marco") marco(ctx, p);
  else if (p.tipo === "boton" || p.tipo === "icono") icono(ctx, p);
  else if (p.id.endsWith("/escena_d01")) escena(ctx, w, h);
  else if (p.tipo === "tarjeta") {
    ctx.fillStyle = p.id.endsWith("elegida") ? "rgba(255,230,120,0.45)" : "#f4ecdc";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = p.id.endsWith("elegida") ? "#f2c14e" : "#7a5c4f";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
  } else caja(ctx, w, h, tono(n), n);
  return marcarProvisional(lienzo.encodeSync("png"));
}

const rehacer = process.argv.includes("--rehacer");
const m = leerManifiesto();
let creados = 0;
for (const p of m.piezas) {
  const ruta = join(ASSETS, p.archivo);
  if (existsSync(ruta) && !(rehacer && esProvisional(p.archivo))) continue;
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, dibujar(p, m));
  creados++;
}
console.log(`${m.piezas.length} piezas en el manifiesto; ${creados} provisionales nuevos`);
