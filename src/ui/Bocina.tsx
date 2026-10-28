import { useState } from "react";
import { hablar } from "./voz";
import { Icono } from "./iconos";
import { registrar } from "../datos/eventos";
import { dondeEsta } from "../datos/monitor";

// The voice only plays when the child asks for it.
export function Bocina({ clave, texto, etiqueta = "Escuchar" }: { clave: string; texto: string; etiqueta?: string }) {
  const [sonando, setSonando] = useState(false);
  return (
    <button
      className={`boton redondo bocina${sonando ? " sonando" : ""}`}
      aria-label={etiqueta}
      onClick={(e) => {
        e.stopPropagation();
        registrar("repetir_voz", { pantalla: dondeEsta(), clave });
        setSonando(true);
        void hablar(clave, texto).then(() => setSonando(false));
      }}
    >
      {Icono.bocina}
    </button>
  );
}
