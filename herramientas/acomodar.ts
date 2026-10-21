// Turns generator images into a manifest piece. Each pose is one figure on a flat magenta (#FF00FF)
// background (docs/arte/direccion-de-arte.md, "Cómo pedirlo a un generador").
// Run: node herramientas/acomodar.ts <pieza> <carpeta> [<carpeta del cuerpo>]
//   hoja of the protagonist: abajo_quieta, abajo_paso, izq_quieta, izq_paso1, izq_paso2, arriba_quieta,
//   arriba_paso (.png/.jpg). abajo and arriba take their second step as the first one mirrored.
//   single figure (48 × 64): quieta.
//   A layer (hair, clothes, extras) is each body pose edited by the generator (herramientas/generar.ts):
//   with the body's folder, the layer keeps only the pixels that changed, framed like the body.
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { ASSETS, leerManifiesto, type Pieza } from "./arte.ts";

const ANCHO = 48, ALTO = 64, CABEZA_Y = 2, FIGURA = 60; // figure height inside the frame

type Img = { w: number; h: number; rgb: Float32Array; fg: Uint8Array };

async function leer(ruta: string): Promise<Img> {
  const im = await loadImage(ruta);
  const c = createCanvas(im.width, im.height);
  const ctx = c.getContext("2d");
  ctx.drawImage(im, 0, 0);
  const d = ctx.getImageData(0, 0, im.width, im.height).data;
  const n = im.width * im.height;
  const rgb = new Float32Array(n * 3), fg = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const r = d[i * 4] / 255, g = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255;
    fg[i] = Math.hypot(r - 1, g, b - 1) > 0.45 && d[i * 4 + 3] > 128 ? 1 : 0; // magenta is background
    const m = Math.max(0, Math.min(r, b) - g); // edges blended with the background lose their magenta
    rgb.set([r - m, g, b - m], i * 3);
  }
  return { w: im.width, h: im.height, rgb, fg };
}

function espejo(a: Img): Img {
  const rgb = new Float32Array(a.rgb.length), fg = new Uint8Array(a.fg.length);
  for (let y = 0; y < a.h; y++)
    for (let x = 0; x < a.w; x++) {
      const i = y * a.w + x, j = y * a.w + (a.w - 1 - x);
      fg[i] = a.fg[j];
      rgb.set(a.rgb.subarray(j * 3, j * 3 + 3), i * 3);
    }
  return { ...a, rgb, fg };
}

// Shrunk copy (area average, background included) for fast comparisons.
function chica(a: Img, lado: number) {
  const out = new Float32Array(lado * lado * 3), f = a.w / lado;
  for (let y = 0; y < lado; y++)
    for (let x = 0; x < lado; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let sy = Math.floor(y * f); sy < (y + 1) * f; sy++)
        for (let sx = Math.floor(x * f); sx < (x + 1) * f; sx++) {
          const i = (sy * a.w + sx) * 3;
          r += a.rgb[i]; g += a.rgb[i + 1]; b += a.rgb[i + 2]; n++;
        }
      out.set([r / n, g / n, b / n], (y * lado + x) * 3);
    }
  return out;
}

