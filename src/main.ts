import Phaser from "phaser";
import { Arranque } from "./escenas/Arranque";
import { Mundo } from "./escenas/Mundo";
import { Asentimiento } from "./escenas/Asentimiento";
import { Creacion } from "./escenas/Creacion";
import { ArmarCasa } from "./escenas/ArmarCasa";
import { Interfaz } from "./escenas/Interfaz";
import { Cuento } from "./escenas/Cuento";
import { Dibujo } from "./escenas/Dibujo";
import { ConocerCuentera } from "./escenas/actividades/ConocerCuentera";
import { Describir } from "./escenas/actividades/Describir";
import { SobreMi } from "./escenas/actividades/SobreMi";
import { Calma } from "./escenas/actividades/Calma";
import { iniciarRegistro } from "./datos/eventos";
import { vigilar } from "./datos/monitor";
import * as guardado from "./datos/guardado";
import * as cuentos from "./datos/cuentos";

const debug = new URLSearchParams(location.search).has("debug");

// The game fills the screen in any orientation. The short side shows about LADO_CORTO
// game pixels, and each game pixel is a whole number of screen pixels, so pixel art stays sharp.
const LADO_CORTO = 360;
const medida = () => {
  const dpr = devicePixelRatio || 1;
  // A hidden or not yet laid out window can report 0 for its size.
  const w = (innerWidth || LADO_CORTO) * dpr;
  const h = (innerHeight || LADO_CORTO) * dpr;
  const z = Math.max(1, Math.floor(Math.min(w, h) / LADO_CORTO));
  return { ancho: Math.ceil(w / z), alto: Math.ceil(h / z), zoom: z / dpr };
};

const partida = await iniciarRegistro();

const juego = new Phaser.Game({
  type: Phaser.AUTO,
  width: medida().ancho,
  height: medida().alto,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: "#1d1a24",
  scale: { mode: Phaser.Scale.NONE, zoom: medida().zoom },
  physics: { default: "arcade", arcade: { debug } },
  scene: [Arranque, Asentimiento, Creacion, ArmarCasa, Mundo, Interfaz, Cuento, Dibujo, ConocerCuentera, Describir, SobreMi, Calma],
});

vigilar(juego, partida.sesion);

addEventListener("resize", () => {
  const m = medida();
  juego.scale.resize(m.ancho, m.alto);
  juego.scale.setZoom(m.zoom);
});

// Debug mode exposes the game and its saved state so automated checks read the live ones.
if (debug) Object.assign(window, { juego, matices: { guardado, cuentos } });
