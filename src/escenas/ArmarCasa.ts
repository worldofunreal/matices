import Phaser from "phaser";
import contenido from "virtual:contenido";
import arte from "virtual:arte";
import { variante } from "../arte";
import { Boton, marco, texto } from "../ui/ui";
import { hablar, callar } from "../ui/voz";
import { Protagonista } from "../personaje/Protagonista";
import { estado, cambiarEstado, type FiguraPuesta } from "../datos/guardado";
import { nuevaInstancia, nombreDe, codigoDe, tipoDe } from "../datos/casa";
import { registrar } from "../datos/eventos";

const T = contenido.textos.casa;
const TILE = 32;
const ARRASTRE = 8; // pixels a finger moves before a tap becomes a pan

type Cuarto = { nombre: string; rect: Phaser.Geom.Rectangle };
type Seleccion = { tipo: "nueva"; figura: string } | { tipo: "mover"; inst: string | "prota" } | null;

// Building the house (GDD §7): the child puts figures from the shelf into the rooms.
// The house is seen whole, in cutaway; on small screens it can be dragged around.
export class ArmarCasa extends Phaser.Scene {
  private casa: FiguraPuesta[] = [];
  private prota = { x: 0, y: 0 };
  private cuartos: Cuarto[] = [];
  private seleccion: Seleccion = null;
  private menuDe: string | "prota" | null = null;
  private orden = 0;
  private toques = 0;
  private t0 = 0;
  private ancho = 0;
  private alto = 0;
  private ui!: Phaser.Cameras.Scene2D.Camera;
  private capaCasa!: Phaser.GameObjects.Container;
  private capaUI!: Phaser.GameObjects.Container;
  private entrada: HTMLInputElement | null = null;

  constructor() {
    super("ArmarCasa");
  }

  create() {
    const mapa = this.make.tilemap({ key: "casa" });
    this.ancho = mapa.widthInPixels;
    this.alto = mapa.heightInPixels;
    this.cuartos = mapa.getObjectLayer("cuartos")!.objects.map((o) => ({ nombre: o.name, rect: new Phaser.Geom.Rectangle(o.x!, o.y!, o.width!, o.height!) }));
    const e = estado();
    this.casa = structuredClone(e.casa);
    const recamara = this.cuartos.find((c) => c.nombre === "recamara")!.rect;
    this.prota = e.protaCasa ?? { x: recamara.centerX, y: recamara.centerY + TILE };
    this.orden = this.casa.length;
    this.toques = 0;
    this.t0 = performance.now();
    this.seleccion = null;
    this.menuDe = null;
    this.cameras.main.setBackgroundColor("#e8dcc6");
    this.ui = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.armar();
    this.escucharToques();
    hablar("casa.inicio", `${T.inicio} ${T.instruccion}`);
    this.scale.on("resize", this.armar, this);
    this.events.once("shutdown", () => {
      this.scale.off("resize", this.armar, this);
      this.quitarEntrada();
    });
  }

  // Everything is rebuilt on each change: few objects, and the layout depends on the screen.
  private armar() {
    this.quitarEntrada();
    this.children.removeAll(true);
    const { width: w, height: h } = this.scale;
    const horizontal = w > h;
    const repisa = horizontal ? { x: w - Math.min(300, w * 0.4), y: 0, w: Math.min(300, w * 0.4), h } : { x: 0, y: h - Math.min(h * 0.42, 300), w, h: Math.min(h * 0.42, 300) };
    const vista = horizontal ? { x: 0, y: 0, w: repisa.x, h } : { x: 0, y: 0, w, h: repisa.y };

    // House camera: the house fills the view (never larger than real size) and the rest is dragged.
    const cam = this.cameras.main;
    cam.setViewport(vista.x, vista.y, vista.w, vista.h);
    cam.setZoom(Math.min(1, Math.max(vista.w / this.ancho, vista.h / this.alto)));
    cam.setBounds(0, 0, this.ancho, this.alto);
    this.ui.setViewport(0, 0, w, h);

    this.capaCasa = this.add.container(0, 0);
    this.capaUI = this.add.container(0, 0);
    this.capaCasa.add(this.add.image(0, 0, "lugares/casa/fondo").setOrigin(0));
    for (const f of this.casa) this.capaCasa.add(this.figuraEnCasa(f));
    const p = new Protagonista(this, this.prota.x, this.prota.y, estado().apariencia).setDepth(this.prota.y);
    p.setSize(32, 48).setInteractive(new Phaser.Geom.Rectangle(-16, -48, 32, 48), Phaser.Geom.Rectangle.Contains);
    p.on("pointerup", () => this.tocarPuesta("prota"));
    this.capaCasa.add(p);
    this.capaCasa.sort("depth");

    // Shelf.
    this.capaUI.add(this.add.rectangle(repisa.x, repisa.y, repisa.w, repisa.h, 0xd9c9ab).setOrigin(0));
    const cw = 56;
    const ch = 66;
    const cols = Math.max(1, Math.floor((repisa.w - 8) / (cw + 4)));
    const x0 = repisa.x + (repisa.w - cols * (cw + 4) + 4) / 2 + cw / 2;
    contenido.figuras.forEach((f, i) => {
      const x = x0 + (i % cols) * (cw + 4);
      const y = repisa.y + 8 + ch / 2 + Math.floor(i / cols) * (ch + 4);
      const elegida = this.seleccion?.tipo === "nueva" && this.seleccion.figura === f.id;
      const tarjeta = new Boton(this, x, y, { ancho: cw, alto: ch }, () => this.elegirDeRepisa(f.id)).elegir(elegida);
      tarjeta.add([this.add.image(0, -8, `figuras/retrato_${f.id}`).setScale(0.5), texto(this, 0, ch / 2 - 10, f.nombre, 8, cw - 4)]);
      this.capaUI.add(tarjeta);
    });

    const abajo = repisa.y + repisa.h - 22;
    this.capaUI.add(new Boton(this, repisa.x + 24, abajo, { ancho: 32, alto: 32, imagen: "interfaz/boton_volver_a_escuchar" }, () => hablar("casa.instruccion", T.instruccion)));
    this.capaUI.add(new Boton(this, repisa.x + repisa.w - 56, abajo, { ancho: 96, alto: 32, etiqueta: T.listo, voz: { clave: "casa.listo", texto: T.listo } }, () => this.terminar()));
    if (this.menuDe) this.capaUI.add(this.menu(this.menuDe, vista));

    cam.ignore(this.capaUI);
    this.ui.ignore(this.capaCasa);
  }