// Some generators move the figure a little or resize it a few percent. Finds the shift and size that
// best line the edit up with the body (compared on the body's own pixels) and redraws the edit that
// way, so the layer keeps only what was added and not the body's outline drawn a pixel off.
function alinear(cuerpo: Img, editada: Img): Img {
  if (editada.w !== cuerpo.w || editada.h !== cuerpo.h) editada = redimensionar(editada, cuerpo.w, cuerpo.h);
  const prueba = (lado: number, escalas: number[], corrimientos: number[], base: { s: number; dx: number; dy: number }) => {
    const A = chica(cuerpo, lado), B = chica(editada, lado);
    const f = cuerpo.w / lado, c = lado / 2;
    const mascara: number[] = [];
    for (let i = 0; i < lado * lado; i++) if (Math.hypot(A[i * 3] - 1, A[i * 3 + 1], A[i * 3 + 2] - 1) > 0.45) mascara.push(i);
    let mejor = { ...base, d: Infinity };
    for (const ds of escalas)
      for (const ex of corrimientos)
        for (const ey of corrimientos) {
          const s = base.s + ds, dx = base.dx + ex * f, dy = base.dy + ey * f;
          let d = 0;
          for (const i of mascara) {
            const x = i % lado, y = (i - x) / lado;
            const bx = Math.round((x - c - dx / f) / s + c), by = Math.round((y - c - dy / f) / s + c);
            if (bx < 0 || by < 0 || bx >= lado || by >= lado) { d += 3; continue; }
            const j = (by * lado + bx) * 3;
            d += Math.abs(A[i * 3] - B[j]) + Math.abs(A[i * 3 + 1] - B[j + 1]) + Math.abs(A[i * 3 + 2] - B[j + 2]);
          }
          if (d < mejor.d) mejor = { s, dx, dy, d };
        }
    return mejor;
  };
  const rango = (a: number, b: number, p: number) => Array.from({ length: Math.round((b - a) / p) + 1 }, (_, i) => a + i * p);
  let t = prueba(200, rango(-0.06, 0.06, 0.01), rango(-12, 12, 1), { s: 1, dx: 0, dy: 0 });
  t = prueba(400, rango(-0.005, 0.005, 0.0025), rango(-2, 2, 1), t);
  if (t.s === 1 && t.dx === 0 && t.dy === 0) return editada;
  const rgb = new Float32Array(editada.rgb.length), fg = new Uint8Array(editada.fg.length), c = editada.w / 2;
  for (let y = 0; y < editada.h; y++)
    for (let x = 0; x < editada.w; x++) {
      const bx = Math.round((x - c - t.dx) / t.s + c), by = Math.round((y - c - t.dy) / t.s + c);
      if (bx < 0 || by < 0 || bx >= editada.w || by >= editada.h) continue;
      const i = y * editada.w + x, j = by * editada.w + bx;
      fg[i] = editada.fg[j];
      rgb.set(editada.rgb.subarray(j * 3, j * 3 + 3), i * 3);
    }
  return { ...editada, rgb, fg };
}

// A smaller copy saved by mistake is scaled up to the body's size (nearest pixel).
function redimensionar(a: Img, w: number, h: number): Img {
  const rgb = new Float32Array(w * h * 3), fg = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const j = Math.floor((y * a.h) / h) * a.w + Math.floor((x * a.w) / w), i = y * w + x;
      fg[i] = a.fg[j];
      rgb.set(a.rgb.subarray(j * 3, j * 3 + 3), i * 3);
    }
  return { w, h, rgb, fg };
}

