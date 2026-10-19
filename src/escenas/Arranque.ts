import Phaser from "phaser";
import contenido from "virtual:contenido";
import { cargarArte, totalPiezas } from "../arte";
import { cargarEstado } from "../datos/guardado";
import { registrar, preguntado } from "../datos/eventos";

// Loads every piece of art from the manifest and the saved game, then goes to the child's yes,
// to character creation, or back to where the child was.
export class Arranque extends Phaser.Scene {
  private t0 = 0;

  constructor() {
    super("Arranque");
  }

  preload() {
    this.t0 = performance.now();
    const barra = this.add.rectangle(this.scale.width / 2 - 100, this.scale.height / 2, 0, 6, 0xf2c14e).setOrigin(0, 0.5);
    this.load.on("progress", (v: number) => (barra.width = 200 * v));
    this.load.on("loaderror", (f: Phaser.Loader.File) => registrar("error", { mensaje: `no cargó ${f.src}` }));
    for (const lugar of contenido.lugares) this.load.tilemapTiledJSON(lugar, `mapas/${lugar}.json`);
    cargarArte(this);
  }

  async create() {
    registrar("carga", { que: "arte", piezas: totalPiezas, ms: Math.round(performance.now() - this.t0) });
    // Collision grid for Tiled maps; only drawn in debug mode.
    const rejilla = this.textures.createCanvas("rejilla", 32 * 5, 32)!;
    rejilla.context.fillStyle = "rgba(200,40,40,0.5)";
    rejilla.context.fillRect(0, 0, 32 * 5, 32);
    rejilla.refresh();
    const estado = await cargarEstado();
    if (!preguntado()) this.scene.start("Asentimiento");
    else if (!estado.creado) this.scene.start("Creacion", { modo: "inicio" });
    else if (!estado.casaLista) this.scene.start("ArmarCasa");
    else this.scene.start("Mundo", estado);
  }
}