  private figuraEnCasa(f: FiguraPuesta) {
    const s = this.add.sprite(f.x, f.y, variante(this, `figuras/${f.figura}`, { piel: f.piel }), 0).setOrigin(0.5, 1).setDepth(f.y);
    s.setInteractive({ useHandCursor: true }).on("pointerup", () => this.tocarPuesta(f.inst));
    if (this.menuDe === f.inst || (this.seleccion?.tipo === "mover" && this.seleccion.inst === f.inst)) s.setAlpha(0.6);
    return s;
  }

  // Options for a placed figure (or the child's own character, which can only move).
  private menu(inst: string | "prota", vista: { x: number; y: number; w: number; h: number }) {
    const f = this.casa.find((x) => x.inst === inst);
    const titulo = f ? nombreDe(f) : estado().nombre;
    const acciones: [string, string, () => void][] = [[T.mover, "casa.mover", () => this.empezarMover(inst)]];
    if (f) {
      acciones.push([T.renombrar, "casa.renombrar", () => this.renombrar(f)], [T.piel, "casa.piel", () => this.cambiarPiel(f)], [T.quitar, "casa.quitar", () => this.quitar(f)]);
    }
    acciones.push([T.cerrar, "casa.cerrar", () => ((this.menuDe = null), this.armar())]);
    const bw = 120;
    const alto = 40 + acciones.length * 34;
    const c = this.add.container(vista.x + vista.w / 2, vista.y + vista.h / 2);
    c.add(marco(this, 0, 0, bw + 24, alto));
    c.add(texto(this, 0, -alto / 2 + 18, titulo, 12, bw));
    acciones.forEach(([etiqueta, clave, accion], i) => c.add(new Boton(this, 0, -alto / 2 + 50 + i * 34, { ancho: bw, alto: 28, etiqueta, voz: { clave, texto: etiqueta } }, accion)));
    return c;
  }

