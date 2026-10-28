// Opciones: the child's settings, over the world like Mi libro. Each change is saved at
// once. The voice (ui/voz.ts) and the ambient effects (Mundo) use them now; music, effects, text speed and
// simple reading are saved for when they exist.
import { useState, type ReactNode } from "react";
import contenido from "virtual:contenido";
import { cambiarEstado, estado, type Opciones as Ajustes } from "../datos/guardado";
import { Bocina } from "../ui/Bocina";
import { Icono } from "../ui/iconos";
import "./opciones.css";

const O = contenido.textos.opciones;
const VELOCIDADES = ["lenta", "normal", "rapida"] as const;
const NIVELES = [1, 2, 3, 4, 5];

// Lectura sencilla is a class on the page: estilos.css makes the text the child reads bigger and airier.
export const aplicarLectura = (on: boolean) => document.documentElement.classList.toggle("lectura-sencilla", on);

// One setting: its icon, its name (with the speaker, like every line of text) and its control.
function Fila({ icono, texto, clave, children }: { icono: ReactNode; texto: string; clave: string; children: ReactNode }) {
  return (
    <div className="preferencia">
      <div className="preferencia-cabecera">
        <span className="preferencia-icono">{icono}</span>
        <p>{texto}</p>
        <Bocina clave={`opciones.${clave}`} texto={texto} />
      </div>
      {children}
    </div>
  );
}

export function Opciones({ alCerrar }: { alCerrar: () => void }) {
  const [o, setO] = useState<Ajustes>(() => estado().opciones);
  const cambiar = <K extends keyof Ajustes>(clave: K, valor: Ajustes[K]) => {
    const nuevas: Ajustes = { ...o, [clave]: valor };
    setO(nuevas);
    cambiarEstado({ opciones: nuevas }, true);
    aplicarLectura(nuevas.lectura);
  };

  // Five bars; the voice starts at one so it never goes silent.
  const nivel = (clave: "voz" | "musica" | "efectos", minimo: number) => (
    <div className="preferencia-control">
      <button className="boton redondo" aria-label={O.bajar} disabled={o[clave] <= minimo} onClick={() => cambiar(clave, o[clave] - 1)}>
        {Icono.menos}
      </button>
      <div className="preferencia-barras" aria-hidden="true">
        {NIVELES.map((n) => (
          <span key={n} className={n <= o[clave] ? "on" : undefined} />
        ))}
      </div>
      <button className="boton redondo" aria-label={O.subir} disabled={o[clave] >= 5} onClick={() => cambiar(clave, o[clave] + 1)}>
        {Icono.mas}
      </button>
    </div>
  );

  const sino = (clave: "lectura") => (
    <div className="preferencia-control">
      <button className="chip" aria-pressed={o[clave]} onClick={() => cambiar(clave, true)}>
        {O.prendido}
      </button>
      <button className="chip" aria-pressed={!o[clave]} onClick={() => cambiar(clave, false)}>
        {O.apagado}
      </button>
    </div>
  );

  return (
    <section className="preferencias" aria-label={O.titulo}>
      <header className="preferencias-cabecera">
        <h2>{O.titulo}</h2>
        <button className="boton redondo" aria-label={O.cerrar} onClick={alCerrar}>
          {Icono.cerrar}
        </button>
      </header>

      <div className="preferencias-lista">
        <Fila icono={Icono.bocina} texto={O.voz} clave="voz">
          {nivel("voz", 1)}
        </Fila>
        <Fila icono={Icono.musica} texto={O.musica} clave="musica">
          {nivel("musica", 0)}
        </Fila>
        <Fila icono={Icono.efectos} texto={O.efectos} clave="efectos">
          {nivel("efectos", 0)}
        </Fila>
        <Fila icono={Icono.velocidad} texto={O.velocidad} clave="velocidad">
          <div className="preferencia-control">
            {VELOCIDADES.map((v, i) => (
              <button key={v} className="chip" aria-pressed={o.velocidad === v} onClick={() => cambiar("velocidad", v)}>
                {O.velocidades[i]}
              </button>
            ))}
          </div>
        </Fila>
        <Fila icono={Icono.lectura} texto={O.lectura} clave="lectura">
          {sino("lectura")}
        </Fila>
      </div>
    </section>
  );
}
