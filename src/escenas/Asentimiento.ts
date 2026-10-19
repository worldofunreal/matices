import Phaser from "phaser";
import contenido from "virtual:contenido";
import { Boton, marco, texto } from "../ui/ui";
import { hablar } from "../ui/voz";
import { fijarRegistro } from "../datos/eventos";

const T = contenido.textos.asentimiento;

// The child's own yes, before anything is recorded (docs/legal/consentimiento-y-datos.md, step 3).
// "Ahora no" plays the same game with nothing recorded, so nobody can tell the difference.
export class Asentimiento extends Phaser.Scene {
  constructor() {
    super("Asentimiento");
  }

  create() {
    const leer = () => hablar("asentimiento.texto", this.mensaje());
    this.armar(leer);
    this.scale.on("resize", () => this.scene.isActive() && this.armar(leer), this);
    this.events.once("shutdown", () => this.scale.off("resize", undefined, this));
    leer(); // some browsers only speak after the first tap; the replay button covers that
  }

  private mensaje() {
    return T.texto.replaceAll("{psicologo}", T.psicologo_prueba);
  }

  private armar(leer: () => void) {
    this.children.removeAll(true);
    const { width: w, height: h } = this.scale;
    this.cameras.main.setSize(w, h);
    const ancho = Math.min(w - 24, 420);
    const cuerpo = texto(this, 0, 0, this.mensaje(), 13, ancho - 40);
    const alto = cuerpo.height + 130;
    marco(this, w / 2, h / 2, ancho, alto);
    cuerpo.setPosition(w / 2, h / 2 - alto / 2 + 44 + cuerpo.height / 2).setDepth(1);
    new Boton(this, w / 2 + ancho / 2 - 26, h / 2 - alto / 2 + 22, { ancho: 32, alto: 32, imagen: "interfaz/boton_volver_a_escuchar" }, leer);
    const y = h / 2 + alto / 2 - 34;
    const bw = Math.min(150, (ancho - 40) / 2);
    new Boton(this, w / 2 - bw / 2 - 8, y, { ancho: bw, alto: 36, etiqueta: T.si, voz: { clave: "asentimiento.si", texto: T.si }, tamTexto: 13 }, () => this.responder(true));
    new Boton(this, w / 2 + bw / 2 + 8, y, { ancho: bw, alto: 36, etiqueta: T.no, voz: { clave: "asentimiento.no", texto: T.no }, tamTexto: 13 }, () => this.responder(false));
  }

  private async responder(si: boolean) {
    await fijarRegistro(si);
    this.scene.start("Creacion", { modo: "inicio" });
  }
}
