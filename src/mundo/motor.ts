// The walking world: the child's character walks over the map and around its walls,
// the camera follows, and everything is drawn on a canvas at a whole-number zoom so the pixel art
// stays sharp. HTML over the canvas (door signs, speech) is
// placed here every frame from its world point. The rules (doors, hours, situations) live in pantallas/Mundo.tsx.
import type { Hora } from "../datos/guardado";
import { piezaYa, CUADRO } from "../lienzo/arte";
import { capas, coloresDe, filaDe, type Apariencia, type Direccion } from "../personaje/apariencia";
import { TILE, celdaDe, libre, libreCerca, rutaA, visible, type Mapa, type Punto, type Puerta } from "./mapa";

const VELOCIDAD = 90; // game pixels per second
const CORRER = 165; // running
const PASO_MS = 140; // time per walking frame
const LADO_CORTO = 360; // the short side of the screen shows about this many game pixels
const ZOOM_MAX = 4; // the closest the child can zoom, in whole steps
const ARRASTRE = 8; // screen pixels a finger moves before a tap becomes a drag
const PIE = { media: 10, alto: 12 }; // the feet box is 20 × 12 px, its bottom edge at the feet
const LUZ: Record<Hora, string | null> = { manana: null, tarde: "#ffe6c4", noche: "#6f7fb8" }; // multiplied over the map
const FLECHAS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] };
// The zoom the child picked stays while they walk from place to place.
let zoomElegido: number | null = null;

export type AccionPersonaje = "brincar" | "golpear_1" | "golpear_2" | "patada_remate" | "golpear" | "patear";

export interface ResultadoAccion {
  accion: AccionPersonaje;
  combo_paso: number; // 0: salto, 1: golpe 1, 2: golpe 2, 3: patada remate
  objetivo: string | null;
  tipo_objetivo: "npc" | "fauna" | "objeto" | "muro" | "nada";
  distancia: number | null;
  x: number;
  y: number;
  es_caida?: boolean;
}

