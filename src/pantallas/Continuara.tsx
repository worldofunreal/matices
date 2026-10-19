import { Personaje } from "../lienzo/Personaje";
import { estado } from "../datos/guardado";
import "./continuara.css";

// Temporary end of the playable part while the migration goes on (docs/MVP.md, M2 next).
export function Continuara({ alCambiar }: { alCambiar: () => void }) {
  const e = estado();
  return (
    <main className="pantalla continuara">
      <Personaje a={e.apariencia} escala={5} camina />
      <h2>{e.nombre}</h2>
      <p>Lo siguiente es armar la casa. Está en construcción.</p>
      <button className="boton secundario" onClick={alCambiar}>
        Cambiar mi personaje
      </button>
    </main>
  );
}
