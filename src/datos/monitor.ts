// Product events for the team (PRD F16): device, sessions, screens, errors, performance.
import type Phaser from "phaser";
import { registrar } from "./eventos";

export function vigilar(juego: Phaser.Game, sesion: number) {
  registrar("aparato", {
    sistema: navigator.platform,
    navegador: navigator.userAgent,
    pantalla: [screen.width, screen.height],
    ventana: [innerWidth, innerHeight],
    densidad: devicePixelRatio,
    tactil: navigator.maxTouchPoints > 0,
  });
  registrar("sesion", { que: sesion === 1 ? "inicio" : "regreso" });

  document.addEventListener("visibilitychange", () => registrar("sesion", { que: document.hidden ? "pausa" : "regreso" }));
  addEventListener("pagehide", () => registrar("sesion", { que: "cierre" }));
  addEventListener("error", (e) => registrar("error", { mensaje: e.message, donde: `${e.filename}:${e.lineno}` }));
  addEventListener("unhandledrejection", (e) => registrar("error", { mensaje: String(e.reason) }));

  setInterval(() => {
    const memoria = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    registrar("rendimiento", { fps: Math.round(juego.loop.actualFps), memoria_mb: memoria ? Math.round(memoria.usedJSHeapSize / 2 ** 20) : null });
  }, 60_000);

  // Scenes exist only once the game has booted.
  juego.events.once("ready", () => {
    let anterior: string | null = null;
    for (const escena of juego.scene.getScenes(false))
      escena.events.on("create", () => {
        registrar("pantalla", { pantalla: escena.scene.key, anterior });
        anterior = escena.scene.key;
      });
  });
}