  // Taps on the house: a short tap places or moves; a drag pans the camera.
  private escucharToques() {
    let desde: { x: number; y: number; sx: number; sy: number } | null = null;
    let arrastra = false;
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      const cam = this.cameras.main;
      if (!cam.worldView || !Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(cam.x, cam.y, cam.width, cam.height), p.x, p.y)) return;
      desde = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY };
      arrastra = false;
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!desde || !p.isDown) return;
      if (Math.hypot(p.x - desde.x, p.y - desde.y) > ARRASTRE) arrastra = true;
      if (arrastra) {
        const cam = this.cameras.main;
        cam.setScroll(desde.sx - (p.x - desde.x) / cam.zoom, desde.sy - (p.y - desde.y) / cam.zoom);
      }
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer, encima: Phaser.GameObjects.GameObject[]) => {
      const fue = desde;
      desde = null;
      if (!fue || arrastra || encima.some((o) => this.enUI(o))) return;
      if (encima.length && !this.seleccion) return; // a tap on a placed figure opens its menu
      const punto = this.cameras.main.getWorldPoint(p.x, p.y);
      this.tocarCasa(punto.x, punto.y);
    });
  }

  private enUI(o: Phaser.GameObjects.GameObject) {
    for (let c = o.parentContainer; c; c = c.parentContainer) if (c === this.capaUI) return true;
    return false;
  }

  private cuartoEn(x: number, y: number) {
    return this.cuartos.find((c) => c.rect.contains(x, y));
  }

  private distancia(x: number, y: number) {
    return Math.round(Math.hypot(x - this.prota.x, y - this.prota.y) / TILE);
  }

  private elegirDeRepisa(figura: string) {
    this.toques++;
    this.menuDe = null;
    this.seleccion = { tipo: "nueva", figura };
    const nombre = contenido.figuras.find((f) => f.id === figura)!.nombre;
    hablar("casa.elegida", T.elegida.replace("{figura}", nombre));
    this.armar();
  }

  private tocarPuesta(inst: string | "prota") {
    this.toques++;
    if (this.seleccion) return; // placing or moving: the tap is handled as a tap on that spot
    this.menuDe = inst;
    this.armar();
  }

  private tocarCasa(x: number, y: number) {
    const cuarto = this.cuartoEn(x, y);
    if (!cuarto || !this.seleccion) return;
    this.toques++;
    // Keep the figure's feet inside the room.
    const px = Phaser.Math.Clamp(x, cuarto.rect.left + 12, cuarto.rect.right - 12);
    const py = Phaser.Math.Clamp(y, cuarto.rect.top + 40, cuarto.rect.bottom - 4);
    const nombreCuarto = T.cuartos[cuarto.nombre];
    const sel = this.seleccion;
    if (sel.tipo === "nueva") {
      const f: FiguraPuesta = { inst: nuevaInstancia(sel.figura, this.casa), figura: sel.figura, cuarto: cuarto.nombre, x: px, y: py, nombre: null, piel: 0 };
      this.casa.push(f);
      this.evento("poner", f);
      hablar("casa.puesta", T.puesta.replace("{figura}", nombreDe(f)).replace("{cuarto}", nombreCuarto));
    } else if (sel.inst === "prota") {
      this.prota = { x: px, y: py };
      registrar("casa_figura", { accion: "mover", figura: "PROTAGONISTA", cuarto: cuarto.nombre, orden: ++this.orden });
    } else {
      const f = this.casa.find((x) => x.inst === sel.inst)!;
      Object.assign(f, { x: px, y: py, cuarto: cuarto.nombre });
      this.evento("mover", f);
    }
    this.seleccion = null;
    this.guardar();
    this.armar();
  }

  private empezarMover(inst: string | "prota") {
    this.seleccion = { tipo: "mover", inst };
    this.menuDe = null;
    this.armar();
  }

  private cambiarPiel(f: FiguraPuesta) {
    f.piel = (f.piel + 1) % arte.colores.piel.variantes.length;
    this.evento("piel", f, { tono: f.piel + 1 });
    this.guardar();
    this.armar();
  }

  private quitar(f: FiguraPuesta) {
    this.casa = this.casa.filter((x) => x !== f);
    this.evento("quitar", f);
    this.menuDe = null;
    this.guardar();
    this.armar();
  }

  // A real text field over the game, so phone keyboards work. The name stays on the device.
  private renombrar(f: FiguraPuesta) {
    this.quitarEntrada();
    const e = document.createElement("input");
    e.maxLength = 16;
    e.value = f.nombre ?? "";
    e.placeholder = nombreDe(f);
    e.setAttribute("aria-label", T.renombrar);
    Object.assign(e.style, { position: "fixed", left: "50%", top: "30%", transform: "translate(-50%,-50%)", fontSize: "20px", padding: "8px 12px", borderRadius: "8px", border: "3px solid #7a5c4f", width: "220px", textAlign: "center" });
    document.body.append(e);
    e.focus();
    const listo = () => {
      if (this.entrada !== e) return;
      const limpio = e.value.replace(/[^\p{L}\p{N} ]/gu, "").trim();
      if (limpio && limpio !== f.nombre) {
        f.nombre = limpio;
        this.evento("renombrar", f);
        this.guardar();
      }
      this.armar();
    };
    e.addEventListener("keydown", (k) => k.key === "Enter" && listo());
    e.addEventListener("blur", listo);
    this.entrada = e;
  }

  private quitarEntrada() {
    const e = this.entrada;
    this.entrada = null;
    e?.remove();
  }

  private evento(accion: string, f: FiguraPuesta, extra: Record<string, unknown> = {}) {
    registrar("casa_figura", { accion, figura: codigoDe(f), clase: tipoDe(f.figura), cuarto: f.cuarto, distancia: this.distancia(f.x, f.y), orden: ++this.orden, ...extra });
  }

  private guardar() {
    cambiarEstado({ casa: structuredClone(this.casa), protaCasa: this.prota }, true);
  }

  private terminar() {
    callar();
    registrar("casa_lista", {
      figuras: this.casa.map((f) => ({ figura: codigoDe(f), clase: tipoDe(f.figura), cuarto: f.cuarto, distancia: this.distancia(f.x, f.y), renombrada: f.nombre !== null, tono: f.piel + 1 })),
      prota_cuarto: this.cuartoEn(this.prota.x, this.prota.y)?.nombre ?? null,
      toques: this.toques,
      ms: Math.round(performance.now() - this.t0),
    });
    cambiarEstado({ casa: this.casa, protaCasa: this.prota, casaLista: true }, true);
    this.scene.start("Mundo", estado());
  }
}
