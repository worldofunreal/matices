// The walking world (GDD §8, §12): the child's character walks over the map and around its walls,
// the camera follows, and everything is drawn on a canvas at a whole-number zoom so the pixel art
// stays sharp. The rules (doors, hours, stories) live in pantallas/Mundo.tsx.
import type { Hora } from "../datos/guardado";
import { piezaYa, CUADRO } from "../lienzo/arte";
import { capas, coloresDe, DIRECCIONES, type Apariencia, type Direccion } from "../personaje/apariencia";
import { TILE, celdaDe, libre, libreCerca, rutaA, visible, type Mapa, type Punto } from "./mapa";

const VELOCIDAD = 90; // game pixels per second
const PASO_MS = 140; // time per walking frame
const LADO_CORTO = 360; // the short side of the screen shows about this many game pixels
const PIE = { media: 10, alto: 12 }; // the feet box is 20 × 12 px, its bottom edge at the feet
const LUZ: Record<Hora, string | null> = { manana: null, tarde: "#ffe6c4", noche: "#6f7fb8" }; // multiplied over the map
const FLECHAS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] };

export interface Figura {
  x: number;
  y: number;
  id: string;
  piel: number;
}

export interface OpcionesMotor {
  canvas: HTMLCanvasElement;
  mapa: Mapa;
  x: number;
  y: number;
  dir: Direccion;
  apariencia: Apariencia;
  figuras: Figura[];
  hora: Hora;
  alCuadro: () => void; // after every frame, for the rules
}

export class Motor {
  x: number;
  y: number;
  dir: Direccion;
  moviendo = false;
  pausado = false;
  guia: { x: number; y: number } | null = null;
  private o: OpcionesMotor;
  private ctx: CanvasRenderingContext2D;
  private ruta: { x: number; y: number }[] = [];
  private alLlegar: (() => void) | null = null;
  private teclas = new Set<string>();
  private z = 1; // device pixels per game pixel: a whole number, so every game pixel is sharp
  private cam = { x: 0, y: 0 };
  private tPaso = 0;
  private tiempo = 0;
  private ultimo = 0;
  private raf = 0;

  constructor(o: OpcionesMotor) {
    this.o = o;
    this.x = o.x;
    this.y = o.y;
    this.dir = o.dir;
    this.ctx = o.canvas.getContext("2d")!;
  }

  iniciar() {
    this.medir();
    addEventListener("resize", this.medir);
    addEventListener("keydown", this.teclaBajar);
    addEventListener("keyup", this.teclaSubir);
    addEventListener("blur", this.soltarTeclas);
    this.ultimo = performance.now();
    const cuadro = (t: number) => {
      const dt = Math.min(0.05, (t - this.ultimo) / 1000);
      this.ultimo = t;
      this.tiempo = t;
      this.actualizar(dt);
      this.dibujar();
      this.o.alCuadro();
      this.raf = requestAnimationFrame(cuadro);
    };
    this.raf = requestAnimationFrame(cuadro);
  }

  detener() {
    cancelAnimationFrame(this.raf);
    removeEventListener("resize", this.medir);
    removeEventListener("keydown", this.teclaBajar);
    removeEventListener("keyup", this.teclaSubir);
    removeEventListener("blur", this.soltarTeclas);
  }

  // The canvas fills the window; the zoom keeps the short side at about LADO_CORTO game pixels.
  private medir = () => {
    const c = this.o.canvas;
    const dpr = devicePixelRatio || 1;
    c.width = Math.round(innerWidth * dpr);
    c.height = Math.round(innerHeight * dpr);
    this.z = Math.max(1, Math.floor(Math.min(c.width, c.height) / LADO_CORTO));
    this.ctx.imageSmoothingEnabled = false;
  };

  private teclaBajar = (e: KeyboardEvent) => {
    if (!FLECHAS[e.code]) return;
    e.preventDefault();
    this.teclas.add(e.code);
  };

  private teclaSubir = (e: KeyboardEvent) => {
    this.teclas.delete(e.code);
  };

  private soltarTeclas = () => this.teclas.clear();

