import { useEffect, useRef } from "react";
import { pieza, medidaDe, CUADRO } from "./arte";
import { capas, coloresDe, filaDe, type Apariencia, type Direccion } from "../personaje/apariencia";

// Draws stacked layers on a small canvas; CSS enlarges it with sharp pixels.
async function dibujar(c: HTMLCanvasElement, ids: string[], a: Apariencia, cuadro: { x: number; y: number; voltear?: boolean }) {
  const lienzos = await Promise.all(ids.map((id) => pieza(id, coloresDe(a))));
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.setTransform(cuadro?.voltear ? -1 : 1, 0, 0, 1, cuadro?.voltear ? c.width : 0, 0);
  for (const l of lienzos) ctx.drawImage(l, cuadro.x, cuadro.y, c.width, c.height, 0, 0, c.width, c.height);
}

// The walking character, at a whole-number scale. Walks in place when `camina`.
export function Personaje({ a, escala, direccion = "abajo", camina = false }: { a: Apariencia; escala: number; direccion?: Direccion; camina?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const { fila, voltear } = filaDe(direccion);
    const ids = capas(a);
    let paso = 0;
    let vivo = true;
    void dibujar(c, ids, a, { x: 0, y: fila * CUADRO.alto, voltear });
    if (!camina) return;
    const t = setInterval(() => {
      paso = (paso % 4) + 1;
      if (vivo) void dibujar(c, ids, a, { x: paso * CUADRO.ancho, y: fila * CUADRO.alto, voltear });
    }, 140);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [a, direccion, camina]);
  return <canvas ref={ref} className="pixel" width={CUADRO.ancho} height={CUADRO.alto} style={{ width: CUADRO.ancho * escala, height: CUADRO.alto * escala }} />;
}

// The head of the standing character, facing the viewer: shows hair and head extras with the real art.
const CABEZA = { x: 6, y: 0, ancho: 36, alto: 32 };
export function Cabeza({ a, escala }: { a: Apariencia; escala: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    void dibujar(ref.current!, capas(a), a, { x: CABEZA.x, y: CABEZA.y });
  }, [a]);
  return <canvas ref={ref} className="pixel" width={CABEZA.ancho} height={CABEZA.alto} style={{ width: CABEZA.ancho * escala, height: CABEZA.alto * escala }} />;
}

// A figure of the house: one still frame, facing the viewer, at its own size (feet at the bottom).
export function Hoja({ id, piel = 0, escala }: { id: string; piel?: number; escala: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [w, h] = medidaDe(id);
  useEffect(() => {
    void pieza(id, { piel }).then((l) => {
      const ctx = ref.current?.getContext("2d");
      if (!ctx) return; // the picture left the screen before it loaded
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(l, 0, 0);
    });
  }, [id, piel, w, h]);
  return <canvas ref={ref} className="pixel" width={w} height={h} style={{ width: w * escala, height: h * escala }} />;
}

// The head of a figure of the house, as its portrait on cards: the same art as the figure, so a person
// looks the same in the house and on the cards. Found from the top of the figure (each age is a different height).
export function Cara({ id, piel = 0, tam }: { id: string; piel?: number; tam: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    void pieza(id, { piel }).then((l) => {
      const c = ref.current;
      if (!c) return; // the picture left the screen before it loaded
      const d = l.getContext("2d")!.getImageData(0, 0, l.width, l.height).data;
      let arriba = 0;
      while (arriba < l.height && ![...Array(l.width).keys()].some((x) => d[(arriba * l.width + x) * 4 + 3])) arriba++;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(l, (l.width - CABEZA.ancho) / 2, Math.max(0, arriba - 1), CABEZA.ancho, CABEZA.ancho, 0, 0, CABEZA.ancho, CABEZA.ancho);
    });
  }, [id, piel]);
  return <canvas ref={ref} className="pixel" width={CABEZA.ancho} height={CABEZA.ancho} style={{ width: tam, height: tam }} />;
}

// A single image piece (portrait, icon) with optional skin color.
export function Imagen({ id, piel = 0, tam }: { id: string; piel?: number; tam: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    void pieza(id, { piel }).then((l) => {
      const c = ref.current;
      if (!c) return; // the picture left the screen before it loaded
      c.width = l.width;
      c.height = l.height;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(l, 0, 0);
    });
  }, [id, piel]);
  return <canvas ref={ref} className="pixel" style={{ width: tam, height: tam }} />;
}
