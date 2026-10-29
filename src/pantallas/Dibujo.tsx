// The drawing sheet: 12 colors, 3 sizes, eraser and undo. Opened from Mi libro, whenever the child
// wants. Every stroke keeps its timing; the drawing is the only free content.
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

export type Trazo = { color: string; grosor: number; goma: boolean; puntos: [number, number, number][] };
export const HOJA = { ancho: ANCHO, alto: ALTO };

// Paints the strokes on a sheet; with `hasta`, only the points drawn before that many ms (the dashboard's replay).
export function pintarHoja(ctx: CanvasRenderingContext2D, trazos: Trazo[], hasta = Infinity) {
  ctx.fillStyle = PAPEL;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const t of trazos) {
    const puntos = t.puntos.filter((p) => p[2] <= hasta);
    if (!puntos.length) continue;
    ctx.strokeStyle = t.goma ? PAPEL : t.color;
    ctx.lineWidth = t.goma ? t.grosor * 2 : t.grosor;
    ctx.beginPath();
    puntos.forEach(([x, y], i) => (i ? ctx.lineTo(x * ANCHO, y * ALTO) : ctx.moveTo(x * ANCHO, y * ALTO)));
    ctx.stroke();
  }
}

export function Dibujo({
  origen,
  consigna,
  alTerminar,
  alAbortar,
  modoActividad = false,
  alProgreso,
}: {
  origen: string;
  consigna: string;
  alTerminar: (imagen: string | null) => void;
  alAbortar?: () => void;
  modoActividad?: boolean;
  alProgreso?: (progreso: Record<string, unknown>) => void;
}) {
  const hoja = useRef<HTMLCanvasElement>(null);
  const trazos = useRef<Trazo[]>([]);
  const actual = useRef<Trazo | null>(null);
  const t0 = useRef(performance.now());
  const deshechos = useRef(0);
  const puntos = useRef(0);
  const [color, setColor] = useState(COLORES[0]);
  const [grosor, setGrosor] = useState(GROSORES[1]);
  const [goma, setGoma] = useState(false);
  const [, repintar] = useState(0);

  // Points are stored relative to the sheet (0 to 1), so the drawing survives a screen rotation.
  const punto = (e: React.PointerEvent): [number, number, number] => {
    const r = hoja.current!.getBoundingClientRect();
    return [+((e.clientX - r.left) / r.width).toFixed(4), +((e.clientY - r.top) / r.height).toFixed(4), Math.round(performance.now() - t0.current)];
  };

  const pintar = () => pintarHoja(hoja.current!.getContext("2d")!, trazos.current);
  const informarProgreso = (etapa: string) => alProgreso?.({ etapa, trazos: trazos.current.length, puntos: puntos.current, deshechos: deshechos.current });

  // The sheet is sized and painted once it is on the screen.
  useEffect(() => {
    hoja.current!.width = ANCHO;
    hoja.current!.height = ALTO;
    pintar();
    informarProgreso("inicio");
  }, []);

  const empezar = (e: React.PointerEvent) => {
    try {
      hoja.current!.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic events cannot be captured; drawing still works.
    }
    actual.current = { color, grosor, goma, puntos: [punto(e)] };
    puntos.current++;
    trazos.current.push(actual.current);
    pintar();
    informarProgreso("trazando");
  };

  const seguir = (e: React.PointerEvent) => {
    if (!actual.current) return;
    actual.current.puntos.push(punto(e));
    puntos.current++;
    pintar();
    if (puntos.current % 5 === 0) informarProgreso("trazando");
  };

  const soltar = () => {
    const teniaTrazo = !!actual.current;
    actual.current = null;
    if (teniaTrazo) informarProgreso("trazo_terminado");
  };

  const deshacer = () => {
    if (trazos.current.pop()) deshechos.current++;
    puntos.current = trazos.current.reduce((total, trazo) => total + trazo.puntos.length, 0);
    pintar();
    repintar((n) => n + 1);
    informarProgreso("deshacer");
  };

  const cerrar = (imagen: string | null) => {
    const datos = trazos.current.map((t) => ({ color: t.color, grosor: t.grosor, goma: t.goma, puntos: t.puntos }));
    const vacio = trazos.current.length === 0;
    informarProgreso(vacio ? "listo_vacio" : "listo_con_dibujo");
    registrar("dibujo", {
      origen,
      resultado: vacio ? "vacio" : "con_dibujo",
      vacio,
      trazos: datos,
      cantidad_trazos: trazos.current.length,
      cantidad_puntos: puntos.current,
      deshechos: deshechos.current,
      ms: Math.round(performance.now() - t0.current),
      imagen,
    });
    alTerminar(imagen);
  };

  const listo = () => {
    if (!trazos.current.length) return cerrar(null);
    cerrar(hoja.current!.toDataURL("image/png"));
  };

  return (
    <section className={`dibujo${modoActividad ? " dibujo-actividad" : ""}`} aria-label={consigna}>
      <header className="dibujo-cabecera">
        <p>{consigna}</p>
        <div className="dibujo-cabecera-acciones">
          <Bocina clave={`dibujo.${origen}`} texto={consigna} />
        </div>
      </header>
      <div className="dibujo-cuerpo">
        <div className="dibujo-hoja panel panel-compacto">
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
        {alAbortar && (
          <button className="boton suave" type="button" onClick={alAbortar}>
            Salir
          </button>
        )}
        <button className="boton principal" onClick={listo}>
          {Icono.listo}
          {contenido.textos.libro.listo}
        </button>
      </footer>
    </section>
  );
}