// Top, bottom and head center of the figure.
function ancla(a: Img) {
  let arriba = -1, abajo = -1;
  for (let y = 0; y < a.h && arriba < 0; y++) for (let x = 0; x < a.w; x++) if (a.fg[y * a.w + x]) { arriba = y; break; }
  for (let y = a.h - 1; y >= 0 && abajo < 0; y--) for (let x = 0; x < a.w; x++) if (a.fg[y * a.w + x]) { abajo = y; break; }
  let x0 = a.w, x1 = 0;
  for (let y = arriba; y < arriba + (abajo - arriba) * 0.15; y++)
    for (let x = 0; x < a.w; x++) if (a.fg[y * a.w + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  return { arriba, abajo, centro: (x0 + x1) / 2 };
}

// One frame: the figure shrunk by `k`, head top at CABEZA_Y and head center at the middle of the
// frame. Edits of the base keep its scale, so one `k` serves every pose. Each pixel averages the
// middle of its patch only, so it rarely straddles two of the generator's blocks (blends at edges
// are gray specks).
function cuadro(a: Img, k: number, { arriba, centro } = ancla(a)): Uint8ClampedArray {
  const out = new Uint8ClampedArray(ANCHO * ALTO * 4);
  const lado = 1 / k;
  for (let y = 0; y < ALTO; y++)
    for (let x = 0; x < ANCHO; x++) {
      const sx0 = centro + (x - ANCHO / 2 + MEDIO) * lado, sy0 = arriba + (y - CABEZA_Y + MEDIO) * lado;
      let n = 0, t = 0, r = 0, g = 0, b = 0;
      for (let sy = Math.floor(sy0); sy < sy0 + lado * (1 - 2 * MEDIO); sy++)
        for (let sx = Math.floor(sx0); sx < sx0 + lado * (1 - 2 * MEDIO); sx++) {
          t++;
          if (sx < 0 || sy < 0 || sx >= a.w || sy >= a.h) continue;
          const i = sy * a.w + sx;
          if (!a.fg[i]) continue;
          n++;
          r += a.rgb[i * 3]; g += a.rgb[i * 3 + 1]; b += a.rgb[i * 3 + 2];
        }
      if (n * 2 < t) continue;
      out.set([(r / n) * 255, (g / n) * 255, (b / n) * 255, 255], (y * ANCHO + x) * 4);
    }
  return out;
}

const CONTORNO = [40, 26, 20];
const MEDIO = 0.25; // margin of each patch left out of its average
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const luz = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

function esPiel(px: Uint8ClampedArray, i: number) {
  if (!px[i + 3]) return false;
  const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
  const d = mx - mn || 1;
  const h = (mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  // Near-white (eye whites, shine) is not skin.
  return h >= 8 && h <= 42 && sat > 0.14 && sat < 0.62 && mx > 110 && !(sat < 0.2 && mx > 235);
}

// Skin pixels become key shades so the game can swap the tone. Each pose may come out a little
// lighter or darker, so brightness is measured from the pose's most common skin tone, which becomes
// the second key shade.
function pielAClave(px: Uint8ClampedArray, clave: string[]) {
  const tonos = clave.map(hex) as [number, number, number][];
  const piel: number[] = [];
  for (let i = 0; i < px.length; i += 4) if (esPiel(px, i)) piel.push(i);
  if (!piel.length) return;
  const cuenta = new Map<number, number>();
  for (const i of piel) {
    const l = Math.round(luz(px[i], px[i + 1], px[i + 2]) / 4);
    cuenta.set(l, (cuenta.get(l) ?? 0) + 1);
  }
  const comun = [...cuenta].reduce((a, b) => (b[1] > a[1] ? b : a))[0] * 4;
  const ajuste = luz(...tonos[1]) - comun;
  for (const i of piel) {
    const l = luz(px[i], px[i + 1], px[i + 2]) + ajuste;
    px.set(tonos.reduce((m, c) => (Math.abs(luz(...c) - l) < Math.abs(luz(...m) - l) ? c : m)), i);
  }
}

const esVerde = (px: Uint8ClampedArray, i: number) =>
  px[i + 3] > 0 && px[i + 1] >= 15 && px[i + 1] > px[i] * 1.15 && px[i + 1] > px[i + 2] * 1.15;

// A green layer (hair, backpack) is only its green and the dark outline around it: whatever else the
// edit touched (the face, the shirt under the hair) belongs to the body.
function soloVerde(px: Uint8ClampedArray, propio = (i: number) => esVerde(px, i)) {
  const esVerde_ = propio;
  const fuera: number[] = [];
  for (let y = 0; y < ALTO; y++)
    for (let x = 0; x < ANCHO; x++) {
      const i = (y * ANCHO + x) * 4;
      if (!px[i + 3] || esVerde_(i)) continue;
      let junto = false;
      if (luz(px[i], px[i + 1], px[i + 2]) < 70)
        for (let dy = -1; dy <= 1 && !junto; dy++)
          for (let dx = -1; dx <= 1 && !junto; dx++) {
            const X = x + dx, Y = y + dy;
            junto = X >= 0 && Y >= 0 && X < ANCHO && Y < ALTO && esVerde_((Y * ANCHO + X) * 4);
          }
      if (!junto) fuera.push(i);
    }
  for (const i of fuera) px[i + 3] = 0;
}

// Layers drawn in their own color keep only that color: a hand-drawn edit redraws the body's outline a
// pixel off, and that must not end up in the layer. A glasses frame or a stud is thinner than a game pixel, so the
// average of a patch would blur it into the skin: a game pixel takes the item's color when a quarter
// of its patch is the item.
const PROPIO: Record<string, (r: number, g: number, b: number) => boolean> = {
  extra_gorra: (r, g, b) => r > 0.45 && r > g * 2.2 && r > b * 2.2,
  extra_aretes: (r, g, b) => r > 0.55 && g > 0.4 && b < g * 0.6,
  extra_lentes: (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) < 0.12 && luz(r, g, b) > 0.22 && luz(r, g, b) < 0.6,
  ropa_casa_arriba: (r, g, b) => g > r * 1.5 && b > r * 1.5 && g > 0.15,
  ropa_casa_abajo: (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) < 0.1 && luz(r, g, b) > 0.16 && luz(r, g, b) < 0.5,
};
const CABEZA = /^personaje\/extra_(gorra|aretes|lentes)$/;

function cuadroPropio(a: Img, k: number, { arriba, centro }: { arriba: number; centro: number }, propio: (r: number, g: number, b: number) => boolean) {
  const out = new Uint8ClampedArray(ANCHO * ALTO * 4);
  const lado = 1 / k;
  for (let y = 0; y < ALTO; y++)
    for (let x = 0; x < ANCHO; x++) {
      const sx0 = centro + (x - ANCHO / 2) * lado, sy0 = arriba + (y - CABEZA_Y) * lado;
      let n = 0, t = 0, r = 0, g = 0, b = 0;
      for (let sy = Math.floor(sy0); sy < sy0 + lado; sy++)
        for (let sx = Math.floor(sx0); sx < sx0 + lado; sx++) {
          t++;
          if (sx < 0 || sy < 0 || sx >= a.w || sy >= a.h) continue;
          const i = sy * a.w + sx;
          if (!a.fg[i] || !propio(a.rgb[i * 3], a.rgb[i * 3 + 1], a.rgb[i * 3 + 2])) continue;
          n++;
          r += a.rgb[i * 3]; g += a.rgb[i * 3 + 1]; b += a.rgb[i * 3 + 2];
        }
      if (n * 4 < t) continue;
      out.set([(r / n) * 255, (g / n) * 255, (b / n) * 255, 255], (y * ANCHO + x) * 4);
    }
  return out;
}

// Each pose was drawn on its own, so a step can come out a shade lighter or darker than the standing
// pose and the clothes would flicker while walking. The step's colors are moved by that difference and
// then snapped to the standing pose's own colors.
function igualarA(px: Uint8ClampedArray, ref: Uint8ClampedArray, propio: (r: number, g: number, b: number) => boolean) {
  const suyos = (d: Uint8ClampedArray) => {
    const l: number[] = [];
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] && propio(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255)) l.push(i);
    return l;
  };
  const media = (d: Uint8ClampedArray, l: number[]) => [0, 1, 2].map((c) => l.reduce((t, i) => t + d[i + c], 0) / l.length);
  const [lp, lr] = [suyos(px), suyos(ref)];
  if (!lp.length || !lr.length) return;
  const [mp, mr] = [media(px, lp), media(ref, lr)];
  const tonos = [...new Set(lr.map((i) => (ref[i] << 16) | (ref[i + 1] << 8) | ref[i + 2]))].map((v) => [v >> 16, (v >> 8) & 255, v & 255]);
  for (const i of lp) {
    const c = [0, 1, 2].map((k) => px[i + k] - mp[k] + mr[k]);
    px.set(tonos.reduce((m, t) => (Math.hypot(t[0] - c[0], t[1] - c[1], t[2] - c[2]) < Math.hypot(m[0] - c[0], m[1] - c[1], m[2] - c[2]) ? t : m)), i);
  }
}

// Green pixels (hair, backpack) become the key shades: the most common green is the light key and
// darker greens the shadow keys. Near-black green is the outline and becomes the body's outline.
function verdeAClave(px: Uint8ClampedArray, clave: string[]) {
  const tonos = clave.map(hex);
  const verdes: number[] = [];
  for (let i = 0; i < px.length; i += 4) {
    if (esVerde(px, i)) verdes.push(i);
  }
  if (!verdes.length) return;
  const cuenta = new Map<number, number>();
  for (const i of verdes) cuenta.set(Math.round(px[i + 1] / 8), (cuenta.get(Math.round(px[i + 1] / 8)) ?? 0) + 1);
  const comun = [...cuenta].reduce((a, b) => (b[1] > a[1] ? b : a))[0] * 8;
  for (const i of verdes) {
    if (px[i + 1] < 70) { px.set(CONTORNO, i); continue; }
    const r = px[i + 1] / comun;
    px.set(tonos[r >= 0.85 ? 0 : r >= 0.62 ? 1 : 2], i);
  }
}

// A light pixel that matches the body one pixel away is the body itself, shifted or blended at an
// edge (the base shirt peeking under the hair), not part of the layer.
function delCuerpo(cuerpo: Uint8ClampedArray, editada: Uint8ClampedArray, i: number) {
  if (luz(editada[i], editada[i + 1], editada[i + 2]) < 80) return false;
  const p = i / 4, x = p % ANCHO, y = (p - x) / ANCHO;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy, j = (Y * ANCHO + X) * 4;
      if (X < 0 || Y < 0 || X >= ANCHO || Y >= ALTO || !cuerpo[j + 3]) continue;
      if (Math.abs(editada[i] - cuerpo[j]) + Math.abs(editada[i + 1] - cuerpo[j + 1]) + Math.abs(editada[i + 2] - cuerpo[j + 2]) < 30) return true;
    }
  return false;
}

