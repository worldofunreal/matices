import Phaser from "phaser";
import contenido from "virtual:contenido";
import { Boton, texto } from "../ui/ui";
import { hablar } from "../ui/voz";
import { registrar } from "../datos/eventos";

const COLORES = [0x1d1a24, 0x7a5c4f, 0xd94f4f, 0xf28c38, 0xf2c14e, 0x6cbf6a, 0x2f8f6b, 0x5b8fd6, 0x3c4fa8, 0x9b6bd1, 0xf4a6c8, 0xffffff];
const GROSORES = [3, 6, 12];
const PAPEL = 0xfaf6ee;

type Trazo = { color: number; grosor: number; goma: boolean; puntos: [number, number, number][] };

export interface DatosDibujo {
  origen: string; // story and step, or "libre"
  consigna: string;
  alTerminar: (imagen: string | null) => void;
  ahoraNo?: () => void; // free drawing can be left; "Otra cosa" inside a story returns to it
}

// Drawing canvas (GDD §10): 12 colors, 3 sizes, eraser and undo. Used for "Otra cosa" in stories
// and for the free drawing. Records every stroke with its timing; the drawing is the only free content.
export class Dibujo extends Phaser.Scene {
  private d!: DatosDibujo;
  private trazos: Trazo[] = [];
  private actual: Trazo | null = null;
  private color = COLORES[0];
  private grosor = GROSORES[1];
  private goma = false;
  private deshechos = 0;
  private t0 = 0;
  private hoja!: Phaser.Geom.Rectangle;
  private lienzo!: Phaser.GameObjects.Graphics;

  constructor() {
    super("Dibujo");
  }

  create(d: DatosDibujo) {
    this.d = d;
    this.trazos = [];
    this.deshechos = 0;
    this.goma = false;
    this.t0 = performance.now();
    this.armar();
    hablar("cuento.dibujar", d.consigna);
    this.scale.on("resize", this.armar, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.armar, this));

