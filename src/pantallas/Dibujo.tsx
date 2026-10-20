// The drawing sheet (GDD §10): 12 colors, 3 sizes, eraser and undo. Used for "Otra cosa" in a story
// and for the free drawing. Every stroke keeps its timing; the drawing is the only free content.
import { useEffect, useRef, useState } from "react";
import contenido from "virtual:contenido";
import { Bocina } from "../ui/Bocina";
import { Icono } from "../ui/iconos";
import { registrar } from "../datos/eventos";
import "./dibujo.css";

const COLORES = ["#1d1a24", "#7a5c4f", "#d94f4f", "#f28c38", "#f2c14e", "#6cbf6a", "#2f8f6b", "#5b8fd6", "#3c4fa8", "#9b6bd1", "#f4a6c8", "#ffffff"];
const GROSORES = [6, 12, 24]; // in the sheet's own resolution (800 × 600)
const PAPEL = "#faf6ee";
const ANCHO = 800;
const ALTO = 600;

type Trazo = { color: string; grosor: number; goma: boolean; puntos: [number, number, number][] };

export function Dibujo({ origen, consigna, alTerminar, ahoraNo }: { origen: string; consigna: string; alTerminar: (imagen: string | null) => void; ahoraNo?: () => void }) {
  const hoja = useRef<HTMLCanvasElement>(null);
  const trazos = useRef<Trazo[]>([]);
  const actual = useRef<Trazo | null>(null);
  const t0 = useRef(performance.now());
  const deshechos = useRef(0);
  const [color, setColor] = useState(COLORES[0]);
  const [grosor, setGrosor] = useState(GROSORES[1]);
  const [goma, setGoma] = useState(false);
  const [, repintar] = useState(0);

  // Points are stored relative to the sheet (0 to 1), so the drawing survives a screen rotation.
  const punto = (e: React.PointerEvent): [number, number, number] => {
    const r = hoja.current!.getBoundingClientRect();
    return [+((e.clientX - r.left) / r.width).toFixed(4), +((e.clientY - r.top) / r.height).toFixed(4), Math.round(performance.now() - t0.current)];
  };

  const pintar = () => {
    const ctx = hoja.current!.getContext("2d")!;
    ctx.fillStyle = PAPEL;
    ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const t of trazos.current) {
      ctx.strokeStyle = t.goma ? PAPEL : t.color;
      ctx.lineWidth = t.goma ? t.grosor * 2 : t.grosor;
      ctx.beginPath();
      t.puntos.forEach(([x, y], i) => (i ? ctx.lineTo(x * ANCHO, y * ALTO) : ctx.moveTo(x * ANCHO, y * ALTO)));
      ctx.stroke();
    }
  };

  // The sheet is sized and painted once it is on the screen.
  useEffect(() => {
    hoja.current!.width = ANCHO;
    hoja.current!.height = ALTO;
    pintar();
  }, []);

  const empezar = (e: React.PointerEvent) => {
    try {
      hoja.current!.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic events cannot be captured; drawing still works.
    }
    actual.current = { color, grosor, goma, puntos: [punto(e)] };
    trazos.current.push(actual.current);
    pintar();
  };

  const seguir = (e: React.PointerEvent) => {
    if (!actual.current) return;
    actual.current.puntos.push(punto(e));
    pintar();
  };

  const soltar = () => {
    actual.current = null;
  };

  const deshacer = () => {
    if (trazos.current.pop()) deshechos.current++;
    pintar();
    repintar((n) => n + 1);
  };

  const cerrar = (imagen: string | null) => {
    const datos = trazos.current.map((t) => ({ color: t.color, grosor: t.grosor, goma: t.goma, puntos: t.puntos }));
    registrar("dibujo", { origen, trazos: datos, deshechos: deshechos.current, ms: Math.round(performance.now() - t0.current), imagen });
    alTerminar(imagen);
  };

  const listo = () => {
    if (!trazos.current.length) return cerrar(null);
    cerrar(hoja.current!.toDataURL("image/png"));
  };

  return (
    <section className="dibujo" aria-label={consigna}>
      <header className="dibujo-cabecera">
        <p>{consigna}</p>
        <Bocina clave={`dibujo.${origen}`} texto={consigna} />
      </header>
      <div className="dibujo-cuerpo">
        <div className="dibujo-hoja">
          <canvas
            ref={hoja}
            onPointerDown={empezar}
            onPointerMove={seguir}
            onPointerUp={soltar}
            onPointerCancel={soltar}
          />
        </div>
        <div className="dibujo-herramientas">
          <div className="dibujo-colores">
            {COLORES.map((c) => (
              <button
                key={c}
                className="muestra"
                aria-label={`Color ${c}`}
                aria-pressed={!goma && color === c}
                style={{ background: c }}
                onClick={() => {
                  setColor(c);
                  setGoma(false);
                }}
              />
            ))}
          </div>
          <div className="dibujo-grosores">
            {GROSORES.map((g) => (
              <button key={g} className="grosor" aria-label={`Grosor ${g}`} aria-pressed={grosor === g} onClick={() => setGrosor(g)}>
                <span style={{ width: g / 2 + 4, height: g / 2 + 4 }} />
              </button>
            ))}
          </div>
          <div className="dibujo-acciones">
            <button className="boton redondo" aria-label="Goma" aria-pressed={goma} onClick={() => setGoma((g) => !g)}>
              {Icono.borrar}
            </button>
            <button className="boton redondo" aria-label="Deshacer" onClick={deshacer}>
              {Icono.deshacer}
            </button>
          </div>
        </div>
      </div>
      <footer className="dibujo-pie">
        {ahoraNo && (
          <button className="boton secundario" onClick={ahoraNo}>
            {contenido.textos.cuento.boton_ahora_no}
          </button>
        )}
        <button className="boton principal" onClick={listo}>
          {Icono.listo}
          {contenido.textos.cuento.listo}
        </button>
      </footer>
    </section>
  );
}
