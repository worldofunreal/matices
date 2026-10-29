// The walking world: the child's character walks over the map and around its walls,
// the camera follows, and everything is drawn on a canvas at a whole-number zoom so the pixel art
// stays sharp. HTML over the canvas (door signs, speech) is
// placed here every frame from its world point. The rules (doors, hours, situations) live in pantallas/Mundo.tsx.
import type { Hora } from "../datos/guardado";
import { piezaYa, CUADRO } from "../lienzo/arte";
import { capas, coloresDe, filaDe, type Apariencia, type Direccion } from "../personaje/apariencia";
import { TILE, celdaDe, libre, libreCerca, rutaA, visible, type Mapa, type Punto } from "./mapa";

const VELOCIDAD = 90; // game pixels per second
const CORRER = 165; // running
const PASO_MS = 140; // time per walking frame
const LADO_CORTO = 360; // the short side of the screen shows about this many game pixels
const ZOOM_MAX = 4; // the closest the child can zoom, in whole steps
const ARRASTRE = 8; // screen pixels a finger moves before a tap becomes a drag
const PIE = { media: 10, alto: 12 }; // the feet box is 20 × 12 px, its bottom edge at the feet
const LUZ: Record<Hora, string | null> = { manana: null, tarde: "#ffe6c4", noche: "#6f7fb8" }; // multiplied over the map
const FLECHAS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] };
const PERRO_CORRE = 150;
const PERRO_PASO_MS = 140;
const PERRO_CERCA = 56;

interface Perro {
  f: Figura;
  modo: "quieto" | "sigue" | "corre" | "espera";
  cola: { x: number; y: number }[];
  ruta: { x: number; y: number }[];
  hasta: number;
  izq: boolean;
  anda: boolean;
  suelto: boolean;
}

// The zoom the child picked stays while they walk from place to place.
let zoomElegido: number | null = null;

export interface Figura {
  x: number;
  y: number;
  id: string;
  piel: number;
}

export type AccionPersonaje = "brincar" | "golpear" | "patear";

export interface ResultadoAccion {
  accion: AccionPersonaje;
  objetivo: string | null;
  tipo_objetivo: "npc" | "fauna" | "objeto" | "muro" | "nada";
  distancia: number | null;
  x: number;
  y: number;
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
  alTocar: (cx: number, cy: number) => void; // a tap on the screen, not the end of a drag
}

export class Motor {
  x: number;
  y: number;
  dir: Direccion;
  moviendo = false;
  pausado = false;
  corriendo = false; // the run button; Shift also runs while held
  corriendoSostenido = false; // continuous run while holding tap/click
  correrAlDestino = false; // double-tap run to destination
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
  private libre = false; // true while the child has moved the view; false while the camera follows the walker
  private mirada = { x: 0, y: 0 }; // the top-left of the view while it is not following
  private arrastre: { id: number; x: number; y: number; cam: { x: number; y: number }; movio: boolean } | null = null;
  private temporizadorHold = 0;
  private destinoSostenido: { x: number; y: number } | null = null;
  private ultimoTap = 0;
  private ultimoTapX = 0;
  private ultimoTapY = 0;
  private ondas: { x: number; y: number; t0: number }[] = [];
  private rutaGuia: { tx: number; ty: number }[] = [];
  private celdaGuiaCalculada = { tx: -1, ty: -1, metaX: -1, metaY: -1 };
  private particulasPolvo: { x: number; y: number; t0: number; r: number }[] = [];
  private destellosGuia: { x: number; y: number; t0: number; dy: number }[] = [];
  private tUltimoPolvo = 0;
  private tUltimoDestello = 0;
  private acumulado = 0; // wheel movement not yet turned into a zoom step
  private shift = false;
  private perro: Perro | null = null;
  private accionActiva: { tipo: AccionPersonaje; t0: number; duracion: number } | null = null;
  private sacudidas = new Map<string, { t0: number; duracion: number; dx: number; dy: number }>();
  private efectosImpacto: { x: number; y: number; t0: number; texto: string; duracion: number }[] = [];

  constructor(o: OpcionesMotor) {
    this.o = o;
    this.x = o.x;
    this.y = o.y;
    this.dir = o.dir;
    this.ctx = o.canvas.getContext("2d")!;
    if (this.bloquea(this.x, this.y)) {
      const c = libreCerca(o.mapa, Math.floor(this.x / TILE), Math.floor((this.y - PIE.alto / 2) / TILE));
      if (c) {
        this.x = c.tx * TILE + TILE / 2;
        this.y = c.ty * TILE + TILE;
      }
    }
    const f = o.figuras.find((x) => x.id === "perro");
    if (f) this.perro = { f, modo: "quieto", cola: [], ruta: [], hasta: 0, izq: false, anda: false, suelto: false };
  }