export interface OpcionesMotor {
  canvas: HTMLCanvasElement;
  mapa: Mapa;
  x: number;
  y: number;
  dir: Direccion;
  apariencia: Apariencia;
  hora: Hora;
  alCuadro: () => void; // after every frame, for the rules
  alTocar: (cx: number, cy: number) => void; // a tap on the screen, not the end of a drag
  vigila: (p: Punto) => boolean; // who turns to face the child right now (vigilancia.ts)
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
  private z = 1;
  private zoomObjetivo = 1;
  private cam = { x: 0, y: 0 };
  private camPos = { x: 0, y: 0 };
  private camInicializado = false;
  private entidadHover: Punto | null = null;
  private ultimoHover: Punto | null = null;
  private hoverAlfa = 0;
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
  private accionActiva: { tipo: AccionPersonaje; t0: number; duracion: number } | null = null;
  private saltoDemostracion = false;
  private pasoCombo = 0; // 0: golpe 1, 1: golpe 2, 2: patada remate
  private tUltimoAtaque = 0;
  private hitFlashes = new Map<string, number>(); // entity name -> expire timestamp
  private sacudidas = new Map<string, { t0: number; duracion: number; dx: number; dy: number }>();
  private chispasHit: { x: number; y: number; t0: number; duracion: number; color: string; vx: number; vy: number; r: number }[] = [];
  private polvoAterrizaje: { x: number; y: number; t0: number; duracion: number; vx: number; r: number }[] = [];
  alCaerSalto: ((res: ResultadoAccion) => void) | null = null;

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
  }

  // Running right now: moving with the run button on, Shift held, tap-and-hold or double-tap.
  get rapido() {
    return this.moviendo && (this.corriendo || this.shift || this.corriendoSostenido || this.correrAlDestino);
  }

  private generarHitSparks(cx: number, cy: number, dx: number, dy: number) {
    const colores = ["#ffffff", "#ffeb3b", "#ff9800", "#ff5722"];
    for (let i = 0; i < 7; i++) {
      const angulo = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.8;
      const rap = 45 + Math.random() * 65;
      this.chispasHit.push({
        x: cx,
        y: cy,
        t0: this.tiempo,
        duracion: 220 + Math.random() * 100,
        color: colores[Math.floor(Math.random() * colores.length)],
        vx: Math.cos(angulo) * rap,
        vy: Math.sin(angulo) * rap,
        r: 1.5 + Math.random() * 2,
      });
    }
  }

  private generarPolvoAterrizaje(cx: number, cy: number) {
    for (let i = 0; i < 3; i++) {
      const vxIzq = -(22 + i * 14 + Math.random() * 8);
      const vxDer = +(22 + i * 14 + Math.random() * 8);
      this.polvoAterrizaje.push({
        x: cx - 4,
        y: cy + (Math.random() * 2 - 1),
        t0: this.tiempo,
        duracion: 320 + i * 40,
        vx: vxIzq,
        r: 3 + i * 1.5,
      });
      this.polvoAterrizaje.push({
        x: cx + 4,
        y: cy + (Math.random() * 2 - 1),
        t0: this.tiempo,
        duracion: 320 + i * 40,
        vx: vxDer,
        r: 3 + i * 1.5,
      });
    }
  }

  // Unified attack action with chaining combos: Golpe 1 -> Golpe 2 -> Patada Remate
  atacar(): ResultadoAccion {
    const ahora = this.tiempo;
    if (ahora - this.tUltimoAtaque < 480) {
      this.pasoCombo = (this.pasoCombo + 1) % 3;
    } else {
      this.pasoCombo = 0;
    }
    this.tUltimoAtaque = ahora;

    const tipos: AccionPersonaje[] = ["golpear_1", "golpear_2", "patada_remate"];
    const tipo = tipos[this.pasoCombo];
    return this.ejecutarAccion(tipo);
  }

  // Executes a physical character action (jump or combo step), detects front target, and records analytical outcome
  ejecutarAccion(tipo: AccionPersonaje): ResultadoAccion {
    const configAccion: Record<AccionPersonaje, { duracion: number; alcance: number; lunge: number; paso: number }> = {
      brincar: { duracion: 360, alcance: 34, lunge: 0, paso: 0 },
      golpear_1: { duracion: 220, alcance: 36, lunge: 7, paso: 1 },
      golpear_2: { duracion: 240, alcance: 40, lunge: 9, paso: 2 },
      patada_remate: { duracion: 300, alcance: 52, lunge: 14, paso: 3 },
      golpear: { duracion: 220, alcance: 36, lunge: 7, paso: 1 },
      patear: { duracion: 300, alcance: 52, lunge: 14, paso: 3 },
    };
    const cfg = configAccion[tipo] ?? configAccion.golpear_1;
    this.accionActiva = { tipo, t0: this.tiempo, duracion: cfg.duracion };

    const dirOffsets: Record<Direccion, [number, number]> = {
      abajo: [0, 1],
      arriba: [0, -1],
      izq: [-1, 0],
      der: [1, 0],
    };
    const [dx, dy] = dirOffsets[this.dir];
    const centroX = this.x + (tipo === "brincar" ? 0 : dx * (cfg.alcance / 2));
    const centroY = this.y + (tipo === "brincar" ? 0 : dy * (cfg.alcance / 2));

    let objetivoPunto: Punto | null = null;
    let menorDist = Infinity;

    // Search for entities in front (or nearby if jump)
    for (const p of this.o.mapa.puntos) {
      if (!visible(p, this.o.hora)) continue;
      const d = Math.hypot(p.x - centroX, p.y - centroY);
      if (d <= cfg.alcance && d < menorDist) {
        menorDist = d;
        objetivoPunto = p;
      }
    }

    // Check if hitting a solid wall/obstacle in front
    const celdaFrente = celdaDe(this.x + dx * TILE, this.y + dy * TILE - PIE.alto / 2);
    const esMuro = !libre(this.o.mapa, celdaFrente.tx, celdaFrente.ty);

    if (objetivoPunto) {
      // Elastic shake + Hit Flash on the entity!
      this.sacudidas.set(objetivoPunto.nombre, {
        t0: this.tiempo,
        duracion: 220,
        dx: dx * (cfg.paso === 3 ? 5 : 3),
        dy: dy * (cfg.paso === 3 ? 5 : 3),
      });
      this.hitFlashes.set(objetivoPunto.nombre, this.tiempo + 90);
      this.generarHitSparks(objetivoPunto.x, objetivoPunto.y - 18, dx, dy);
    } else if (esMuro && tipo !== "brincar") {
      this.generarHitSparks(this.x + dx * 22, this.y + dy * 22 - 16, -dx, -dy);
    } else if (tipo === "brincar") {
      // Dust puff on jump launch
      this.particulasPolvo.push({ x: this.x - 4, y: this.y, t0: this.tiempo, r: 3 });
      this.particulasPolvo.push({ x: this.x + 4, y: this.y, t0: this.tiempo, r: 3 });
    }

    return {
      accion: tipo,
      combo_paso: cfg.paso,
      objetivo: objetivoPunto?.nombre ?? (esMuro ? "muro" : null),
      tipo_objetivo: objetivoPunto?.tipo ?? (esMuro ? "muro" : "nada"),
      distancia: menorDist < Infinity ? Math.round(menorDist) : null,
      x: Math.round(this.x),
      y: Math.round(this.y),
    };
  }

  // Evaluates ground pound / offensive landing impact on nearby entities
  evaluarImpactoCaida(): ResultadoAccion | null {
    this.generarPolvoAterrizaje(this.x, this.y);

    const radioImpacto = 38;
    let objetivoPunto: Punto | null = null;
    let menorDist = Infinity;

    for (const p of this.o.mapa.puntos) {
      if (!visible(p, this.o.hora)) continue;
      const d = Math.hypot(p.x - this.x, p.y - this.y);
      if (d <= radioImpacto && d < menorDist) {
        menorDist = d;
        objetivoPunto = p;
      }
    }

    if (objetivoPunto) {
      this.sacudidas.set(objetivoPunto.nombre, {
        t0: this.tiempo,
        duracion: 240,
        dx: (Math.random() - 0.5) * 6,
        dy: 4,
      });
      this.hitFlashes.set(objetivoPunto.nombre, this.tiempo + 90);
      this.generarHitSparks(objetivoPunto.x, objetivoPunto.y - 12, 0, 1);
      return {
        accion: "brincar",
        combo_paso: 0,
        objetivo: objetivoPunto.nombre,
        tipo_objetivo: objetivoPunto.tipo,
        distancia: Math.round(menorDist),
        x: Math.round(this.x),
        y: Math.round(this.y),
        es_caida: true,
      };
    }
    return null;
  }

  // `demostracion`: the game shows the jump by itself, so its landing is not the child's action.
  brincar(demostracion = false): ResultadoAccion {
    this.saltoDemostracion = demostracion;
    return this.ejecutarAccion("brincar");
  }

  golpear(): ResultadoAccion {
    return this.atacar();
  }

  patear(): ResultadoAccion {
    return this.atacar();
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
    this.o.canvas.addEventListener("pointerleave", this.alSalirPuntero);
    this.o.canvas.addEventListener("wheel", this.rueda, { passive: false });
    this.ultimo = performance.now();
    const cuadro = (t: number) => {
      const dt = Math.min(0.05, (t - this.ultimo) / 1000);
      this.ultimo = t;
      this.tiempo = t;
      this.actualizar(dt);
      this.dibujar(dt);
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
    this.o.canvas.removeEventListener("pointerleave", this.alSalirPuntero);
    this.o.canvas.removeEventListener("wheel", this.rueda);
    this.o.canvas.style.cursor = "default";
  }

  // The canvas fills the window; the zoom keeps the short side at about LADO_CORTO game pixels.
  private medir = () => {
    const c = this.o.canvas;
    const dpr = devicePixelRatio || 1;
    c.width = Math.round(innerWidth * dpr);
    c.height = Math.round(innerHeight * dpr);
    const objetivo = zoomElegido ?? Math.max(1, Math.floor(Math.min(c.width, c.height) / LADO_CORTO));
    this.zoomObjetivo = objetivo;
    if (this.z <= 1 && !zoomElegido) this.z = objetivo;
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

  // The zoom buttons and the wheel change the zoom smoothly towards the next whole step.
  acercar() {
    this.fijarZoom(Math.round(this.zoomObjetivo) + 1);
  }

  alejar() {
    this.fijarZoom(Math.round(this.zoomObjetivo) - 1);
  }

  // Back to following the walker.
  centrar() {
    this.libre = false;
  }

  private fijarZoom(nuevo: number) {
    const n = Math.min(ZOOM_MAX, Math.max(1, nuevo));
    if (n === this.zoomObjetivo) return;
    this.zoomObjetivo = n;
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
      const p = this.aMundo(e.clientX, e.clientY);
      this.destinoSostenido = p;
      this.caminarA(p.x, p.y);
    }, 220);
  };

  private mover = (e: PointerEvent) => {
    const a = this.arrastre;
    if (!a || a.id !== e.pointerId) {
      this.actualizarHover(e.clientX, e.clientY);
      return;
    }
    if (this.corriendoSostenido) {
      // A new tile under the finger plans a new walk, the same as a tap does.
      const antes = this.destinoSostenido;
      const nuevo = this.aMundo(e.clientX, e.clientY);
      this.destinoSostenido = nuevo;
      const otraCelda = !antes || Math.floor(antes.x / TILE) !== Math.floor(nuevo.x / TILE) || Math.floor(antes.y / TILE) !== Math.floor(nuevo.y / TILE);
      if (otraCelda) this.caminarA(nuevo.x, nuevo.y);
      return;
    }
    const dx = e.clientX - a.x;
    const dy = e.clientY - a.y;
    if (!a.movio) {
      if (Math.hypot(dx, dy) <= ARRASTRE) return;
      clearTimeout(this.temporizadorHold);
      a.movio = true;
      this.libre = true;
      this.entidadHover = null;
      this.o.canvas.style.cursor = "default";
    }
    const c = this.o.canvas;
    const porPixel = c.width / c.getBoundingClientRect().width / this.z; // game pixels per screen pixel
    this.mirada = { x: a.cam.x - dx * porPixel, y: a.cam.y - dy * porPixel };
  };

  private actualizarHover(cx: number, cy: number) {
    if (this.arrastre?.movio || this.pausado) {
      if (this.entidadHover) {
        this.entidadHover = null;
        this.o.canvas.style.cursor = "default";
      }
      return;
    }
    const pt = this.puntoEn(cx, cy);
    if (pt) {
      this.entidadHover = pt;
      this.ultimoHover = pt;
      this.o.canvas.style.cursor = "pointer";
      return;
    }
    const puerta = this.puertaEn(cx, cy);
    if (puerta) {
      this.entidadHover = null;
      this.o.canvas.style.cursor = "pointer";
      return;
    }
    this.entidadHover = null;
    this.o.canvas.style.cursor = "default";
  }

  private alSalirPuntero = () => {
    this.entidadHover = null;
    this.o.canvas.style.cursor = "default";
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
    if (this.corriendoSostenido) this.ruta = []; // the hold's walk stops with the gesture
    this.corriendoSostenido = false;
    this.destinoSostenido = null;
    this.arrastre = null;
  };

  // Mouse wheel or trackpad: a few small movements make one step.
  private rueda = (e: WheelEvent) => {
    e.preventDefault();
    this.acumulado += e.deltaY;
    if (Math.abs(this.acumulado) < 80) return;
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
      const img = p.tipo === "npc" && p.piel !== undefined ? piezaYa(p.arte, { piel: p.piel }) : piezaYa(p.arte, { tinte: p.tinte });
      const w = p.tipo === "npc" && p.piel === undefined ? CUADRO.ancho : (img?.width ?? 24);
      const h = p.tipo === "npc" && p.piel === undefined ? CUADRO.alto : (img?.height ?? 24);
      if (x >= p.x - w / 2 - 8 && x <= p.x + w / 2 + 8 && y >= p.y - h - 18 && y <= p.y + 8 && (!mejor || p.y > mejor.y)) mejor = p;
    }
    return mejor;
  }

  puertaEn(cx: number, cy: number): Puerta | null {
    const { x, y } = this.aMundo(cx, cy);
    for (const p of this.o.mapa.puertas) {
      if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return p;
    }
    return null;
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
    const px = (cx - r.left) * k;
    const py = (cy - r.top) * k;
    const transX = -Math.round(this.cam.x * this.z);
    const transY = -Math.round(this.cam.y * this.z);
    return {
      x: (px - transX) / this.z,
      y: (py - transY) / this.z,
    };
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
    const v = this.corriendo || this.shift || this.corriendoSostenido || this.correrAlDestino ? CORRER : VELOCIDAD;
    return [((p.x - this.x) / d) * v, ((p.y - this.y) / d) * v];
  }

  private actualizar(dt: number) {
    let vx = 0;
    let vy = 0;
    if (!this.pausado) {
      if (this.corriendoSostenido) {
        // The walk planned when the hold started or the finger moved to another tile.
        [vx, vy] = this.velocidadDeRuta();
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

    // Smooth hover alpha transition
    const objetivoAlfa = this.entidadHover ? 1 : 0;
    this.hoverAlfa += (objetivoAlfa - this.hoverAlfa) * (1 - Math.exp(-dt * 14));
    if (Math.abs(this.hoverAlfa - objetivoAlfa) < 0.005) {
      this.hoverAlfa = objetivoAlfa;
      if (!this.entidadHover) this.ultimoHover = null;
    }

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

  // Whether the feet box at (x, y) touches a blocked tile (outside the map counts as blocked).
  private bloquea(x: number, y: number) {
    const m = this.o.mapa;
    for (let ty = Math.floor((y - PIE.alto) / TILE); ty <= Math.floor((y - 0.01) / TILE); ty++)
      for (let tx = Math.floor((x - PIE.media) / TILE); tx <= Math.floor((x + PIE.media - 0.01) / TILE); tx++) if (!libre(m, tx, ty)) return true;
    return false;
  }

  private dibujar(dt = 0.016) {
    const { canvas: c, mapa: m } = this.o;
    const ctx = this.ctx;

    // Smooth Zoom interpolation
    if (Math.abs(this.z - this.zoomObjetivo) > 0.001) {
      const factorZoom = 1 - Math.exp(-dt * 8);
      const antesZ = this.z;
      this.z += (this.zoomObjetivo - this.z) * factorZoom;
      if (Math.abs(this.z - this.zoomObjetivo) < 0.001) {
        this.z = this.zoomObjetivo;
        this.ctx.imageSmoothingEnabled = false;
      } else {
        this.ctx.imageSmoothingEnabled = true;
      }
      const centroX = this.camPos.x + c.width / antesZ / 2;
      const centroY = this.camPos.y + c.height / antesZ / 2;
      this.camPos.x = centroX - c.width / this.z / 2;
      this.camPos.y = centroY - c.height / this.z / 2;
      if (this.libre) {
        this.mirada.x = this.camPos.x;
        this.mirada.y = this.camPos.y;
      }
    }

    const z = this.z;
    const vw = c.width / z;
    const vh = c.height / z;

    // The camera follows the walker, unless the child has moved the view. It stops at the map's edges; a map
    // smaller than the view is centered.
    const encajar = (pos: number, mide: number, vista: number) => (mide > vista ? Math.min(Math.max(pos, 0), mide - vista) : (mide - vista) / 2);
    const destino = this.libre ? this.mirada : { x: this.x - vw / 2, y: this.y - PIE.alto * 2 - vh / 2 };
    const fijo = { x: encajar(destino.x, m.ancho, vw), y: encajar(destino.y, m.alto, vh) };
    if (this.libre) this.mirada = fijo;

    if (!this.camInicializado) {
      this.camPos = { x: fijo.x, y: fijo.y };
      this.cam = { x: fijo.x, y: fijo.y };
      this.camInicializado = true;
    } else if (this.arrastre?.movio) {
      this.camPos = { x: fijo.x, y: fijo.y };
      this.cam = { x: fijo.x, y: fijo.y };
    } else {
      const factorCam = 1 - Math.exp(-dt * 12);
      this.camPos.x += (fijo.x - this.camPos.x) * factorCam;
      this.camPos.y += (fijo.y - this.camPos.y) * factorCam;
      this.camPos.x = encajar(this.camPos.x, m.ancho, vw);
      this.camPos.y = encajar(this.camPos.y, m.alto, vh);
      this.cam = { x: this.camPos.x, y: this.camPos.y };
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1d1a24";
    ctx.fillRect(0, 0, c.width, c.height);

    const transX = -Math.round(this.cam.x * z);
    const transY = -Math.round(this.cam.y * z);
    ctx.setTransform(z, 0, 0, z, transX, transY);

    // The ground: only the part on screen is drawn.
    const fondo = piezaYa(`lugares/${m.lugar}/fondo`);
    if (fondo) {
      const sx = Math.max(0, Math.floor(this.cam.x));
      const sy = Math.max(0, Math.floor(this.cam.y));
      const sw = Math.min(m.ancho, Math.ceil(this.cam.x + vw)) - sx;
      const sh = Math.min(m.alto, Math.ceil(this.cam.y + vh)) - sy;
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

    // Floor halo for hovered entity
    if (this.ultimoHover && this.hoverAlfa > 0.01 && !this.pausado) {
      const p = this.ultimoHover;
      const esGuia = this.guia && Math.hypot(p.x - this.guia.x, p.y - this.guia.y) < 4;
      if (!esGuia) {
        const k = 0.5 + 0.5 * Math.sin(this.tiempo / 350);
        ctx.save();
        ctx.beginPath();
        const radX = (p.tipo === "npc" ? 14 : 16) + 1.5 * k;
        const radY = (p.tipo === "npc" ? 7 : 8) + 0.8 * k;
        ctx.ellipse(p.x, p.y, radX, radY, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 230, 150, ${0.28 * this.hoverAlfa})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 215, 100, ${0.75 * this.hoverAlfa})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
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
      let deformX = 1;
      let deformY = 1;
      if (shakeInfo) {
        const dtShake = this.tiempo - shakeInfo.t0;
        if (dtShake < shakeInfo.duracion) {
          const factor = 1 - dtShake / shakeInfo.duracion;
          shakeX = Math.sin(dtShake / 20) * shakeInfo.dx * factor;
          // Disney elastic squash & stretch bounce
          const bounce = Math.sin((dtShake / shakeInfo.duracion) * Math.PI * 2) * factor * 0.12;
          deformX = 1 + bounce;
          deformY = 1 - bounce;
        } else {
          this.sacudidas.delete(p.nombre);
        }
      }
      const esFlash = (this.hitFlashes.get(p.nombre) ?? 0) > this.tiempo;
      const esHover = this.ultimoHover === p && this.hoverAlfa > 0.05;

      const aplicarTransformHit = (dibujo: () => void) => {
        ctx.save();
        if (esFlash) ctx.filter = "brightness(0) invert(1)";
        else if (esHover) ctx.filter = `brightness(${(1 + 0.12 * this.hoverAlfa).toFixed(2)})`;
        if (deformX !== 1 || deformY !== 1 || shakeX !== 0) {
          ctx.translate(p.x + shakeX, p.y);
          ctx.scale(deformX, deformY);
          ctx.translate(-(p.x + shakeX), -p.y);
        }
        dibujo();
        ctx.restore();
      };

      if (p.tipo === "npc") {
        const vigila = this.o.vigila(p);
        let voltear = vigila && this.x > p.x;
        if (!vigila && m.lugar === "tiendita" && p.nombre === "vecino_generico") {
          voltear = p.x > m.ancho / 2;
        }
        if (p.piel !== undefined) {
          const hoja = piezaYa(p.arte, { piel: p.piel });
          if (hoja) {
            cosas.push({
              y: p.y,
              dibujar: () => {
                aplicarTransformHit(() => {
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
                });
              },
            });
          }
        } else {
          const img = piezaYa(p.arte);
          if (img) {
            cosas.push({
              y: p.y,
              dibujar: () => {
                aplicarTransformHit(() => {
                  this.cuadro(img, 0, 0, p.x + shakeX, p.y, voltear);
                });
              },
            });
          }
        }
      } else {
        // Objects integrated directly into the pre-rendered room background are interactable without duplicate sprites; animals are never in it
        if (m.lugar !== "tiendita" || p.tipo === "fauna") {
          const img = piezaYa(p.arte, { tinte: p.tinte });
          if (img) {
            const voltear = this.o.vigila(p) && this.x > p.x;
            cosas.push({
              y: p.y,
              dibujar: () => {
                aplicarTransformHit(() => {
                  const x = Math.round(p.x + shakeX - img.width / 2);
                  const y = Math.round(p.y - img.height);
                  if (!voltear) return ctx.drawImage(img, x, y);
                  ctx.save();
                  ctx.translate(x + img.width, y);
                  ctx.scale(-1, 1);
                  ctx.drawImage(img, 0, 0);
                  ctx.restore();
                });
              },
            });
          }
        }
      }
    }
    const a = this.o.apariencia;
    const { fila, voltear } = filaDe(this.dir);
    const columna = this.moviendo ? 1 + (Math.floor(this.tPaso / PASO_MS) % 4) : 0;
    const capasListas = capas(a)
      .map((id) => piezaYa(id, coloresDe(a)))
      .filter((hoja): hoja is HTMLCanvasElement => !!hoja);

    // Action animation offsets and Disney Squash & Stretch for protagonist
    let saltoY = 0;
    let avanceX = 0;
    let avanceY = 0;
    let protaScaleX = 1;
    let protaScaleY = 1;

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
          // Arc trajectory
          saltoY = Math.sin(prog * Math.PI) * 18;
          // Disney Squash & Stretch:
          // 0.00 .. 0.16 -> Anticipation squash (crouch before leaping)
          // 0.16 .. 0.78 -> Airborne stretch along vertical leap
          // 0.78 .. 1.00 -> Impact compression on touchdown
          if (prog < 0.16) {
            const f = prog / 0.16;
            protaScaleX = 1 + (1 - f) * 0.16;
            protaScaleY = 1 - (1 - f) * 0.18;
          } else if (prog < 0.78) {
            const v = Math.sin(((prog - 0.16) / 0.62) * Math.PI);
            protaScaleX = 1 - v * 0.12;
            protaScaleY = 1 + v * 0.14;
          } else {
            const f = (prog - 0.78) / 0.22;
            const squash = Math.sin(f * Math.PI);
            protaScaleX = 1 + squash * 0.22;
            protaScaleY = 1 - squash * 0.24;
          }
        } else {
          // Attack actions (golpear_1, golpear_2, patada_remate, golpear, patear)
          const lungeDist =
            this.accionActiva.tipo === "patada_remate" || this.accionActiva.tipo === "patear"
              ? 13
              : this.accionActiva.tipo === "golpear_2"
              ? 9
              : 7;
          const lunge = Math.sin(prog * Math.PI) * lungeDist;
          avanceX = dirX * lunge;
          avanceY = dirY * lunge;

          // Anticipation & punch stretch
          if (prog < 0.25) {
            protaScaleX = 0.94;
            protaScaleY = 1.06;
          } else if (prog < 0.65) {
            protaScaleX = 1.14;
            protaScaleY = 0.92;
          } else {
            const f = (prog - 0.65) / 0.35;
            protaScaleX = 1 + (1 - f) * 0.08;
            protaScaleY = 1 - (1 - f) * 0.08;
          }
        }
      } else {
        if (this.accionActiva.tipo === "brincar") {
          const resCaida = this.evaluarImpactoCaida();
          if (resCaida && this.alCaerSalto && !this.saltoDemostracion) {
            this.alCaerSalto(resCaida);
          }
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
          const escala = Math.max(0.4, 1 - saltoY / 28);
          ctx.ellipse(this.x, this.y, 13 * escala, 5 * escala, 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
          ctx.fill();
          ctx.restore();
        },
      });
    }

    cosas.push({
      y: this.y,
      dibujar: () => {
        ctx.save();
        const pieX = this.x + avanceX;
        const pieY = this.y + avanceY - saltoY;
        if (protaScaleX !== 1 || protaScaleY !== 1) {
          ctx.translate(pieX, pieY);
          ctx.scale(protaScaleX, protaScaleY);
          ctx.translate(-pieX, -pieY);
        }
        capasListas.forEach((hoja) =>
          this.cuadro(hoja, columna, fila, pieX, pieY, voltear)
        );
        ctx.restore();
      },
    });
    cosas.sort((p, q) => p.y - q.y).forEach((cosa) => cosa.dibujar());

    // Hit Sparks (Arcade diamond / radiant stars)
    const ahora = this.tiempo;
    this.chispasHit = this.chispasHit.filter((s) => ahora - s.t0 < s.duracion);
    for (const s of this.chispasHit) {
      const dt = (ahora - s.t0) / 1000;
      const prog = (ahora - s.t0) / s.duracion;
      const alfa = 1 - prog;
      const px = s.x + s.vx * dt;
      const py = s.y + s.vy * dt;
      const r = s.r * (1 + prog * 0.8);
      ctx.save();
      ctx.globalAlpha = Math.max(0, alfa);
      ctx.fillStyle = s.color;
      // Draw 4-point radiant diamond star
      ctx.beginPath();
      ctx.moveTo(px, py - r * 2.2);
      ctx.lineTo(px + r * 0.7, py);
      ctx.lineTo(px, py + r * 2.2);
      ctx.lineTo(px - r * 0.7, py);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(px - r * 2.2, py);
      ctx.lineTo(px, py + r * 0.7);
      ctx.lineTo(px + r * 2.2, py);
      ctx.lineTo(px, py - r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Landing Dust clouds (fan-shaped expanding puffs)
    this.polvoAterrizaje = this.polvoAterrizaje.filter((p) => ahora - p.t0 < p.duracion);
    for (const p of this.polvoAterrizaje) {
      const dt = (ahora - p.t0) / 1000;
      const prog = (ahora - p.t0) / p.duracion;
      const alfa = (1 - prog) * 0.75;
      const px = p.x + p.vx * dt;
      const py = p.y - Math.sin(prog * Math.PI) * 4;
      const radio = p.r * (1 + prog * 1.6);
      ctx.save();
      ctx.globalAlpha = Math.max(0, alfa);
      ctx.fillStyle = "#e0d3c1";
      ctx.beginPath();
      ctx.arc(px, py, radio, 0, Math.PI * 2);
      ctx.fill();
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
    const transX = -Math.round(this.cam.x * this.z);
    const transY = -Math.round(this.cam.y * this.z);
    for (const el of raiz.querySelectorAll<HTMLElement>("[data-mundo-x], [data-mundo-sigue]")) {
      const sigue = el.dataset.mundoSigue === "prota" ? this : null;
      const wx = sigue?.x ?? Number(el.dataset.mundoX);
      const wy = sigue?.y ?? Number(el.dataset.mundoY);
      const x = (wx * this.z + transX) / dpr;
      const y = (wy * this.z + transY) / dpr;
      el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
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
    const transX = -Math.round(this.cam.x * this.z);
    const transY = -Math.round(this.cam.y * this.z);
    const px = g.x * this.z + transX;
    const py = g.y * this.z + transY;
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