  // The thing under a tap, if it is an object or a person. The one in front (lower on screen) wins.
  puntoEn(cx: number, cy: number): Punto | null {
    const { x, y } = this.aMundo(cx, cy);
    let mejor: Punto | null = null;
    for (const p of this.o.mapa.puntos) {
      if (!visible(p, this.o.hora)) continue;
      const img = p.tipo === "npc" ? null : piezaYa(p.arte);
      const w = p.tipo === "npc" ? CUADRO.ancho : (img?.width ?? 0);
      const h = p.tipo === "npc" ? CUADRO.alto : (img?.height ?? 0);
      if (x >= p.x - w / 2 && x <= p.x + w / 2 && y >= p.y - h && y <= p.y && (!mejor || p.y > mejor.y)) mejor = p;
    }
    return mejor;
  }

  // A tap on the floor: walk there.
  tocarSuelo(cx: number, cy: number) {
    const { x, y } = this.aMundo(cx, cy);
    this.caminarA(x, y);
  }

  // Walks to a point, then does what the child asked for (the tile below an object, or beside a person).
  irA(p: { x: number; y: number }, accion: () => void) {
    this.caminarA(p.x, p.y + TILE / 2);
    if (this.ruta.length) this.alLlegar = accion;
    else accion();
  }

  pausar(pausa: boolean) {
    this.pausado = pausa;
    if (pausa) {
      this.ruta = [];
      this.alLlegar = null;
      this.teclas.clear();
    }
  }

  private caminarA(x: number, y: number) {
    this.alLlegar = null;
    this.ruta = [];
    const destino = libreCerca(this.o.mapa, Math.floor(x / TILE), Math.floor(y / TILE));
    if (!destino) return;
    const origen = celdaDe(this.x, this.y - PIE.alto / 2);
    this.ruta = rutaA(this.o.mapa, origen, destino).map((c) => ({ x: c.tx * TILE + TILE / 2, y: c.ty * TILE + TILE / 2 }));
  }

  // Screen point (CSS pixels) → game point, from the camera of the last frame.
  private aMundo(cx: number, cy: number) {
    const r = this.o.canvas.getBoundingClientRect();
    const k = this.o.canvas.width / r.width;
    return { x: this.cam.x + ((cx - r.left) * k) / this.z, y: this.cam.y + ((cy - r.top) * k) / this.z };
  }

  private velocidadDeRuta(): [number, number] {
    while (this.ruta.length && Math.hypot(this.ruta[0].x - this.x, this.ruta[0].y - this.y) < 3) this.ruta.shift();
    const p = this.ruta[0];
    if (!p) {
      const accion = this.alLlegar;
      this.alLlegar = null;
      accion?.();
      return [0, 0];
    }
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    return [((p.x - this.x) / d) * VELOCIDAD, ((p.y - this.y) / d) * VELOCIDAD];
  }

