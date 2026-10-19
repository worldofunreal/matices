import { useEffect, useRef } from "react";
import { pieza, CUADRO } from "./arte";
import { capas, capasRetrato, coloresDe, DIRECCIONES, type Apariencia, type Direccion, type Expresion } from "../personaje/apariencia";

// Draws stacked layers on a small canvas; CSS enlarges it with sharp pixels.
async function dibujar(c: HTMLCanvasElement, ids: string[], a: Apariencia, cuadro?: { x: number; y: number }) {
  const lienzos = await Promise.all(ids.map((id) => pieza(id, coloresDe(a))));
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, c.width, c.height);
  for (const l of lienzos) {
    if (cuadro) ctx.drawImage(l, cuadro.x, cuadro.y, CUADRO.ancho, CUADRO.alto, 0, 0, CUADRO.ancho, CUADRO.alto);
    else ctx.drawImage(l, 0, 0);
  }
}

// The walking character, at a whole-number scale. Walks in place when `camina`.
export function Personaje({ a, escala, direccion = "abajo", camina = false }: { a: Apariencia; escala: number; direccion?: Direccion; camina?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const fila = DIRECCIONES.indexOf(direccion);
    const ids = capas(a);
    let paso = 0;
    let vivo = true;
    void dibujar(c, ids, a, { x: 0, y: fila * CUADRO.alto });
    if (!camina) return;
    const t = setInterval(() => {
      paso = (paso % 4) + 1;
      if (vivo) void dibujar(c, ids, a, { x: paso * CUADRO.ancho, y: fila * CUADRO.alto });
    }, 140);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [a, direccion, camina]);
  return <canvas ref={ref} className="pixel" width={CUADRO.ancho} height={CUADRO.alto} style={{ width: CUADRO.ancho * escala, height: CUADRO.alto * escala }} />;
}

// The 96×96 portrait.
export function Retrato({ a, tam, expresion = "neutral" }: { a: Apariencia; tam: number; expresion?: Expresion }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    void dibujar(ref.current!, capasRetrato(a, expresion), a);
  }, [a, expresion]);
  return <canvas ref={ref} className="pixel" width={96} height={96} style={{ width: tam, height: tam }} />;
}
