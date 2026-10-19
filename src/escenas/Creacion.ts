import Phaser from "phaser";
import contenido from "virtual:contenido";
import arte from "virtual:arte";
import { Boton, texto } from "../ui/ui";
import { hablar, callar } from "../ui/voz";
import { Protagonista, type Apariencia } from "../personaje/Protagonista";
import { Retrato } from "../personaje/Retrato";
import { estado, cambiarEstado } from "../datos/guardado";
import { registrar } from "../datos/eventos";

const T = contenido.textos.creacion;
type Paso = keyof typeof T.pasos;
type Modo = "inicio" | "espejo";

const CABELLOS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"];
const que = (id: string) => arte.piezas.find((p) => p.id === id)?.que ?? id;
const colorMedio = (rampa: "piel" | "cabello" | "mochila", i: number) => Phaser.Display.Color.HexStringToColor(arte.colores[rampa].variantes[i][1]).color;

interface Opcion {
  clave: string; // voice key and event value
  etiqueta?: string;
  muestra?: number;
  elegida: () => boolean;
  elegir: () => void;
}

// Character creation (GDD §6). Also opened from the mirror in the house to change the character.
export class Creacion extends Phaser.Scene {
  private modo: Modo = "inicio";
  private a!: Apariencia;
  private nombre = "";
  private paso = 0;
  private ordenPiel: number[] = [];
  private paginaNombres = 0;
  private toques = 0;
  private t0 = 0;
  private entrada: HTMLInputElement | null = null;

  constructor() {
    super("Creacion");
  }

  create(datos: { modo: Modo }) {
    this.modo = datos.modo;
    this.a = structuredClone(estado().apariencia);
    this.nombre = estado().nombre;
    this.paso = 0;
    this.toques = 0;
    this.t0 = performance.now();
    // Skin tones in a new random order each time, so the first one is never "the normal one".
    this.ordenPiel = Phaser.Utils.Array.Shuffle([...arte.colores.piel.variantes.keys()]);
    this.cameras.main.setBackgroundColor("#e8dcc6");
    this.armar();
    this.decir(this.modo === "inicio" ? T.inicio : T.espejo, `creacion.${this.modo}`);
    this.scale.on("resize", this.armar, this);
    this.events.once("shutdown", () => {
      this.scale.off("resize", this.armar, this);
      this.quitarEntrada();
    });
  }

  private pasos(): Paso[] {
    const p: Paso[] = ["cuerpo", "piel", "cabello", "color_cabello", "ropa", "extras"];
    if (this.a.extras.includes("mochila")) p.push("color_mochila");
    p.push("nombre");
    return p;
  }

  private decir(texto: string, clave: string) {
    hablar(clave, texto.replaceAll("{nombre}", this.nombre));
  }

  private opciones(paso: Paso): Opcion[] {
    const a = this.a;
    const unica = <K extends keyof Apariencia>(k: K, v: Apariencia[K]) => ({ elegida: () => a[k] === v, elegir: () => (a[k] = v) });
    switch (paso) {
      case "cuerpo":
        return (["nina", "nino", "neutro"] as const).map((c) => ({ clave: c, etiqueta: T.cuerpo[c], ...unica("cuerpo", c) }));
      case "piel":
        return this.ordenPiel.map((i) => ({ clave: `piel_${i + 1}`, etiqueta: T.piel.replace("{n}", String(i + 1)), muestra: colorMedio("piel", i), ...unica("piel", i) }));
      case "cabello":
        return CABELLOS.map((c) => ({ clave: `cabello_${c}`, etiqueta: que(`personaje/cabello_${c}`), ...unica("cabello", c) }));
      case "color_cabello":
        return arte.colores.cabello.variantes.map((_, i) => ({ clave: `color_cabello_${i + 1}`, etiqueta: T.color_cabello.replace("{n}", String(i + 1)), muestra: colorMedio("cabello", i), ...unica("colorCabello", i) }));
      case "color_mochila":
        return arte.colores.mochila.variantes.map((_, i) => ({ clave: `color_mochila_${i + 1}`, etiqueta: T.color_mochila.replace("{n}", String(i + 1)), muestra: colorMedio("mochila", i), ...unica("colorMochila", i) }));
      case "ropa":
        return (["uniforme_pantalon", "uniforme_falda", "casa"] as const).map((r) => ({
          clave: r,
          etiqueta: T.ropa[r],
          elegida: () => (r === "casa" ? a.ropa === "casa" : a.ropa === "uniforme" && a.abajo === r.split("_")[1]),
          elegir: () => {
            a.ropa = r === "casa" ? "casa" : "uniforme";
            if (r !== "casa") a.abajo = r.split("_")[1] as Apariencia["abajo"];
          },
        }));
      case "extras":
        return (["lentes", "aretes", "gorra", "mochila"] as const).map((e) => ({
          clave: e,
          etiqueta: T.extras[e],
          elegida: () => a.extras.includes(e),
          elegir: () => (a.extras = a.extras.includes(e) ? a.extras.filter((x) => x !== e) : [...a.extras, e]),
        }));
      case "nombre":
        return T.nombres.map((n) => ({ clave: n.normalize("NFD").replace(/[^a-zA-Z]/g, "").toLowerCase(), etiqueta: n, elegida: () => this.nombre === n, elegir: () => (this.nombre = n) }));
    }
  }

