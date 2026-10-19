import Phaser from "phaser";
import contenido from "virtual:contenido";
import { variante } from "../../arte";
import { Boton, Tarjeta, texto } from "../../ui/ui";
import { hablar } from "../../ui/voz";
import { personasDeCasa, nombreDe, codigoDe } from "../../datos/casa";
import { registrar, semilla } from "../../datos/eventos";
import { Actividad } from "./base";

const E = contenido.escena;
const T = contenido.textos;
type Carta = { codigo: string; etiqueta: string; imagen?: string };

// Day 2 in the library: an ambiguous picture (TAT/CAT style, our own drawing). The child says what
// is happening, how the character feels and who the other plate is for (GDD §10).
export class Describir extends Actividad {
  private paso = 0;
  private cartas: Carta[][] = [];
  private marcada: string | null = null;
  private elegidas: string[] = [];
  private finVoz = 0;

  constructor() {
    super("Describir");
  }

  protected empezar() {
    const rng = new Phaser.Math.RandomDataGenerator([`${semilla()}-${E.id}`]);
    const noSe = { codigo: "NO_SE", etiqueta: T.cuento.no_se, imagen: "interfaz/no_se" };
    const casa = personasDeCasa().map((f) => ({ codigo: codigoDe(f), etiqueta: nombreDe(f), imagen: variante(this, `figuras/retrato_${f.figura}`, { piel: f.piel }) }));
    this.cartas = [
      [...rng.shuffle(E.titulos.map(([codigo, t]) => ({ codigo, etiqueta: t, imagen: `iconos/${codigo.toLowerCase()}` }))), noSe],
      E.emociones.map((e) => ({ codigo: e.toUpperCase(), etiqueta: T.actividades.describir.emociones[e], imagen: e === "no_se" ? "interfaz/no_se" : undefined })),
      [...rng.shuffle(E.platos.includes("casa") ? casa : []), ...(E.platos.includes("nadie") ? [{ codigo: "NADIE", etiqueta: T.cuento.nadie, imagen: "interfaz/persona_nadie" }] : []), noSe],
    ];
    this.paso = 0;
    this.elegidas = [];
    this.marcada = null;
    void this.decir(`${T.actividades.describir.inicio} ${E.pregunta_titulo}`);
  }

  private pregunta() {
    return [E.pregunta_titulo, E.pregunta_emocion, E.pregunta_platos][this.paso];
  }

  private async decir(linea = this.pregunta()) {
    this.finVoz = Number.POSITIVE_INFINITY;
    await hablar(`escena.${E.id}.${this.paso}`, linea);
    this.finVoz = performance.now();
  }

  private tocar(c: Carta) {
    if (this.marcada !== c.codigo) {
      this.marcada = c.codigo;
      void hablar("escena.carta", c.etiqueta);
      return this.armar();
    }
    this.elegidas.push(c.codigo);
    registrar("describe_paso", { escena: E.id, paso: ["titulo", "emocion", "plato"][this.paso], opciones: this.cartas[this.paso].map((x) => x.codigo), elegida: c.codigo, ms_decidir: Number.isFinite(this.finVoz) ? Math.round(performance.now() - this.finVoz) : null });
    this.marcada = null;
    if (++this.paso < 3) {
      this.armar();
      return void this.decir();
    }
    const [titulo, emocion, plato] = this.elegidas;
    registrar("describe", { escena: E.id, titulo, emocion, plato, ms: Math.round(performance.now() - this.t0) });
    this.cerrar("terminado");
  }

  protected dibujar(z: { x: number; y: number; w: number; h: number }, abajo: number) {
    const img = this.add.image(z.x + z.w / 2, z.y, "ilustraciones/escena_d01").setOrigin(0.5, 0);
    const alto = Math.min(z.h * 0.42, 240);
    img.setScale(alto / img.height);
    const t = texto(this, z.x + z.w / 2, z.y + alto + 16, this.pregunta(), 13, z.w - 60);
    new Boton(this, z.x + z.w - 14, z.y + 14, { ancho: 32, alto: 32, imagen: "interfaz/boton_volver_a_escuchar" }, () => {
      registrar("repetir_voz", { pantalla: `${E.id}.${this.paso}` });
      void this.decir();
    });
    const cartas = this.cartas[this.paso];
    const top = t.y + t.height / 2 + 8;
    const disp = { w: z.w, h: abajo - 24 - top };
    const cols = Math.min(cartas.length, Math.max(1, Math.floor(disp.w / 96)));
    const filas = Math.ceil(cartas.length / cols);
    const cw = Math.min(110, (disp.w - (cols - 1) * 6) / cols);
    const ch = Math.min(cw * 1.2, (disp.h - (filas - 1) * 6) / filas);
    cartas.forEach((c, i) => {
      const fila = Math.floor(i / cols);
      const enFila = Math.min(cols, cartas.length - fila * cols);
      const x0 = z.x + z.w / 2 - (enFila * (cw + 6) - 6) / 2 + cw / 2;
      new Tarjeta(this, x0 + (i % cols) * (cw + 6), top + ch / 2 + fila * (ch + 6), { ancho: cw, alto: ch, etiqueta: c.etiqueta, imagen: c.imagen }, () => this.tocar(c)).marcar(this.marcada === c.codigo);
    });
    new Boton(this, z.x + 54, abajo, { ancho: 110, alto: 32, etiqueta: T.cuento.boton_ahora_no, imagen: "interfaz/boton_ahora_no" }, () => {
      registrar("ahora_no", { actividad: this.id, paso: this.paso });
      void hablar("cuento.ahora_no", T.cuento.ahora_no);
      this.cerrar("ahora_no", 1600);
    });
  }
}
