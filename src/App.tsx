import { useEffect, useState } from "react";
import { Creacion, Portada } from "./pantallas/Creacion";
import { Mundo } from "./pantallas/Mundo";
import { Siempre } from "./ui/Siempre";
import { estado } from "./datos/guardado";
import { pantalla } from "./datos/monitor";

type Pantalla = { nombre: "creacion"; modo: "inicio" | "espejo" } | { nombre: "portada" } | { nombre: "mundo" };

// Where the child picks up: their character first, then their house, then the world.
function primera(): Pantalla {
  if (!estado().creado) return { nombre: "creacion", modo: "inicio" };
  return { nombre: "mundo" };
}

// Opening the game with a saved game shows the three ways on from it, once; a new player goes straight to creation.
const alAbrir = (): Pantalla => (estado().creado ? { nombre: "portada" } : primera());

export function App() {
  const [p, setP] = useState<Pantalla>(alAbrir);
  // Every screen shown is recorded, the first one included (funnels and drop-off).
  useEffect(() => pantalla(p.nombre), [p]);
  const ir = setP;
  const alEspejo = () => ir({ nombre: "creacion", modo: "espejo" });
  // Siempre a la mano sits over every screen, so it wraps whichever one is shown.
  const visible =
    p.nombre === "creacion" ? (
      <Creacion key={p.modo} modo={p.modo} alTerminar={(otro) => ir(otro ? { nombre: "portada" } : primera())} />
    ) : p.nombre === "portada" ? (
      <Portada alContinuar={() => ir(primera())} alEspejo={alEspejo} />
    ) : (
      <Mundo alEspejo={alEspejo} />
    );
  return (
    <Siempre pantalla={p.nombre} alEspejo={p.nombre === "mundo" ? alEspejo : undefined}>
      {visible}
    </Siempre>
  );
}
