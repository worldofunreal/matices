// The pieces the board's pages share: a section card, the numbers, the bars, the progress boxes, the faces
// and the downloads. Each one is used by more than one page or section.
import type { CSSProperties, ReactNode } from "react";
import { Cabeza } from "../lienzo/Personaje";
import type { Apariencia } from "../personaje/apariencia";
import { Icono } from "../ui/iconos";
import * as K from "./calculos";
import type { Evento } from "./calculos";

export function Seccion({ titulo, nota, className, children }: { titulo: string; nota?: string; className?: string; children: ReactNode }) {
  return (
    <section className={className}>
      <h2>{titulo}</h2>
      {nota && <p className="nota">{nota}</p>}
      {children}
    </section>
  );
}

// Folded away until someone opens it, for what only a technical person needs.
export function Plegable({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="tecnico">
      <details>
        <summary>{titulo}</summary>
        {children}
      </details>
    </section>
  );
}

// Big numbers, each with its words under it.
export function Cifras({ filas }: { filas: { valor: string | number; texto: string }[] }) {
  return (
    <div className="cifras">
      {filas.map((f) => (
        <div key={f.texto} className="cifra">
          <strong>{f.valor}</strong>
          <span>{f.texto}</span>
        </div>
      ))}
    </div>
  );
}

// The length is the value against the largest one in the group; the number is written next to it.
export function Barras({ filas }: { filas: { nombre: string; valor: number; texto?: string; otra?: boolean }[] }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <div className="barras">
      {filas.map((f) => (
        <div key={f.nombre} style={{ display: "contents" }} title={`${f.nombre}: ${f.texto ?? f.valor}`}>
          <span>{f.nombre}</span>
          <div className={f.otra ? "barra barra-otra" : "barra"} style={{ "--v": f.valor / max, minWidth: f.valor > 0 ? 2 : 0 } as CSSProperties} />
          <span className="num">{f.texto ?? f.valor}</span>
        </div>
      ))}
    </div>
  );
}

// Three boxes, one per day: the filled ones are the days the child has reached.
export function Progreso({ dia, termino }: { dia: number; termino: boolean }) {
  return (
    <div className="progreso">
      <div className="progreso-cajas" aria-hidden="true">
        {[1, 2, 3].map((d) => <span key={d} className={termino || d <= dia ? "hecho" : undefined} />)}
      </div>
      <span>{termino ? "Terminó los 3 días" : dia ? `Día ${dia} de 3` : "Apenas empieza"}</span>
    </div>
  );
}

// The character's head, as the child left it; nothing when the character was never finished.
export function Rostro({ a }: { a: Apariencia | null }) {
  return a ? <span className="rostro"><Cabeza a={a} escala={2} /></span> : null;
}

// Two letters for a name; the neutral figure until the educator has written one.
export function Iniciales({ nombre }: { nombre: string }) {
  return <span className="avatar">{K.iniciales(nombre) || Icono.cuerpo}</span>;
}

// The JSON is for an AI to read and the CSV for a spreadsheet, so both are offered with the same words.
export function Descargas({ base, eventos }: { base: string; eventos: Evento[] }) {
  return (
    <>
      <p className="nota">Para compartir con una IA usa el JSON. Para abrir en Excel o Hojas de cálculo usa el CSV.</p>
      <div className="acciones">
        <button className="boton secundario" onClick={() => descargar(`${base}.json`, JSON.stringify(eventos, null, 1), "application/json")}>
          {Icono.descargar}
          Descargar JSON
        </button>
        <button className="boton secundario" onClick={() => descargar(`${base}.csv`, K.csv(eventos), "text/csv")}>
          {Icono.descargar}
          Descargar CSV
        </button>
      </div>
    </>
  );
}

function descargar(nombre: string, texto: string, tipo: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([texto], { type: tipo }));
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}
