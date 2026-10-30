// The top bar: the page's name on the left and the educator's tools on the right. It stays in view while the board scrolls.
import type { ReactNode } from "react";

export function Cabecera({ titulo, volver, children }: { titulo: ReactNode; volver: boolean; children: ReactNode }) {
  return (
    <header className="cabecera">
      <div className="cabecera-titulo">
        {volver && <a className="volver" href="#">← Todos los participantes</a>}
        <h1>{titulo}</h1>
      </div>
      <div className="cabecera-acciones">{children}</div>
    </header>
  );
}
