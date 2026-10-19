import { useState } from "react";
import { Asentimiento } from "./pantallas/Asentimiento";
import { Creacion } from "./pantallas/Creacion";
import { Continuara } from "./pantallas/Continuara";
import { estado } from "./datos/guardado";
import { preguntado } from "./datos/eventos";
import { pantalla } from "./datos/monitor";

type Pantalla = { nombre: "asentimiento" } | { nombre: "creacion"; modo: "inicio" | "espejo" } | { nombre: "continuara" };

// Where the child picks up: their own yes first, then their character, then the game.
function primera(): Pantalla {
  if (!preguntado()) return { nombre: "asentimiento" };
  if (!estado().creado) return { nombre: "creacion", modo: "inicio" };
  return { nombre: "continuara" };
}

export function App() {
  const [p, setP] = useState<Pantalla>(primera);
  const ir = (siguiente: Pantalla) => {
    pantalla(siguiente.nombre);
    setP(siguiente);
  };
  if (p.nombre === "asentimiento") return <Asentimiento alResponder={() => ir(primera())} />;
  if (p.nombre === "creacion") return <Creacion key={p.modo} modo={p.modo} alTerminar={() => ir({ nombre: "continuara" })} />;
  return <Continuara alCambiar={() => ir({ nombre: "creacion", modo: "espejo" })} />;
}
