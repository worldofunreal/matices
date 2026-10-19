import Phaser from "phaser";
import contenido from "virtual:contenido";
import { Boton, marco, texto } from "../../ui/ui";
import { hablar } from "../../ui/voz";
import { estado } from "../../datos/guardado";
import { registrar } from "../../datos/eventos";

const T = contenido.textos.actividades;
const CICLO = 4000; // one breath: up and down

export interface DatosCalma {
  modo: "calma" | "aterrizaje";
  final: boolean; // last day: a different goodbye
  alTerminar: () => void;
}

// Calm at the start of each day (breathing with a candle that grows and shrinks; it can be skipped)
// and landing at the end (watering the patio plants and saying goodbye to La Cuentera). GDD §10.
export class Calma extends Phaser.Scene {
  private d!: DatosCalma;
  private t0 = 0;
  private regadas = new Set<number>();

  constructor() {
    super("Calma");
  }

  create(d: DatosCalma) {
    this.d = d;
    this.t0 = performance.now();
    this.regadas = new Set();
    this.armar();
    void hablar(`actividades.${d.modo}.texto`, T[d.modo].texto);
    this.scale.on("resize", this.armar, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.armar, this));
  }

  private armar() {
    this.children.removeAll(true);
    const { width: w, height: h } = this.scale;
    this.cameras.main.setSize(w, h);
    this.add.rectangle(0, 0, w, h, 0x1d1a24, 0.55).setOrigin(0).setInteractive();
    const ancho = Math.min(w - 24, 420);
    const alto = Math.min(h - 24, 320);
    marco(this, w / 2, h / 2, ancho, alto, "interfaz/marco_libro");
    const arriba = h / 2 - alto / 2;
    texto(this, w / 2, arriba + 30, T[this.d.modo].texto, 13, ancho - 40);
    if (this.d.modo === "calma") {
      const vela = this.add.image(w / 2, h / 2 + 10, "interfaz/vela").setScale(2);
      this.tweens.add({ targets: vela, scale: 3, duration: CICLO / 2, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else {
      [-1, 0, 1].forEach((k) => {
        const planta = this.add.image(w / 2 + k * 80, h / 2 + 20, "lugares/casa/maceta").setScale(this.regadas.has(k) ? 2.4 : 1.8);
        planta.setInteractive({ useHandCursor: true }).on("pointerup", () => this.regar(k));
      });
    }
    new Boton(this, w / 2 + ancho / 2 - 60, h / 2 + alto / 2 - 26, { ancho: 100, alto: 32, etiqueta: T.calma.seguir, voz: { clave: "actividades.calma.seguir", texto: T.calma.seguir } }, () => this.terminar());
  }

  private regar(k: number) {
    this.regadas.add(k);
    this.armar();
    if (this.regadas.size === 3) this.terminar();
  }

  private terminar() {
    const ms = Math.round(performance.now() - this.t0);
    if (this.d.modo === "calma") registrar("calma", { dia: estado().dia, ms, respiraciones: Math.floor(ms / CICLO) });
    else registrar("aterrizaje", { dia: estado().dia, regadas: this.regadas.size, ms });
    const cerrar = () => {
      this.scene.stop();
      this.d.alTerminar();
    };
    if (this.d.modo === "calma") return cerrar();
    const adios = (this.d.final ? T.aterrizaje.adios_final : T.aterrizaje.adios).replaceAll("{nombre}", estado().nombre);
    this.children.removeAll(true);
    const { width: w, height: h } = this.scale;
    this.add.rectangle(0, 0, w, h, 0x1d1a24, 0.55).setOrigin(0);
    this.add.image(w / 2, h / 2 - 30, "personajes/retrato_cuentera_contento");
    texto(this, w / 2, h / 2 + 50, adios, 14, w - 60).setColor("#f4ecdc");
    void hablar(this.d.final ? "actividades.aterrizaje.adios_final" : "actividades.aterrizaje.adios", adios).then(() => this.time.delayedCall(600, cerrar));
  }
}
