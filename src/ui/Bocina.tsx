import { useState } from "react";
import { hablar } from "./voz";
import { Icono } from "./iconos";

// The voice only plays when the child asks for it (GDD §12).
export function Bocina({ clave, texto, etiqueta = "Escuchar" }: { clave: string; texto: string; etiqueta?: string }) {
  const [sonando, setSonando] = useState(false);
  return (
    <button
      className={`boton redondo bocina${sonando ? " sonando" : ""}`}
      aria-label={etiqueta}
      onClick={(e) => {
        e.stopPropagation();
        setSonando(true);
        void hablar(clave, texto).then(() => setSonando(false));
      }}
    >
      {Icono.bocina}
    </button>
  );
}
