// Siempre a la mano: Mi libro arriba a la izquierda, "Quiero hablar con alguien" arriba a la
// derecha y Opciones abajo a la derecha, en cualquier pantalla. Mi libro, Opciones y la frase de "Quiero
// hablar" cubren lo que hay debajo; mientras cubren, el mundo se queda quieto (useSuperpuesto).
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

type Capa = "libro" | "opciones" | "hablar";
const Superpuesto = createContext(false);

// True while Mi libro, Opciones or the card of "Quiero hablar" lie over the screen.
export const useSuperpuesto = () => useContext(Superpuesto);

export function Siempre({ pantalla, alEspejo, children }: { pantalla: string; alEspejo?: () => void; children: ReactNode }) {
  const [capa, setCapa] = useState<Capa | null>(null);
  // The mark for the adult. It stays until the game is closed.
  const [senal, setSenal] = useState(false);

  const alternar = (c: "libro" | "opciones") => setCapa(capa === c ? null : c);

  // The record goes to the device's log with the screen and the time (contenido/codigos.md).
  // The card says only what the sign on screen is: it stays up for an adult who is with the child.
  const quieroHablar = () => {
    registrar("quiero_hablar", { pantalla: capa === "libro" || capa === "opciones" ? capa : (detalleActual() ?? pantalla) });
    setSenal(true);
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
            <Bocina clave="siempre.aviso" texto={S.aviso} />
            <button className="boton principal" onClick={() => setCapa(null)}>
              {S.seguir}
            </button>
          </section>
        </div>
      )}

      {senal && (
        <div className="siempre-senal" aria-hidden="true">
          {Icono.hablar}
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
