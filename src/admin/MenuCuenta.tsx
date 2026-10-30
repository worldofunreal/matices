// The educator's avatar: her initials, or the neutral figure. Its menu holds her profile and sign-out.
import { Icono } from "../ui/iconos";
import { Desplegable } from "./Desplegable";
import type { Educadora } from "./memoria";
import { Iniciales } from "./piezas";

export function MenuCuenta({ educadora, alSalir }: { educadora: Educadora; alSalir: () => void }) {
  return (
    <Desplegable etiqueta="Cuenta de la educadora" disparador={<Iniciales nombre={educadora.nombre} />}>
      <div className="menu-cabeza">
        <strong>{educadora.nombre || "Sin nombre todavía"}</strong>
        {educadora.cargo && <span>{educadora.cargo}</span>}
      </div>
      <a className="menu-item" href="#cuenta">
        {Icono.cuerpo}
        Ver perfil
      </a>
      <button className="menu-item" onClick={alSalir}>
        {Icono.puerta}
        Cerrar sesión
      </button>
    </Desplegable>
  );
}
