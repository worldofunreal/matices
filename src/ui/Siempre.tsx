// Siempre a la mano: Mi libro arriba a la izquierda, "Quiero hablar con alguien" arriba a la
// derecha y Opciones abajo a la derecha, en cualquier pantalla. Mi libro, Opciones y las líneas de ayuda
// de "Quiero hablar" cubren lo que hay debajo; mientras cubren, el mundo se queda quieto (useSuperpuesto).
import { createContext, useContext, useState, type ReactNode } from "react";
import contenido from "virtual:contenido";
import { registrar } from "../datos/eventos";
import { detalleActual } from "../datos/monitor";
import { Libro } from "../pantallas/Libro";
import { Opciones } from "../pantallas/Opciones";
import { Bocina } from "./Bocina";
import { Icono } from "./iconos";
import "./siempre.css";

const S = contenido.textos.siempre;
// What the speaker reads: the whole card, numbers included.
const AYUDA = [S.aviso, ...S.lineas.map((l) => `${l.nombre}: ${l.numero}.`), S.escuela].join(" ");

type Capa = "libro" | "opciones" | "hablar";
const Superpuesto = createContext(false);

// True while Mi libro, Opciones or the card of "Quiero hablar" lie over the screen.
export const useSuperpuesto = () => useContext(Superpuesto);

export function Siempre({ pantalla, alEspejo, children }: { pantalla: string; alEspejo?: () => void; children: ReactNode }) {
  const [capa, setCapa] = useState<Capa | null>(null);

  const alternar = (c: "libro" | "opciones") => setCapa(capa === c ? null : c);

  // The record goes to the device's log with the screen and the time (contenido/codigos.md).
  // The card shows real help lines; the game itself never says it called anyone.
  const quieroHablar = () => {
    registrar("quiero_hablar", { pantalla: capa === "libro" || capa === "opciones" ? capa : (detalleActual() ?? pantalla) });
    setCapa("hablar");
  };

  return (
    <Superpuesto.Provider value={capa !== null}>
      {children}

      {capa === "libro" && <Libro alCerrar={() => setCapa(null)} />}
      {capa === "opciones" && <Opciones alCerrar={() => setCapa(null)} alEspejo={alEspejo && (() => (setCapa(null), alEspejo()))} />}
      {capa === "hablar" && (
        <div className="siempre-velo">
          <section className="siempre-aviso panel" role="dialog" aria-label={S.quiero_hablar}>
            <span className="siempre-icono">{Icono.hablar}</span>
            <p>{S.aviso}</p>
            <ul className="siempre-lineas">
              {S.lineas.map((l) => (
                <li key={l.numero}>
                  <span>{l.nombre}</span>
                  <a className="siempre-numero" href={`tel:${l.numero.replace(/ /g, "")}`}>
                    {l.numero}
                  </a>
                </li>
              ))}
            </ul>
            <p className="siempre-escuela">{S.escuela}</p>
            <Bocina clave="siempre.aviso" texto={AYUDA} />
            <button className="boton principal" onClick={() => setCapa(null)}>
              {S.seguir}
            </button>
          </section>
        </div>
      )}

      <div className="siempre">
        <button className="boton redondo siempre-libro" aria-label={S.mi_libro} aria-pressed={capa === "libro"} onClick={() => alternar("libro")}>
          {Icono.libro}
        </button>
        <button className="boton redondo siempre-hablar" aria-label={S.quiero_hablar} onClick={quieroHablar}>
          {Icono.hablar}
        </button>
        <button className="boton redondo siempre-opciones" aria-label={S.opciones} aria-pressed={capa === "opciones"} onClick={() => alternar("opciones")}>
          {Icono.opciones}
        </button>
      </div>
    </Superpuesto.Provider>
  );
}
