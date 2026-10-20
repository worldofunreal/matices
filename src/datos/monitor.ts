// Product events for the team (PRD F16): device, sessions, screens, errors, performance.
import { registrar } from "./eventos";

let anterior: string | null = null;
let detalle: string | null = null; // a story, drawing or landing open over the screen

// Every screen the child opens, with the one before it (funnels and drop-off).
export function pantalla(nombre: string) {
  registrar("pantalla", { pantalla: nombre, anterior });
  anterior = nombre;
}

// The part of the screen that is open over it, for the records that need it ("Quiero hablar con alguien").
export const detalleActual = () => detalle;
export function enDetalle(nombre: string | null) {
  detalle = nombre;
}

export function vigilar(sesion: number) {
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

  // Frames per second from the browser's own drawing loop, reported every minute.
  let cuadros = 0;
  const contar = () => {
    cuadros++;
    requestAnimationFrame(contar);
  };
  requestAnimationFrame(contar);
  setInterval(() => {
    const memoria = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    registrar("rendimiento", { fps: Math.round(cuadros / 60), memoria_mb: memoria ? Math.round(memoria.usedJSHeapSize / 2 ** 20) : null });
    cuadros = 0;
  }, 60_000);
}
