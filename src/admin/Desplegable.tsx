// A round button that opens a panel under it. The panel closes when something inside it is clicked, when a
// click lands anywhere else, or on Escape, which also gives the focus back to the button.
import { useEffect, useRef, useState, type ReactNode } from "react";

export function Desplegable({ etiqueta, disparador, alAbrir, children }: { etiqueta: string; disparador: ReactNode; alAbrir?: () => void; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAbierto(false);
      boton.current?.focus();
    };
    addEventListener("pointerdown", fuera);
    addEventListener("keydown", tecla);
    return () => {
      removeEventListener("pointerdown", fuera);
      removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const alternar = () => {
    setAbierto(!abierto);
    if (!abierto) alAbrir?.();
  };

  return (
    <div className="desplegable" ref={raiz}>
      <button ref={boton} className="boton icono" aria-label={etiqueta} aria-expanded={abierto} onClick={alternar}>
        {disparador}
      </button>
      {abierto && <div className="desplegable-panel" onClick={() => setAbierto(false)}>{children}</div>}
    </div>
  );
}
