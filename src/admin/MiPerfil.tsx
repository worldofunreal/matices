// The educator's own card: a name and a role. They stay in this browser; nothing is sent to the server.
import { useState, type ChangeEvent, type FormEvent } from "react";
import { guardarEducadora, type Educadora } from "./memoria";
import { Iniciales } from "./piezas";

export function MiPerfil({ educadora, alGuardar }: { educadora: Educadora; alGuardar: (nuevo: Educadora) => void }) {
  const [nombre, setNombre] = useState(educadora.nombre);
  const [cargo, setCargo] = useState(educadora.cargo);
  const [estado, setEstado] = useState<"guardado" | "error" | "">("");

  const cambiar = (poner: (valor: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    poner(e.target.value);
    setEstado("");
  };

  const guardar = (e: FormEvent) => {
    e.preventDefault();
    const nuevo = { nombre: nombre.trim(), cargo: cargo.trim() };
    if (!guardarEducadora(nuevo)) {
      setEstado("error");
      return;
    }
    alGuardar(nuevo);
    setEstado("guardado");
  };

  return (
    <section>
      <div className="mi-perfil-cabeza">
        <Iniciales nombre={nombre} />
        <div>
          <h2>Tus datos</h2>
          <p className="nota">Se guardan solo en este navegador, en esta computadora. No se envían a ningún servidor.</p>
        </div>
      </div>
      <form className="formulario" onSubmit={guardar}>
        <label>
          Nombre
          <input className="campo" autoComplete="name" value={nombre} onChange={cambiar(setNombre)} />
        </label>
        <label>
          Cargo
          <input className="campo" placeholder="Por ejemplo: psicóloga escolar" value={cargo} onChange={cambiar(setCargo)} />
        </label>
        <div className="acciones">
          <button className="boton principal">Guardar</button>
          {estado === "guardado" && <span role="status">Guardado.</span>}
          {estado === "error" && <span role="alert">No se pudo guardar en este navegador.</span>}
        </div>
      </form>
    </section>
  );
}
