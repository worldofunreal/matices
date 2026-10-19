import contenido from "virtual:contenido";
import { Boton, texto } from "../../ui/ui";
import { hablar } from "../../ui/voz";
import { estado } from "../../datos/guardado";
import { Actividad } from "./base";

const LINEAS = contenido.textos.actividades.cuentera;

// Day 1 in the library: La Cuentera introduces herself, her book and "Ahora no".
export class ConocerCuentera extends Actividad {
  private i = 0;

  constructor() {
    super("ConocerCuentera");
  }

  protected empezar() {
    this.i = 0;
    this.decir();
  }

  private linea() {
    return LINEAS[this.i].replaceAll("{nombre}", estado().nombre);
  }

  private decir() {
    void hablar(`actividades.cuentera.${this.i}`, this.linea());
  }

  protected dibujar(z: { x: number; y: number; w: number; h: number }, abajo: number) {
    this.add.image(z.x + z.w / 2, z.y + z.h * 0.35, "personajes/retrato_cuentera_contento");
    texto(this, z.x + z.w / 2, z.y + z.h * 0.75, this.linea(), 14, z.w - 40);
    new Boton(this, z.x + z.w - 14, z.y + 14, { ancho: 32, alto: 32, imagen: "interfaz/boton_volver_a_escuchar" }, () => this.decir());
    new Boton(this, z.x + z.w - 30, abajo, { ancho: 40, alto: 32, imagen: "interfaz/boton_flecha_der" }, () => {
      if (this.i >= LINEAS.length - 1) return this.cerrar("terminado");
      this.i++;
      this.armar();
      this.decir();
    });
  }
}