    this.input.on("pointerdown", (p: Phaser.Input.Pointer, encima: Phaser.GameObjects.GameObject[]) => {
      if (encima.length || !this.hoja.contains(p.x, p.y)) return;
      this.actual = { color: this.color, grosor: this.grosor, goma: this.goma, puntos: [this.punto(p)] };
      this.trazos.push(this.actual);
      this.pintar();
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.actual || !p.isDown) return;
      this.actual.puntos.push(this.punto(p));
      this.pintar();
    });
    this.input.on("pointerup", () => (this.actual = null));
  }

  // Points are stored relative to the sheet (0 to 1) so the drawing survives a screen rotation.
  private punto(p: Phaser.Input.Pointer): [number, number, number] {
    const h = this.hoja;
    return [+((p.x - h.x) / h.width).toFixed(4), +((p.y - h.y) / h.height).toFixed(4), Math.round(performance.now() - this.t0)];
  }

  private armar() {
    this.children.removeAll(true);
    const { width: w, height: h } = this.scale;
    this.cameras.main.setSize(w, h);
    this.add.rectangle(0, 0, w, h, 0xe8dcc6).setOrigin(0);
    const horizontal = w > h;
    const barra = horizontal ? 90 : 120;
    const libreW = horizontal ? w - barra - 24 : w - 24;
    const libreH = horizontal ? h - 50 : h - barra - 60;
    const hw = Math.min(libreW, (libreH * 4) / 3);
    const hh = (hw * 3) / 4;
    const hx = horizontal ? 12 : (w - hw) / 2;
    const hy = 40;
    this.hoja = new Phaser.Geom.Rectangle(hx, hy, hw, hh);
    this.add.rectangle(hx, hy, hw, hh, PAPEL).setOrigin(0).setStrokeStyle(2, 0x7a5c4f);
    this.lienzo = this.add.graphics();
    texto(this, w / 2, 20, this.d.consigna, 13, w - 80);

    // Tools: colors, sizes, eraser, undo, done.
    const bx = horizontal ? hx + hw + 12 : 12;
    const by = horizontal ? hy : hy + hh + 12;
    const cols = horizontal ? 2 : 12;
    COLORES.forEach((c, i) => {
      const x = bx + 18 + (i % cols) * 36;
      const y = by + 18 + Math.floor(i / cols) * 36;
      const r = this.add.rectangle(x, y, 28, 28, c).setStrokeStyle(c === this.color && !this.goma ? 4 : 2, c === this.color && !this.goma ? 0xf2c14e : 0x2b2233);
      r.setInteractive({ useHandCursor: true }).on("pointerup", () => ((this.color = c), (this.goma = false), this.armar()));
    });
    const fila = horizontal ? by + 18 + 6 * 36 : by + 18 + 36;
    GROSORES.forEach((g, i) => {
      const x = bx + 18 + i * 36;
      const marco = this.add.rectangle(x, fila, 30, 30, 0xffffff).setStrokeStyle(this.grosor === g ? 4 : 2, this.grosor === g ? 0xf2c14e : 0x2b2233);
      this.add.circle(x, fila, g / 2 + 1, 0x1d1a24);
      marco.setInteractive({ useHandCursor: true }).on("pointerup", () => ((this.grosor = g), this.armar()));
    });
    const herramientas = horizontal ? fila + 40 : fila;
    const hx0 = horizontal ? bx + 18 : bx + 18 + 3 * 36 + 10;
    new Boton(this, hx0, herramientas, { ancho: 32, alto: 32, imagen: "interfaz/boton_borrar" }, () => ((this.goma = !this.goma), this.armar())).elegir(this.goma);
    new Boton(this, hx0 + 38, herramientas, { ancho: 32, alto: 32, imagen: "interfaz/boton_deshacer" }, () => {
      if (this.trazos.pop()) this.deshechos++;
      this.pintar();
    });
    const T = contenido.textos.cuento;
    new Boton(this, w - 60, h - 24, { ancho: 100, alto: 32, etiqueta: T.listo, voz: { clave: "cuento.listo", texto: T.listo } }, () => this.terminar());
    if (this.d.ahoraNo)
      new Boton(this, 66, h - 24, { ancho: 110, alto: 32, etiqueta: T.boton_ahora_no, imagen: "interfaz/boton_ahora_no" }, () => {
        registrar("ahora_no", { actividad: this.d.origen });
        void hablar("cuento.ahora_no", T.ahora_no);
        this.scene.stop();
        this.d.ahoraNo!();
      });
    this.pintar();
  }

  private pintar() {
    const g = this.lienzo.clear();
    const h = this.hoja;
    for (const t of this.trazos) {
      g.lineStyle(t.goma ? t.grosor * 2 : t.grosor, t.goma ? PAPEL : t.color, 1);
      g.fillStyle(t.goma ? PAPEL : t.color, 1);
      const pts = t.puntos.map(([x, y]) => new Phaser.Math.Vector2(h.x + x * h.width, h.y + y * h.height));
      if (pts.length === 1) g.fillCircle(pts[0].x, pts[0].y, (t.goma ? t.grosor * 2 : t.grosor) / 2);
      else g.strokePoints(pts, false, true);
    }
  }

  private terminar() {
    const h = this.hoja;
    const datos = { origen: this.d.origen, trazos: this.trazos.map((t) => ({ ...t, color: `#${t.color.toString(16).padStart(6, "0")}` })), deshechos: this.deshechos, ms: Math.round(performance.now() - this.t0) };
    const cerrar = (imagen: string | null) => {
      registrar("dibujo", { ...datos, imagen });
      this.scene.stop();
      this.d.alTerminar(imagen);
    };
    if (!this.trazos.length) return cerrar(null);
    this.game.renderer.snapshotArea(h.x, h.y, h.width, h.height, (img) => cerrar((img as HTMLImageElement).src));
  }
}
