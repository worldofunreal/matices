import { useState } from "react";
import { Creacion } from "./pantallas/Creacion";
import { ArmarCasa } from "./pantallas/ArmarCasa";
import { Mundo } from "./pantallas/Mundo";
import { estado } from "./datos/guardado";
import { pantalla } from "./datos/monitor";

type Pantalla = { nombre: "creacion"; modo: "inicio" | "espejo" } | { nombre: "casa" } | { nombre: "mundo" };

// Where the child picks up: their character first, then their house, then the world. Consent and the child's yes
// happen before they get access (docs/legal/consentimiento-y-datos.md).
function primera(): Pantalla {
  if (!estado().creado) return { nombre: "creacion", modo: "inicio" };
  if (!estado().casaLista) return { nombre: "casa" };
  return { nombre: "mundo" };
}

export function App() {
  const [p, setP] = useState<Pantalla>(primera);
  const ir = (siguiente: Pantalla) => {
    pantalla(siguiente.nombre);
    setP(siguiente);
  };
  if (p.nombre === "creacion") return <Creacion key={p.modo} modo={p.modo} alTerminar={() => ir(primera())} />;
  if (p.nombre === "casa") return <ArmarCasa alTerminar={() => ir(primera())} />;
  return <Mundo alEspejo={() => ir({ nombre: "creacion", modo: "espejo" })} />;
}