  // Layout for any screen: preview beside the options when wide, above them when tall.
  private armar() {
    this.quitarEntrada();
    this.children.removeAll(true);
    const { width: w, height: h } = this.scale;
    this.cameras.main.setSize(w, h);
    const ancho = w > h;
    const vista = ancho ? { x: 0, y: 0, w: Math.floor(w * 0.38), h } : { x: 0, y: 0, w, h: Math.floor(h * 0.36) };
    const zona = ancho ? { x: vista.w, y: 0, w: w - vista.w, h } : { x: 0, y: vista.h, w, h: h - vista.h };

    // Preview: walking character at the largest whole scale that fits, and the portrait.
    const escala = Math.max(1, Math.min(4, Math.floor(Math.min(vista.w / 2 / 32, (vista.h - 20) / 48))));
    const prota = new Protagonista(this, vista.x + vista.w * (ancho ? 0.5 : 0.32), vista.y + vista.h / 2 + (48 * escala) / 2 - (ancho ? 50 : 0), this.a);
    prota.setScale(escala);
    prota.mover(0, 1);
    const retrato = new Retrato(this, vista.x + vista.w * (ancho ? 0.5 : 0.72), ancho ? vista.y + vista.h / 2 + 90 : vista.y + vista.h / 2, this.a);
    if (ancho && vista.h < 360) retrato.setVisible(false);

    const pasos = this.pasos();
    const paso = pasos[Math.min(this.paso, pasos.length - 1)];
    const pregunta = T.pasos[paso];
    const titulo = texto(this, zona.x + zona.w / 2, zona.y + 22, pregunta, 14, zona.w - 70);
    new Boton(this, zona.x + zona.w - 22, zona.y + 22, { ancho: 32, alto: 32, imagen: "interfaz/boton_volver_a_escuchar" }, () => this.decir(pregunta, `creacion.pasos.${paso}`));

    // Options grid.
    const ops = this.opciones(paso);
    const bw = paso === "nombre" ? 84 : 130;
    const bh = 30;
    const cols = Math.max(1, Math.floor((zona.w - 16) / (bw + 8)));
    const arriba = titulo.y + titulo.height / 2 + 12;
    const abajo = zona.y + zona.h - 50;
    const filas = Math.max(1, Math.floor((abajo - arriba) / (bh + 8)));
    let visibles = ops;
    let extra: Opcion[] = [];
    if (paso === "nombre") {
      const porPagina = Math.max(1, cols * filas - 2);
      const paginas = Math.ceil(ops.length / porPagina);
      this.paginaNombres %= paginas;
      visibles = ops.slice(this.paginaNombres * porPagina, (this.paginaNombres + 1) * porPagina);
      extra = [
        { clave: "escribir_nombre", etiqueta: T.escribir_nombre, elegida: () => !!this.nombre && !T.nombres.includes(this.nombre), elegir: () => this.pedirNombre() },
        ...(paginas > 1 ? [{ clave: "mas_nombres", etiqueta: "…", elegida: () => false, elegir: () => (this.paginaNombres++, this.armar()) }] : []),
      ];
    }
    const todas = [...visibles, ...extra];
    const usadasCols = Math.min(cols, todas.length);
    const x0 = zona.x + zona.w / 2 - (usadasCols * (bw + 8) - 8) / 2 + bw / 2;
    const botones = todas.map((o, i) => {
      const b = new Boton(
        this,
        x0 + (i % cols) * (bw + 8),
        arriba + bh / 2 + Math.floor(i / cols) * (bh + 8),
        { ancho: bw, alto: bh, etiqueta: o.etiqueta, muestra: o.muestra, voz: o.etiqueta ? { clave: `creacion.${paso}.${o.clave}`, texto: o.etiqueta } : undefined },
        () => {
          this.toques++;
          o.elegir();
          if (o.clave !== "mas_nombres" && o.clave !== "escribir_nombre") this.refrescar(prota, retrato, botones, todas);
        },
      );
      return b.elegir(o.elegida());
    });

    // Back / next. The last step finishes only with a name.
    const y = zona.y + zona.h - 24;
    if (this.paso > 0) new Boton(this, zona.x + 30, y, { ancho: 40, alto: 32, imagen: "interfaz/boton_flecha_izq" }, () => this.ir(-1));
    const ultimo = this.paso >= pasos.length - 1;
    new Boton(
      this,
      zona.x + zona.w - (ultimo ? 60 : 30),
      y,
      ultimo ? { ancho: 100, alto: 32, etiqueta: T.listo, voz: { clave: "creacion.listo", texto: T.listo } } : { ancho: 40, alto: 32, imagen: "interfaz/boton_flecha_der" },
      () => (ultimo ? this.terminar() : this.ir(1)),
    );
  }