  // Running right now: moving with the run button on, Shift held, tap-and-hold or double-tap.
  get rapido() {
    return this.moviendo && (this.corriendo || this.shift || this.corriendoSostenido || this.correrAlDestino);
  }

  // Executes a physical character action (jump, punch, kick), detects front target, and records analytical outcome
  ejecutarAccion(tipo: AccionPersonaje): ResultadoAccion {
    const duraciones: Record<AccionPersonaje, number> = {
      brincar: 360,
      golpear: 240,
      patear: 280,
    };
    const duracion = duraciones[tipo];
    this.accionActiva = { tipo, t0: this.tiempo, duracion };

    const dirOffsets: Record<Direccion, [number, number]> = {
      abajo: [0, 1],
      arriba: [0, -1],
      izq: [-1, 0],
      der: [1, 0],
    };
    const [dx, dy] = dirOffsets[this.dir];
    const alcance = tipo === "patear" ? 48 : tipo === "golpear" ? 38 : 34;
    const centroX = this.x + (tipo === "brincar" ? 0 : dx * (alcance / 2));
    const centroY = this.y + (tipo === "brincar" ? 0 : dy * (alcance / 2));

    let objetivoPunto: Punto | null = null;
    let menorDist = Infinity;

    // Search for entities in front (or nearby if jump)
    for (const p of this.o.mapa.puntos) {
      if (!visible(p, this.o.hora)) continue;
      const d = Math.hypot(p.x - centroX, p.y - centroY);
      if (d <= alcance && d < menorDist) {
        menorDist = d;
        objetivoPunto = p;
      }
    }

    // Also check figures (e.g. dog)
    if (!objetivoPunto && this.perro) {
      const d = Math.hypot(this.perro.f.x - centroX, this.perro.f.y - centroY);
      if (d <= alcance) {
        menorDist = d;
        objetivoPunto = {
          nombre: "perro",
          tipo: "fauna",
          x: this.perro.f.x,
          y: this.perro.f.y,
          arte: "figuras/perro",
        };
      }
    }

    // Check if hitting a solid wall/obstacle in front
    const celdaFrente = celdaDe(this.x + dx * TILE, this.y + dy * TILE - PIE.alto / 2);
    const esMuro = !libre(this.o.mapa, celdaFrente.tx, celdaFrente.ty);

    if (objetivoPunto) {
      this.sacudidas.set(objetivoPunto.nombre, {
        t0: this.tiempo,
        duracion: 180,
        dx: dx * 3,
        dy: dy * 3,
      });
      this.efectosImpacto.push({
        x: objetivoPunto.x,
        y: objetivoPunto.y - 18,
        t0: this.tiempo,
        texto: tipo === "golpear" ? "💥" : tipo === "patear" ? "💨" : "✨",
        duracion: 280,
      });
    } else if (esMuro && tipo !== "brincar") {
      this.efectosImpacto.push({
        x: this.x + dx * 24,
        y: this.y + dy * 24 - 16,
        t0: this.tiempo,
        texto: "💥",
        duracion: 240,
      });
    } else if (tipo === "brincar") {
      // Dust puff on jump launch
      this.particulasPolvo.push({ x: this.x - 4, y: this.y, t0: this.tiempo, r: 3 });
      this.particulasPolvo.push({ x: this.x + 4, y: this.y, t0: this.tiempo, r: 3 });
    }

    return {
      accion: tipo,
      objetivo: objetivoPunto?.nombre ?? (esMuro ? "muro" : null),
      tipo_objetivo: objetivoPunto?.tipo ?? (esMuro ? "muro" : "nada"),
      distancia: menorDist < Infinity ? Math.round(menorDist) : null,
      x: Math.round(this.x),
      y: Math.round(this.y),
    };
  }

  brincar(): ResultadoAccion {
    return this.ejecutarAccion("brincar");
  }

  golpear(): ResultadoAccion {
    return this.ejecutarAccion("golpear");
  }

  patear(): ResultadoAccion {
    return this.ejecutarAccion("patear");
  }

  iniciar() {
    this.medir();
    addEventListener("resize", this.medir);
    addEventListener("keydown", this.teclaBajar);
    addEventListener("keyup", this.teclaSubir);
    addEventListener("blur", this.soltarTeclas);
    addEventListener("pointermove", this.mover);
    addEventListener("pointerup", this.soltar);
    addEventListener("pointercancel", this.cancelar);
    this.o.canvas.addEventListener("pointerdown", this.bajar);
    this.o.canvas.addEventListener("wheel", this.rueda, { passive: false });
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
    clearTimeout(this.temporizadorHold);
    cancelAnimationFrame(this.raf);
    removeEventListener("resize", this.medir);
    removeEventListener("keydown", this.teclaBajar);
    removeEventListener("keyup", this.teclaSubir);
    removeEventListener("blur", this.soltarTeclas);
    removeEventListener("pointermove", this.mover);
    removeEventListener("pointerup", this.soltar);
    removeEventListener("pointercancel", this.cancelar);
    this.o.canvas.removeEventListener("pointerdown", this.bajar);
    this.o.canvas.removeEventListener("wheel", this.rueda);
  }