  private actualizar(dt: number) {
    let vx = 0;
    let vy = 0;
    if (!this.pausado) {
      for (const t of this.teclas) {
        vx += FLECHAS[t][0];
        vy += FLECHAS[t][1];
      }
      if (vx || vy) {
        this.ruta = [];
        this.alLlegar = null;
        const n = Math.hypot(vx, vy);
        vx = (vx / n) * VELOCIDAD;
        vy = (vy / n) * VELOCIDAD;
      } else [vx, vy] = this.velocidadDeRuta();
    }
    const x0 = this.x;
    const y0 = this.y;
    // Each axis is tried on its own, so the walker slides along a wall instead of stopping dead.
    if (vx && !this.bloquea(this.x + vx * dt, this.y)) this.x += vx * dt;
    if (vy && !this.bloquea(this.x, this.y + vy * dt)) this.y += vy * dt;
    this.moviendo = this.x !== x0 || this.y !== y0;
    if (vx || vy) this.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? "der" : "izq") : vy > 0 ? "abajo" : "arriba";
    this.tPaso = this.moviendo ? this.tPaso + dt * 1000 : 0;
  }

  // Whether the feet box at (x, y) touches a blocked tile (outside the map counts as blocked).
  private bloquea(x: number, y: number) {
    const m = this.o.mapa;
    for (let ty = Math.floor((y - PIE.alto) / TILE); ty <= Math.floor((y - 0.01) / TILE); ty++)
      for (let tx = Math.floor((x - PIE.media) / TILE); tx <= Math.floor((x + PIE.media - 0.01) / TILE); tx++) if (!libre(m, tx, ty)) return true;
    return false;
  }

  private dibujar() {
    const { canvas: c, mapa: m } = this.o;
    const ctx = this.ctx;
    const z = this.z;
    const vw = c.width / z;
    const vh = c.height / z;
    // The camera follows the walker and stops at the map's edges; a map smaller than the view is centered.
    const eje = (pos: number, mide: number, vista: number) => (mide > vista ? Math.min(Math.max(pos - vista / 2, 0), mide - vista) : (mide - vista) / 2);
    this.cam = { x: Math.round(eje(this.x, m.ancho, vw)), y: Math.round(eje(this.y - PIE.alto * 2, m.alto, vh)) };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1d1a24";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.setTransform(z, 0, 0, z, -this.cam.x * z, -this.cam.y * z);

    // The ground: only the part on screen is drawn.
    const fondo = piezaYa(`lugares/${m.lugar}/fondo`);
    if (fondo) {
      const sx = Math.max(0, this.cam.x);
      const sy = Math.max(0, this.cam.y);
      const sw = Math.min(m.ancho, this.cam.x + vw) - sx;
      const sh = Math.min(m.alto, this.cam.y + vh) - sy;
      ctx.drawImage(fondo, sx, sy, sw, sh, sx, sy, sw, sh);
    }

    if (this.guia) {
      const k = 0.5 + 0.5 * Math.sin(this.tiempo / 450);
      ctx.save();
      ctx.globalAlpha = 1 - 0.6 * k;
      ctx.beginPath();
      ctx.arc(this.guia.x, this.guia.y, 14 + 6 * k, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#f2c14e";
      ctx.stroke();
      ctx.restore();
    }

    // Everything that stands on the ground is drawn from back to front, by its feet.
    const brillo = 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(this.tiempo / 700));
    const cosas: { y: number; dibujar: () => void }[] = [];
    for (const p of m.puntos) {
      if (!visible(p, this.o.hora)) continue;
      const img = piezaYa(p.arte);
      if (!img) continue;
      if (p.tipo === "npc") cosas.push({ y: p.y, dibujar: () => this.cuadro(img, 0, 0, p.x, p.y) });
      else
        cosas.push({
          y: p.y,
          dibujar: () => {
            ctx.globalAlpha = brillo;
            ctx.drawImage(img, Math.round(p.x - img.width / 2), Math.round(p.y - img.height));
            ctx.globalAlpha = 1;
          },
        });
    }
    for (const f of this.o.figuras) {
      const hoja = piezaYa(`figuras/${f.id}`, { piel: f.piel });
      if (hoja) cosas.push({ y: f.y, dibujar: () => this.cuadro(hoja, 0, 0, f.x, f.y) });
    }
    const a = this.o.apariencia;
    const fila = DIRECCIONES.indexOf(this.dir);
    const columna = this.moviendo ? 1 + (Math.floor(this.tPaso / PASO_MS) % 4) : 0;
    const capasListas = capas(a)
      .map((id) => piezaYa(id, coloresDe(a)))
      .filter((hoja): hoja is HTMLCanvasElement => !!hoja);
    cosas.push({ y: this.y, dibujar: () => capasListas.forEach((hoja) => this.cuadro(hoja, columna, fila, this.x, this.y)) });
    cosas.sort((p, q) => p.y - q.y).forEach((cosa) => cosa.dibujar());

    const luz = LUZ[this.o.hora];
    if (luz) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = luz;
      ctx.fillRect(0, 0, m.ancho, m.alto);
      ctx.restore();
    }
  }

  // One frame of a 5 × 4 character sheet (32 × 48), standing with its feet on (x, y).
  private cuadro(hoja: HTMLCanvasElement, columna: number, fila: number, x: number, y: number) {
    this.ctx.drawImage(hoja, columna * CUADRO.ancho, fila * CUADRO.alto, CUADRO.ancho, CUADRO.alto, Math.round(x - CUADRO.ancho / 2), Math.round(y - CUADRO.alto), CUADRO.ancho, CUADRO.alto);
  }
}