  private refrescar(prota: Protagonista, retrato: Retrato, botones: Boton[], ops: Opcion[]) {
    prota.vestir(this.a);
    prota.mover(0, 1);
    retrato.vestir(this.a);
    botones.forEach((b, i) => b.elegir(ops[i].elegida()));
    // Choosing or removing the backpack adds or removes its color step.
    const nPasos = this.pasos().length;
    if (this.paso >= nPasos) this.paso = nPasos - 1;
  }

  private ir(d: number) {
    this.paso = Phaser.Math.Clamp(this.paso + d, 0, this.pasos().length - 1);
    this.armar();
    const paso = this.pasos()[this.paso];
    this.decir(T.pasos[paso], `creacion.pasos.${paso}`);
  }

  // Typing a name: a real text field over the game, so phone keyboards work.
  private pedirNombre() {
    this.quitarEntrada();
    const e = document.createElement("input");
    e.maxLength = 14;
    e.value = T.nombres.includes(this.nombre) ? "" : this.nombre;
    e.setAttribute("aria-label", T.pasos.nombre);
    Object.assign(e.style, { position: "fixed", left: "50%", top: "40%", transform: "translate(-50%,-50%)", fontSize: "20px", padding: "8px 12px", borderRadius: "8px", border: "3px solid #7a5c4f", width: "220px", textAlign: "center" });
    document.body.append(e);
    e.focus();
    const listo = () => {
      const limpio = e.value.replace(/[^\p{L} ]/gu, "").trim();
      if (limpio) this.nombre = limpio;
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

  private terminar() {
    if (!this.nombre) return this.decir(T.pasos.nombre, "creacion.pasos.nombre");
    callar();
    const { cuerpo, piel, cabello, colorCabello, ropa, abajo, extras, colorMochila } = this.a;
    // The name never goes into an event (GDD §6).
    registrar("personaje", {
      momento: this.modo,
      cuerpo,
      tono: piel + 1,
      orden_tonos: this.ordenPiel.map((i) => i + 1),
      cabello,
      color_cabello: colorCabello + 1,
      ropa: ropa === "uniforme" ? `uniforme_${abajo}` : "casa",
      extras,
      color_mochila: extras.includes("mochila") ? colorMochila + 1 : null,
      nombre_de_lista: T.nombres.includes(this.nombre),
      toques: this.toques,
      ms: Math.round(performance.now() - this.t0),
    });
    cambiarEstado({ apariencia: this.a, nombre: this.nombre, creado: true }, true);
    if (!estado().casaLista) this.scene.start("ArmarCasa");
    else this.scene.start("Mundo", estado());
  }
}