  // The canvas fills the window; the zoom keeps the short side at about LADO_CORTO game pixels.
  private medir = () => {
    const c = this.o.canvas;
    const dpr = devicePixelRatio || 1;
    c.width = Math.round(innerWidth * dpr);
    c.height = Math.round(innerHeight * dpr);
    this.z = zoomElegido ?? Math.max(1, Math.floor(Math.min(c.width, c.height) / LADO_CORTO));
    this.ctx.imageSmoothingEnabled = false;
  };

  private teclaBajar = (e: KeyboardEvent) => {
    if (e.key === "Shift") this.shift = true;
    if (!FLECHAS[e.code]) return;
    e.preventDefault();
    if (e.repeat && !this.teclas.has(e.code)) return; // stopped (parar) with the key held: only a new press walks
    this.teclas.add(e.code);
  };

  private teclaSubir = (e: KeyboardEvent) => {
    if (e.key === "Shift") this.shift = false;
    this.teclas.delete(e.code);
  };

  private soltarTeclas = () => {
    this.teclas.clear();
    this.shift = false;
  };

  // The zoom buttons and the wheel change the zoom one whole step at a time, so every pixel stays sharp.
  acercar() {
    this.fijarZoom(this.z + 1);
  }

  alejar() {
    this.fijarZoom(this.z - 1);
  }

  // Back to following the walker.
  centrar() {
    this.libre = false;
  }

  private fijarZoom(nuevo: number) {
    const n = Math.min(ZOOM_MAX, Math.max(1, nuevo));
    if (n === this.z) return;
    if (this.libre) {
      // The middle of the view stays where it is.
      const c = this.o.canvas;
      const medioX = this.mirada.x + c.width / this.z / 2;
      const medioY = this.mirada.y + c.height / this.z / 2;
      this.mirada = { x: medioX - c.width / n / 2, y: medioY - c.height / n / 2 };
    }
    this.z = n;
    zoomElegido = n;
  }

  // A tap walks or acts (see Mundo.tsx). Holding runs towards the pointer; a drag moves the view.
  private bajar = (e: PointerEvent) => {
    clearTimeout(this.temporizadorHold);
    this.arrastre = { id: e.pointerId, x: e.clientX, y: e.clientY, cam: { ...this.cam }, movio: false };
    this.temporizadorHold = window.setTimeout(() => {
      const a = this.arrastre;
      if (!a || a.id !== e.pointerId || a.movio || this.pausado) return;
      this.corriendoSostenido = true;
      this.libre = false;
      this.destinoSostenido = this.aMundo(e.clientX, e.clientY);
    }, 220);
  };

  private mover = (e: PointerEvent) => {
    const a = this.arrastre;
    if (!a || a.id !== e.pointerId) return;
    if (this.corriendoSostenido) {
      this.destinoSostenido = this.aMundo(e.clientX, e.clientY);
      return;
    }
    const dx = e.clientX - a.x;
    const dy = e.clientY - a.y;
    if (!a.movio) {
      if (Math.hypot(dx, dy) <= ARRASTRE) return;
      clearTimeout(this.temporizadorHold);
      a.movio = true;
      this.libre = true;
    }
    const c = this.o.canvas;
    const porPixel = c.width / c.getBoundingClientRect().width / this.z; // game pixels per screen pixel
    this.mirada = { x: a.cam.x - dx * porPixel, y: a.cam.y - dy * porPixel };
  };

  private soltar = (e: PointerEvent) => {
    const a = this.arrastre;
    clearTimeout(this.temporizadorHold);
    if (!a || a.id !== e.pointerId) return;
    this.arrastre = null;
    if (this.corriendoSostenido) {
      this.corriendoSostenido = false;
      this.destinoSostenido = null;
      this.parar();
      return;
    }
    if (a.movio) return;
    const ahora = performance.now();
    const dobleTap = ahora - this.ultimoTap < 320 && Math.hypot(e.clientX - this.ultimoTapX, e.clientY - this.ultimoTapY) < 36;
    this.ultimoTap = ahora;
    this.ultimoTapX = e.clientX;
    this.ultimoTapY = e.clientY;
    this.correrAlDestino = dobleTap;
    const { x, y } = this.aMundo(e.clientX, e.clientY);
    this.ondas.push({ x, y, t0: this.tiempo });
    this.o.alTocar(e.clientX, e.clientY);
  };

