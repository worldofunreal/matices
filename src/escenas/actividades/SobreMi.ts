import Phaser from "phaser";
import contenido from "virtual:contenido";
import { Boton, marco, texto } from "../../ui/ui";
import { hablar } from "../../ui/voz";
import { registrar, semilla } from "../../datos/eventos";
import { Actividad } from "./base";

const S = contenido.sobreMi;
const T = contenido.textos.actividades.sobre_mi;
type Frase = (typeof S.frases)[number];
type Respuesta = "A" | "B" | "AMBOS" | "AHORA_NO";

// Day 3 in the library: "Sobre mí" (GDD §8, §10). Two identical kittens each say one of two
// opposite sentences; the child picks the one they are like, both, or "Ahora no". Which kitten says
// which side is shuffled per sentence with the child's seed, so a side never means a twin.
export class SobreMi extends Actividad {
  private frases: { f: Frase; titoDice: "a" | "b" }[] = [];
  private i = -1; // -1: La Cuentera's warning that this is not a story
  private marcado: "tito" | "tita" | null = null;
  private finVoz = 0;

  constructor() {
    super("SobreMi");
  }

  protected empezar() {
    const rng = new Phaser.Math.RandomDataGenerator([`${semilla()}-sobre-mi`]);
    this.frases = rng.shuffle([...S.frases]).map((f) => ({ f, titoDice: rng.frac() < 0.5 ? "a" : "b" }));
    this.i = -1;
    this.marcado = null;
    void hablar("sobre_mi.aviso", S.aviso);
  }

  private dice(quien: "tito" | "tita") {
    const { f, titoDice } = this.frases[this.i];
    const lado = quien === "tito" ? titoDice : titoDice === "a" ? "b" : "a";
    return { lado, texto: f[lado] };
  }

  private async leer() {
    this.finVoz = Number.POSITIVE_INFINITY;
    await hablar(`sobre_mi.${this.frases[this.i].f.id}.tito`, `Tito: ${this.dice("tito").texto}`);
    await hablar(`sobre_mi.${this.frases[this.i].f.id}.tita`, `Tita: ${this.dice("tita").texto}`);
    this.finVoz = performance.now();
  }

  private responder(r: Respuesta) {
    const { f, titoDice } = this.frases[this.i];
    registrar("sobre_mi", { frase: f.id, area: f.area, respuesta: r, tito_dice: titoDice.toUpperCase(), orden: this.i + 1, ms_decidir: Number.isFinite(this.finVoz) ? Math.round(performance.now() - this.finVoz) : null });
    this.siguiente();
  }

  private elegir(quien: "tito" | "tita") {
    if (this.marcado !== quien) {
      this.marcado = quien;
      void hablar(`sobre_mi.${this.frases[this.i].f.id}.${quien}`, this.dice(quien).texto);
      return this.armar();
    }
    this.responder(this.dice(quien).lado.toUpperCase() as Respuesta);
  }

  private siguiente() {
    this.marcado = null;
    if (++this.i >= this.frases.length) {
      void hablar("sobre_mi.fin", T.fin);
      return this.cerrar("terminado", 1500);
    }
    this.armar();
    void this.leer();
  }

  protected dibujar(z: { x: number; y: number; w: number; h: number }, abajo: number) {
    if (this.i < 0) {
      this.add.image(z.x + z.w / 2, z.y + z.h * 0.3, "personajes/retrato_cuentera_neutral");
      texto(this, z.x + z.w / 2, z.y + z.h * 0.65, S.aviso, 14, z.w - 40);
      new Boton(this, z.x + z.w - 30, abajo, { ancho: 40, alto: 32, imagen: "interfaz/boton_flecha_der" }, () => this.siguiente());
      return;
    }
    const horizontal = z.w > z.h;
    const lados = ["tito", "tita"] as const;
    lados.forEach((quien, k) => {
      const cx = horizontal ? z.x + z.w * (k ? 0.73 : 0.27) : z.x + z.w / 2;
      const cy = horizontal ? z.y + z.h * 0.42 : z.y + z.h * (k ? 0.66 : 0.24);
      const ancho = horizontal ? z.w * 0.42 : z.w - 20;
      const alto = horizontal ? z.h * 0.75 : z.h * 0.4;
      const m = marco(this, cx, cy, ancho, alto);
      if (this.marcado === quien) this.add.rectangle(cx, cy, ancho - 2, alto - 2).setStrokeStyle(4, 0xf2c14e);
      this.add.image(cx, cy - alto / 2 + 56, `personajes/retrato_${quien}_neutral`);
      texto(this, cx, cy + 30, this.dice(quien).texto, 13, ancho - 24);
      m.setInteractive({ useHandCursor: true }).on("pointerup", () => this.elegir(quien));
    });
    new Boton(this, z.x + z.w / 2, abajo, { ancho: 100, alto: 32, etiqueta: T.los_dos, voz: { clave: "sobre_mi.los_dos", texto: T.los_dos } }, () => this.responder("AMBOS"));
    new Boton(this, z.x + 54, abajo, { ancho: 110, alto: 32, etiqueta: T.ahora_no, imagen: "interfaz/boton_ahora_no" }, () => this.responder("AHORA_NO"));
    new Boton(this, z.x + z.w - 14, z.y + 14, { ancho: 32, alto: 32, imagen: "interfaz/boton_volver_a_escuchar" }, () => {
      registrar("repetir_voz", { pantalla: `sobre_mi.${this.frases[this.i].f.id}` });
      void this.leer();
    });
  }
}
