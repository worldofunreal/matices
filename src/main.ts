import Phaser from "phaser";
import { Arranque } from "./escenas/Arranque";
import { Mundo } from "./escenas/Mundo";

export const ANCHO = 640;
export const ALTO = 360;
const debug = new URLSearchParams(location.search).has("debug");

// Integer scaling keeps pixel art sharp; below 1× it shrinks to fit.
const zoom = () => {
  const z = Math.min(innerWidth / ANCHO, innerHeight / ALTO);
  return z >= 1 ? Math.floor(z) : z;
};

const juego = new Phaser.Game({
  type: Phaser.AUTO,
  width: ANCHO,
  height: ALTO,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: "#1d1a24",
  scale: { mode: Phaser.Scale.NONE, zoom: zoom() },
  physics: { default: "arcade", arcade: { debug } },
  scene: [Arranque, Mundo],
});

addEventListener("resize", () => juego.scale.setZoom(zoom()));

// Debug mode exposes the game so automated checks can read positions.
if (debug) Object.assign(window, { juego });