  private cancelar = () => {
    clearTimeout(this.temporizadorHold);
    this.corriendoSostenido = false;
    this.destinoSostenido = null;
    this.arrastre = null;
  };

  // Mouse wheel or trackpad: a few small movements make one step.
  private rueda = (e: WheelEvent) => {
    e.preventDefault();
    this.acumulado += e.deltaY;
    if (Math.abs(this.acumulado) < 100) return;
    if (this.acumulado < 0) this.acercar();
    else this.alejar();
    this.acumulado = 0;
  };

  // The thing under a tap, if it is an object, a person or an animal. The one in front (lower on screen) wins.
  puntoEn(cx: number, cy: number): Punto | null {
    const { x, y } = this.aMundo(cx, cy);
    let mejor: Punto | null = null;
    for (const p of this.o.mapa.puntos) {
      if (!visible(p, this.o.hora)) continue;
      const img = p.tipo === "npc" && p.piel !== undefined ? piezaYa(p.arte, { piel: p.piel }) : piezaYa(p.arte);
      const w = p.tipo === "npc" && p.piel === undefined ? CUADRO.ancho : (img?.width ?? 0);
      const h = p.tipo === "npc" && p.piel === undefined ? CUADRO.alto : (img?.height ?? 0);
      if (x >= p.x - w / 2 - 6 && x <= p.x + w / 2 + 6 && y >= p.y - h - 18 && y <= p.y + 6 && (!mejor || p.y > mejor.y)) mejor = p;
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

  // Stops where it is (someone speaks to the child); the next tap or key walks again.
  parar() {
    this.ruta = [];
    this.alLlegar = null;
    this.correrAlDestino = false;
    this.corriendoSostenido = false;
    this.destinoSostenido = null;
    this.teclas.clear();
  }

  pausar(pausa: boolean) {
    this.pausado = pausa;
    if (pausa) {
      clearTimeout(this.temporizadorHold);
      this.corriendoSostenido = false;
      this.destinoSostenido = null;
      this.correrAlDestino = false;
      this.ruta = [];
      this.alLlegar = null;
      this.teclas.clear();
    }
  }

  private caminarA(x: number, y: number) {
    this.libre = false; // a new walk brings the view back to the walker
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
      this.correrAlDestino = false;
      accion?.();
      return [0, 0];
    }
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    const v = this.corriendo || this.shift || this.correrAlDestino ? CORRER : VELOCIDAD;
    return [((p.x - this.x) / d) * v, ((p.y - this.y) / d) * v];
  }

  private actualizar(dt: number) {
    let vx = 0;
    let vy = 0;
    if (!this.pausado) {
      if (this.corriendoSostenido && this.destinoSostenido) {
        this.libre = false;
        this.ruta = [];
        this.alLlegar = null;
        const dx = this.destinoSostenido.x - this.x;
        const dy = this.destinoSostenido.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 12) {
          vx = (dx / dist) * CORRER;
          vy = (dy / dist) * CORRER;
        }
      } else {
        for (const t of this.teclas) {
          vx += FLECHAS[t][0];
          vy += FLECHAS[t][1];
        }
        if (vx || vy) {
          this.libre = false; // walking with the keys brings the view back to the walker
          this.ruta = [];
          this.alLlegar = null;
          const n = Math.hypot(vx, vy);
          const v = this.corriendo || this.shift ? CORRER : VELOCIDAD;
          vx = (vx / n) * v;
          vy = (vy / n) * v;
        } else [vx, vy] = this.velocidadDeRuta();
      }
    }
    const x0 = this.x;
    const y0 = this.y;
    // Each axis is tried on its own, so the walker slides along a wall instead of stopping dead.
    if (vx && !this.bloquea(this.x + vx * dt, this.y)) this.x += vx * dt;
    if (vy && !this.bloquea(this.x, this.y + vy * dt)) this.y += vy * dt;
    this.moviendo = this.x !== x0 || this.y !== y0;
    if (vx || vy) this.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? "der" : "izq") : vy > 0 ? "abajo" : "arriba";
    // Running plays the same steps faster.
    this.tPaso = this.moviendo ? this.tPaso + dt * 1000 * (Math.hypot(vx, vy) / VELOCIDAD) : 0;
    if (this.perro && !this.pausado) this.moverPerro(dt);