// The layer: pixels of the edited pose that differ from the body, without the small specks left by
// the edit's small shifts (pieces under `minimo` pixels; earrings are that small, so they pass 1).
function capa(cuerpo: Uint8ClampedArray, editada: Uint8ClampedArray, piernas: boolean, minimo = 6): Uint8ClampedArray {
  const out = new Uint8ClampedArray(editada.length);
  for (let i = 0; i < editada.length; i += 4) {
    if (!editada[i + 3]) continue;
    const d = cuerpo[i + 3] ? Math.abs(editada[i] - cuerpo[i]) + Math.abs(editada[i + 1] - cuerpo[i + 1]) + Math.abs(editada[i + 2] - cuerpo[i + 2]) : 999;
    if (d > 40 && !delCuerpo(cuerpo, editada, i)) out.set(editada.subarray(i, i + 4), i);
  }
  const visto = new Uint8Array(ANCHO * ALTO);
  for (let p = 0; p < visto.length; p++) {
    if (visto[p] || !out[p * 4 + 3]) continue;
    const pieza = [p], cola = [p];
    visto[p] = 1;
    while (cola.length) {
      const q = cola.pop()!, x = q % ANCHO, y = (q - x) / ANCHO;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const X = x + dx, Y = y + dy, r = Y * ANCHO + X;
          if (X < 0 || Y < 0 || X >= ANCHO || Y >= ALTO || visto[r] || !out[r * 4 + 3]) continue;
          visto[r] = 1;
          pieza.push(r);
          cola.push(r);
        }
    }
    if (pieza.length < minimo) for (const q of pieza) out[q * 4 + 3] = 0;
  }
  // The base's light-gray shirt and shorts must not peek out under the layer: where the edit still
  // shows them between layer pixels, or at the side of a layer that came out narrower (trousers
  // thinner than the shorts, only for `piernas`, what is worn on the legs), they take the color of the
  // layer pixel next to them. Only sideways, so nothing grows down over the shorts.
  const gris = (px: Uint8ClampedArray, i: number) => {
    const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
    const l = luz(r, g, b);
    return px[i + 3] > 0 && Math.max(r, g, b) - Math.min(r, g, b) <= 28 && l >= 140 && l <= 240;
  };
  const lleno = out.slice();
  for (let y = 0; y < ALTO; y++)
    for (let x = 0; x < ANCHO; x++) {
      const i = (y * ANCHO + x) * 4;
      if (out[i + 3]) continue;
      const quitada = piernas && gris(cuerpo, i);
      if (!quitada && !gris(editada, i)) continue;
      if (quitada) {
        let j = -1;
        for (let k = 1; k <= 2 && j < 0; k++)
          for (const [dx, dy] of [[-1, 0], [1, 0]]) {
            const X = x + dx * k, Y = y + dy * k, q = (Y * ANCHO + X) * 4;
            if (X >= 0 && Y >= 0 && X < ANCHO && Y < ALTO && out[q + 3]) { j = q; break; }
          }
        if (j >= 0) { lleno.set(out.subarray(j, j + 4), i); continue; }
      }
      if (!gris(editada, i)) continue;
      const vecino = (dx: number, dy: number) => {
        for (let k = 1; k <= 3; k++) {
          const X = x + dx * k, Y = y + dy * k;
          if (X < 0 || Y < 0 || X >= ANCHO || Y >= ALTO) return -1;
          const j = (Y * ANCHO + X) * 4;
          if (out[j + 3]) return j;
        }
        return -1;
      };
      const [iz, de, ar, ab] = [vecino(-1, 0), vecino(1, 0), vecino(0, -1), vecino(0, 1)];
      const j = iz >= 0 && de >= 0 ? iz : ar >= 0 && ab >= 0 ? ar : -1;
      if (j >= 0) lleno.set(out.subarray(j, j + 4), i);
    }
  return lleno;
}

// Shrinking blends neighboring colors at edges into in-between shades that read as gray specks.
// A layer keeps only its most used colors: each pixel takes the nearest of them.
function paleta(px: Uint8ClampedArray, n = 8) {
  const cuenta = new Map<number, number>();
  for (let i = 0; i < px.length; i += 4) if (px[i + 3]) {
    const q = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
    cuenta.set(q, (cuenta.get(q) ?? 0) + 1);
  }
  const rgb = (q: number) => [q >> 16, (q >> 8) & 255, q & 255];
  const dist = (a: number[], b: number[]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  const elegidos: number[][] = [];
  for (const [q] of [...cuenta].sort((a, b) => b[1] - a[1])) {
    if (elegidos.length >= n) break;
    if (elegidos.every((e) => dist(e, rgb(q)) > 36)) elegidos.push(rgb(q));
  }
  for (let i = 0; i < px.length; i += 4) if (px[i + 3]) {
    const c = [px[i], px[i + 1], px[i + 2]];
    px.set(elegidos.reduce((m, e) => (dist(e, c) < dist(m, c) ? e : m)), i);
  }
}

// The poses of a folder, laid out like the sheet: [row][column]. A layer that only has the standing
// poses (hair and what goes on the head) is rigid: its steps are its standing pose.
async function poses(carpeta: string, filas: number, columnas: number): Promise<Img[][]> {
  const archivos = readdirSync(carpeta);
  const hay = (n: string) => archivos.find((a) => a.replace(/\.(png|jpe?g|webp)$/, "") === n);
  const pose = async (n: string, si?: Img) => {
    const f = hay(n);
    if (f) return leer(join(carpeta, f));
    if (si) return si;
    throw new Error(`falta ${n} en ${carpeta}`);
  };
  if (filas === 1 && columnas === 1) return [[await pose("quieta")]];
  const hoja: Img[][] = [];
  for (const dir of ["abajo", "izq", "arriba"].slice(0, filas)) {
    const quieta = await pose(`${dir}_quieta`);
    const p1 = await pose(dir === "izq" ? "izq_paso1" : `${dir}_paso`, quieta);
    const p2 = dir === "izq" ? await pose("izq_paso2", quieta) : p1 === quieta ? quieta : espejo(p1);
    hoja.push([quieta, p1, quieta, p2, quieta].slice(0, columnas)); // still, then step, still, other step, still
  }
  return hoja;
}

// The neck: the narrowest row of the standing body between the head and the chest. Walking moves only
// arms and legs, so everything above it is the same in every frame of a direction.
function cuello(px: Uint8ClampedArray) {
  const ancho = (y: number) => { let n = 0; for (let x = 0; x < ANCHO; x++) if (px[(y * ANCHO + x) * 4 + 3]) n++; return n; };
  let mejor = 18;
  for (let y = 18; y < 34; y++) if (ancho(y) < ancho(mejor)) mejor = y;
  return mejor;
}

async function main() {
  const [id, carpeta, carpetaCuerpo] = process.argv.slice(2);
  const m = leerManifiesto();
  const pieza = m.piezas.find((p) => p.id === id) as Pieza | undefined;
  if (!pieza || !carpeta) throw new Error("uso: node herramientas/acomodar.ts <pieza> <carpeta> [<carpeta del cuerpo>]");
  const [w, h] = pieza.medida;
  const filas = h / ALTO, columnas = w / ANCHO;
  const hoja = await poses(carpeta, filas, columnas);
  // The shoulders do not move while walking, so a backpack drawn again for each step would only change
  // its size from frame to frame: every step uses the standing one.
  const mochila = pieza.id === "personaje/extra_mochila";
  if (mochila && carpetaCuerpo) for (const f of hoja.keys()) hoja[f] = hoja[f].map(() => hoja[f][0]);
  const cuerpo = carpetaCuerpo ? await poses(carpetaCuerpo, filas, columnas) : hoja;
  const ref = ancla(cuerpo[0][0]);
  const k = FIGURA / (ref.abajo - ref.arriba);
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  hoja.forEach((fila, f) => {
    const cuadros = fila.map((img, col) => {
      const an = ancla(cuerpo[f][col]);
      const base = cuadro(cuerpo[f][col], k, an);
      pielAClave(base, m.colores.piel.clave);
      if (!carpetaCuerpo) return base;
      // A rigid layer's step is its standing frame exactly: it moves with the head, which does not move.
      if (col > 0 && img === fila[0]) return null;
      const editada = alinear(cuerpo[f][col], img);
      const px = capa(cuadro(cuerpo[f][col], k, an), cuadro(editada, k, an), /_(pantalon|falda|abajo)$/.test(pieza.id), pieza.id.endsWith("aretes") ? 1 : 6);
      if (/^personaje\/(cabello_|extra_mochila)/.test(pieza.id)) soloVerde(px); // drawn green (generar.ts)
      // Skin always comes from the body below: a layer never carries any (ankles, hands, face).
      for (let i = 0; i < px.length; i += 4) if (esPiel(px, i)) px[i + 3] = 0;
      const propio = PROPIO[pieza.id.split("/")[1]!];
      if (propio) {
        // The item's own color, plus only the dark outline that touches it.
        const item = cuadroPropio(editada, k, an, propio);
        for (let i = 0; i < px.length; i += 4) if (item[i + 3]) px.set(item.subarray(i, i + 4), i);
        soloVerde(px, (i) => item[i + 3] > 0);
      }
      return px;
    });
    const quieta = cuadros[0]!;
    const corte = cuello(cuerpo === hoja ? quieta : cuadro(cuerpo[f][0], k));
    cuadros.forEach((px, col) => {
      const final = px ?? quieta.slice();
      if (col > 0 && !mochila) final.set(quieta.subarray(0, corte * ANCHO * 4)); // same head in every frame
      if (CABEZA.test(pieza.id)) final.fill(0, corte * ANCHO * 4); // a head extra stays on the head
      if (/_(pantalon|falda|abajo)$/.test(pieza.id)) final.fill(0, 0, corte * ANCHO * 4); // and legwear below it
      const propio = PROPIO[pieza.id.split("/")[1]!];
      if (propio && col > 0) igualarA(final, quieta, propio);
      for (const r of ["cabello", "mochila"] as const) if (pieza.colores.includes(r)) verdeAClave(final, m.colores[r].clave);
      const d = ctx.createImageData(ANCHO, ALTO);
      d.data.set(final);
      ctx.putImageData(d, col * ANCHO, f * ALTO);
    });
  });
  // Nothing may touch the side of its frame: what does not fit is cut off in the game.
  const pixeles = ctx.getImageData(0, 0, w, h).data;
  for (let f = 0; f < filas; f++)
    for (let col = 0; col < columnas; col++)
      for (let y = f * ALTO; y < (f + 1) * ALTO; y++)
        for (const x of [col * ANCHO, (col + 1) * ANCHO - 1])
          if (pixeles[(y * w + x) * 4 + 3]) throw new Error(`${id}: la fila ${f + 1}, columna ${col + 1} toca la orilla del cuadro y se cortaría`);
  if (carpetaCuerpo) {
    const todo = ctx.getImageData(0, 0, w, h);
    paleta(todo.data);
    ctx.putImageData(todo, 0, 0);
  }
  writeFileSync(join(ASSETS, pieza.archivo), c.toBuffer("image/png"));
  console.log(`${pieza.archivo}: ${w} × ${h}`);
}

await main();