    // Dust puffs when running
    if (this.rapido && this.tiempo - this.tUltimoPolvo > 110) {
      this.tUltimoPolvo = this.tiempo;
      this.particulasPolvo.push({
        x: this.x + (Math.random() * 10 - 5),
        y: this.y + (Math.random() * 4 - 2),
        t0: this.tiempo,
        r: 2 + Math.random() * 2,
      });
    }

    // Sparkles on guided object
    if (this.guia && !this.pausado && this.tiempo - this.tUltimoDestello > 340) {
      this.tUltimoDestello = this.tiempo;
      this.destellosGuia.push({
        x: this.guia.x + (Math.random() * 24 - 12),
        y: this.guia.y - 12 + (Math.random() * 16 - 8),
        t0: this.tiempo,
        dy: 10 + Math.random() * 10,
      });
    }

    // Refresh guide route when character or guide changes tile
    if (this.guia) {
      const tx = Math.floor(this.x / TILE);
      const ty = Math.floor((this.y - PIE.alto / 2) / TILE);
      const gx = Math.round(this.guia.x);
      const gy = Math.round(this.guia.y);
      if (tx !== this.celdaGuiaCalculada.tx || ty !== this.celdaGuiaCalculada.ty || gx !== this.celdaGuiaCalculada.metaX || gy !== this.celdaGuiaCalculada.metaY) {
        this.celdaGuiaCalculada = { tx, ty, metaX: gx, metaY: gy };
        const origen = celdaDe(this.x, this.y - PIE.alto / 2);
        const meta = libreCerca(this.o.mapa, Math.floor(this.guia.x / TILE), Math.floor(this.guia.y / TILE));
        this.rutaGuia = meta ? rutaA(this.o.mapa, origen, meta) : [];
      }
    } else {
      this.rutaGuia = [];
    }
  }

  // The dog: follows when close, occasionally runs ahead playfully.
  private moverPerro(dt: number) {
    const p = this.perro!;
    const f = p.f;
    const lejos = () => Math.hypot(this.x - f.x, this.y - f.y);
    const avanzar = (lista: { x: number; y: number }[], v: number, basta = () => false) => {
      let resto = v * dt;
      while (lista.length && resto > 0 && !basta()) {
        const meta = lista[0];
        const d = Math.hypot(meta.x - f.x, meta.y - f.y);
        if (Math.abs(meta.x - f.x) > 0.5) p.izq = meta.x < f.x;
        p.anda = true;
        if (d <= resto) {
          f.x = meta.x;
          f.y = meta.y;
          resto -= d;
          lista.shift();
        } else {
          f.x += ((meta.x - f.x) / d) * resto;
          f.y += ((meta.y - f.y) / d) * resto;
          resto = 0;
        }
      }
    };
    p.anda = false;
    if (p.modo === "quieto" || p.modo === "espera") {
      if (lejos() >= PERRO_CERCA) return;
      p.modo = "sigue";
      p.cola = [];
      p.hasta = this.tiempo + 6000 + Math.random() * 5000;
      return;
    }
    if (p.modo === "sigue") {
      const ultimo = p.cola.at(-1);
      if (!ultimo || Math.hypot(ultimo.x - this.x, ultimo.y - this.y) > 2) p.cola.push({ x: this.x, y: this.y });
      const v = p.cola.length > 25 ? CORRER : this.rapido ? CORRER : VELOCIDAD;
      avanzar(p.cola, v, () => lejos() <= PERRO_CERCA - 4);
      if (this.tiempo > p.hasta && !this.rapido) {
        const destino = this.lugarParaPerro();
        if (destino) {
          p.ruta = rutaA(this.o.mapa, celdaDe(f.x, f.y - 2), destino).map((c) => ({ x: c.tx * TILE + TILE / 2, y: c.ty * TILE + TILE / 2 + 6 }));
          p.modo = "corre";
          p.suelto = false;
        } else p.hasta = this.tiempo + 3000;
      }
      return;
    }
    if (lejos() > PERRO_CERCA * 2) p.suelto = true;
    if (p.suelto && lejos() < PERRO_CERCA) {
      p.modo = "espera";
      return;
    }
    avanzar(p.ruta, PERRO_CORRE);
    if (!p.ruta.length) p.modo = "espera";
  }

  private lugarParaPerro() {
    const { f } = this.perro!;
    const desde = celdaDe(f.x, f.y - 2);
    for (let intento = 0; intento < 20; intento++) {
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * 4;
      const tx = Math.round(desde.tx + Math.cos(a) * r);
      const ty = Math.round(desde.ty + Math.sin(a) * r);
      if (libre(this.o.mapa, tx, ty) && rutaA(this.o.mapa, desde, { tx, ty }).length) return { tx, ty };
    }
    return null;
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
    // The camera follows the walker, unless the child has moved the view. It stops at the map's edges; a map
    // smaller than the view is centered.
    const encajar = (pos: number, mide: number, vista: number) => (mide > vista ? Math.min(Math.max(pos, 0), mide - vista) : (mide - vista) / 2);
    const destino = this.libre ? this.mirada : { x: this.x - vw / 2, y: this.y - PIE.alto * 2 - vh / 2 };
    const fijo = { x: encajar(destino.x, m.ancho, vw), y: encajar(destino.y, m.alto, vh) };
    if (this.libre) this.mirada = fijo;
    this.cam = { x: Math.round(fijo.x), y: Math.round(fijo.y) };
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

    // Soft floor halo under the active target's feet (drawn on floor layer, beneath all figures)
    if (this.guia && !this.pausado) {
      const k = 0.5 + 0.5 * Math.sin(this.tiempo / 450);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(this.guia.x, this.guia.y, 16 + 2 * k, 8 + 1 * k, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(242, 193, 78, 0.25)";
      ctx.fill();
      ctx.strokeStyle = "rgba(242, 193, 78, 0.65)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    }

    // Guide path dots on the floor (only when not immediately next to the goal)
    const distGuia = this.guia ? Math.hypot(this.guia.x - this.x, this.guia.y - this.y) : 0;
    if (this.rutaGuia.length > 1 && !this.pausado && distGuia > 110) {
      const ahora = this.tiempo;
      ctx.save();
      for (let i = 0; i < this.rutaGuia.length - 1; i++) {
        const c = this.rutaGuia[i];
        const cx = c.tx * TILE + TILE / 2;
        const cy = c.ty * TILE + TILE / 2;
        const flujo = Math.sin(ahora / 260 - i * 0.7);
        const radio = 3 + 1.2 * flujo;
        const alfa = 0.45 + 0.35 * flujo;
        ctx.fillStyle = "#f2c14e";
        ctx.globalAlpha = Math.max(0.1, alfa);
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1, radio), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Touch ripples on the floor
    const ahoraOndas = this.tiempo;
    this.ondas = this.ondas.filter((o) => ahoraOndas - o.t0 < 350);
    for (const o of this.ondas) {
      const prog = (ahoraOndas - o.t0) / 350;
      const radio = 3 + 18 * prog;
      ctx.save();
      ctx.globalAlpha = Math.max(0, (1 - prog) * 0.75);
      ctx.strokeStyle = "#f2c14e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(o.x, o.y, radio, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Dust puffs on the ground behind sprinting feet
    const ahoraPolvo = this.tiempo;
    this.particulasPolvo = this.particulasPolvo.filter((p) => ahoraPolvo - p.t0 < 250);
    for (const p of this.particulasPolvo) {
      const prog = (ahoraPolvo - p.t0) / 250;
      const radio = p.r + 3.5 * prog;
      ctx.save();
      ctx.globalAlpha = Math.max(0, (1 - prog) * 0.45);
      ctx.fillStyle = "#e8dfd3";
      ctx.beginPath();
      ctx.arc(p.x, p.y - prog * 3, radio, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Everything that stands on the ground is drawn from back to front, by its feet.
    const cosas: { y: number; dibujar: () => void }[] = [];
    for (const p of m.puntos) {
      if (!visible(p, this.o.hora)) continue;
      const shakeInfo = this.sacudidas.get(p.nombre);
      let shakeX = 0;
      if (shakeInfo) {
        const dtShake = this.tiempo - shakeInfo.t0;
        if (dtShake < shakeInfo.duracion) {
          const factor = 1 - dtShake / shakeInfo.duracion;
          shakeX = Math.sin(dtShake / 22) * 3.5 * factor;
        } else {
          this.sacudidas.delete(p.nombre);
        }
      }
      if (p.tipo === "npc") {
        const distJugador = Math.hypot(p.x - this.x, p.y - this.y);
        const miraJugador = distJugador < 72;
        const voltear = miraJugador ? this.x > p.x : false;
        if (p.piel !== undefined) {
          const hoja = piezaYa(p.arte, { piel: p.piel });
          if (hoja) {
            cosas.push({
              y: p.y,
              dibujar: () => {
                const x = Math.round(p.x + shakeX - hoja.width / 2);
                const y = Math.round(p.y - hoja.height);
                if (!voltear) {
                  ctx.drawImage(hoja, x, y);
                } else {
                  ctx.save();
                  ctx.translate(x + hoja.width, y);
                  ctx.scale(-1, 1);
                  ctx.drawImage(hoja, 0, 0);
                  ctx.restore();
                }
              },
            });
          }
        } else {
          const img = piezaYa(p.arte);
          if (img) cosas.push({ y: p.y, dibujar: () => this.cuadro(img, 0, 0, p.x + shakeX, p.y, voltear) });
        }
      } else {
        const img = piezaYa(p.arte);
        if (img) {
          cosas.push({
            y: p.y,
            dibujar: () => {
              ctx.drawImage(img, Math.round(p.x + shakeX - img.width / 2), Math.round(p.y - img.height));
            },
          });
        }
      }
    }
    for (const f of this.o.figuras) {
      const hoja = piezaYa(`figuras/${f.id}`, { piel: f.piel });
      if (!hoja) continue;
      const perro = this.perro?.f === f ? this.perro : null;
      const lado = perro?.anda ? piezaYa("figuras/perro_lado") : undefined;
      const salto = perro?.anda && !lado ? Math.round(Math.abs(Math.sin(this.tiempo / 70)) * 2) : 0;
      const img = lado ?? hoja, w = lado ? CUADRO.ancho : hoja.width;
      const col = lado ? [0, 1, 0, 2][Math.floor(this.tiempo / PERRO_PASO_MS) % 4] : 0;
      const voltear = lado ? !perro!.izq : !!perro?.izq;
      cosas.push({
        y: f.y,
        dibujar: () => {
          const x = Math.round(f.x - w / 2);
          const y = Math.round(f.y - img.height) - salto;
          ctx.save();
          ctx.translate(voltear ? x + w : x, y);
          if (voltear) ctx.scale(-1, 1);
          ctx.drawImage(img, col * w, 0, w, img.height, 0, 0, w, img.height);
          ctx.restore();
        },
      });
    }
    const a = this.o.apariencia;
    const { fila, voltear } = filaDe(this.dir);
    const columna = this.moviendo ? 1 + (Math.floor(this.tPaso / PASO_MS) % 4) : 0;
    const capasListas = capas(a)
      .map((id) => piezaYa(id, coloresDe(a)))
      .filter((hoja): hoja is HTMLCanvasElement => !!hoja);

    // Action animation offsets for protagonist
    let saltoY = 0;
    let avanceX = 0;
    let avanceY = 0;
    if (this.accionActiva) {
      const transcurrido = this.tiempo - this.accionActiva.t0;
      if (transcurrido < this.accionActiva.duracion) {
        const prog = transcurrido / this.accionActiva.duracion;
        const dirOffsets: Record<Direccion, [number, number]> = {
          abajo: [0, 1],
          arriba: [0, -1],
          izq: [-1, 0],
          der: [1, 0],
        };
        const [dirX, dirY] = dirOffsets[this.dir];
        if (this.accionActiva.tipo === "brincar") {
          saltoY = Math.sin(prog * Math.PI) * 16;
        } else if (this.accionActiva.tipo === "golpear") {
          const lunge = Math.sin(prog * Math.PI) * 7;
          avanceX = dirX * lunge;
          avanceY = dirY * lunge;
        } else if (this.accionActiva.tipo === "patear") {
          const lunge = Math.sin(prog * Math.PI) * 9;
          avanceX = dirX * lunge;
          avanceY = dirY * lunge;
        }
      } else {
        if (this.accionActiva.tipo === "brincar") {
          this.particulasPolvo.push({ x: this.x - 5, y: this.y, t0: this.tiempo, r: 2.5 });
          this.particulasPolvo.push({ x: this.x + 5, y: this.y, t0: this.tiempo, r: 2.5 });
        }
        this.accionActiva = null;
      }
    }

    if (saltoY > 0) {
      cosas.push({
        y: this.y - 0.1,
        dibujar: () => {
          ctx.save();
          ctx.beginPath();
          const escala = Math.max(0.45, 1 - saltoY / 28);
          ctx.ellipse(this.x, this.y, 13 * escala, 5 * escala, 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
          ctx.fill();
          ctx.restore();
        },
      });
    }

    cosas.push({
      y: this.y,
      dibujar: () =>
        capasListas.forEach((hoja) =>
          this.cuadro(hoja, columna, fila, this.x + avanceX, this.y + avanceY - saltoY, voltear)
        ),
    });
    cosas.sort((p, q) => p.y - q.y).forEach((cosa) => cosa.dibujar());

    // Floating impact particles (stars, dust, bursts)
    const ahoraImpacto = this.tiempo;
    this.efectosImpacto = this.efectosImpacto.filter((e) => ahoraImpacto - e.t0 < e.duracion);
    for (const e of this.efectosImpacto) {
      const prog = (ahoraImpacto - e.t0) / e.duracion;
      const alfa = 1 - prog;
      const y = e.y - prog * 12;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alfa);
      ctx.font = "18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(e.texto, e.x, y);
      ctx.restore();
    }

    const luz = LUZ[this.o.hora];
    if (luz) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = luz;
      ctx.fillRect(0, 0, m.ancho, m.alto);
      ctx.restore();
    }

    const flecha = this.guia && !this.pausado ? this.flechaGuia(this.guia) : null; // a cover over the world hides the ring; no arrow then
    this.ponerHtml(flecha);
  }

  // HTML over the world: every element with data-mundo-x / data-mundo-y sits on that world point, one with
  // data-mundo-sigue on the feet of the child ("prota"); the one with data-flecha sits beside the
  // edge arrow, and hides when there is no arrow.
  private ponerHtml(flecha: { x: number; y: number } | null) {
    const c = this.o.canvas;
    const dpr = c.width / (c.clientWidth || c.width);
    const raiz = c.parentElement;
    if (!raiz) return;
    for (const el of raiz.querySelectorAll<HTMLElement>("[data-mundo-x], [data-mundo-sigue]")) {
      const sigue = el.dataset.mundoSigue === "prota" ? this : null;
      const x = (((sigue?.x ?? Number(el.dataset.mundoX)) - this.cam.x) * this.z) / dpr;
      const y = (((sigue?.y ?? Number(el.dataset.mundoY)) - this.cam.y) * this.z) / dpr;
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    }
    const texto = raiz.querySelector<HTMLElement>("[data-flecha]");
    if (!texto) return;
    texto.hidden = !flecha;
    if (flecha) texto.style.transform = `translate(${Math.round(flecha.x / dpr)}px, ${Math.round(flecha.y / dpr)}px)`;
  }

  // When the ring is off screen or under a button, an arrow points at it, so the child always knows where to go.
  // Returns where its label goes (device pixels, a little toward the middle), or null when the ring is in view.
  private flechaGuia(g: { x: number; y: number }): { x: number; y: number } | null {
    const { canvas: c } = this.o;
    const ctx = this.ctx;
    const px = (g.x - this.cam.x) * this.z;
    const py = (g.y - this.cam.y) * this.z;
    const dpr = c.width / (c.clientWidth || c.width);
    const r = c.getBoundingClientRect();
    const enPantalla = px >= 0 && px <= c.width && py >= 0 && py <= c.height;
    if (enPantalla && document.elementFromPoint(r.left + px / dpr, r.top + py / dpr) === c) return null;
    const borde = 32 * dpr;
    const cx = c.width / 2;
    const cy = c.height / 2;
    const dx = px - cx;
    const dy = py - cy;
    // On the edge, toward the ring; where a button sits there, it slides toward the middle until it is clear.
    let t = Math.min(1, (cx - borde) / Math.abs(dx || 1e-6), (cy - borde) / Math.abs(dy || 1e-6));
    while (t > 0.2 && document.elementFromPoint(r.left + (cx + dx * t) / dpr, r.top + (cy + dy * t) / dpr) !== c) t -= 0.04;
    const k = 0.5 + 0.5 * Math.sin(this.tiempo / 300);
    const lado = (16 + 3 * k) * dpr;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, cx + dx * t, cy + dy * t);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.beginPath();
    // A long point, so the direction reads at a glance.
    ctx.moveTo(lado * 1.2, 0);
    ctx.lineTo(-lado * 0.8, -lado * 0.7);
    ctx.lineTo(-lado * 0.3, 0);
    ctx.lineTo(-lado * 0.8, lado * 0.7);
    ctx.closePath();
    ctx.fillStyle = "#f2c14e";
    ctx.strokeStyle = "#1d1a24";
    ctx.lineWidth = 2.5 * dpr;
    ctx.lineJoin = "round";
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const atras = Math.hypot(dx * t, dy * t) || 1;
    const k2 = Math.max(0, 1 - (lado * 3.6) / atras);
    return { x: cx + dx * t * k2, y: cy + dy * t * k2 };
  }

  // One frame of a 5 × 3 character sheet (48 × 64), standing with its feet on (x, y); mirrored for "der".
  private cuadro(hoja: HTMLCanvasElement, columna: number, fila: number, x: number, y: number, voltear = false) {
    const sx = columna * CUADRO.ancho, sy = fila * CUADRO.alto, dx = Math.round(x - CUADRO.ancho / 2), dy = Math.round(y - CUADRO.alto);
    if (!voltear) return this.ctx.drawImage(hoja, sx, sy, CUADRO.ancho, CUADRO.alto, dx, dy, CUADRO.ancho, CUADRO.alto);
    this.ctx.save();
    this.ctx.translate(dx + CUADRO.ancho, dy);
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(hoja, sx, sy, CUADRO.ancho, CUADRO.alto, 0, 0, CUADRO.ancho, CUADRO.alto);
    this.ctx.restore();
  }
}
