// The minigames of the story (contenido/escenas.yaml, `minijuego: <nombre>`). Each one covers the world and
// ends with alTerminar; the scene goes on from there. Every minigame is simple and has no wrong answer.
import { useEffect, useState, type ReactElement } from "react";
import { Dibujo } from "./Dibujo";
import { cambiarEstado, estado } from "../datos/guardado";
import "./juegos.css";

export interface Resultado {
  marca?: string; // the mark the choice leaves behind (ropero)
  codigo?: string; // the code of the choice (ropero)
}
type Alto = { alTerminar: (r?: Resultado) => void };

// Find what is needed among things on a shelf: all the marked ones.
function Buscar({ titulo, items, alTerminar }: Alto & { titulo: string; items: { nombre: string; buscado?: boolean }[] }) {
  const [tocados, setTocados] = useState<number[]>([]);
  const hallados = tocados.filter((i) => items[i].buscado).length;
  const total = items.filter((x) => x.buscado).length;
  const tocar = (i: number) => {
    if (tocados.includes(i)) return;
    const nuevos = [...tocados, i];
    setTocados(nuevos);
    if (nuevos.filter((k) => items[k].buscado).length === total) alTerminar();
  };
  return (
    <div className="juego">
      <h2>{titulo}</h2>
      <div className="juego-cuadricula">
        {items.map((x, i) => (
          <button key={i} className={`boton juego-celda${tocados.includes(i) ? " tocada" : ""}`} onClick={() => tocar(i)}>
            {x.nombre}
          </button>
        ))}
      </div>
      <p className="juego-cuenta">
        {hallados} de {total}
      </p>
    </div>
  );
}

const REFRI = [{ nombre: "Leche" }, { nombre: "Huevos", buscado: true }, { nombre: "Jamón" }, { nombre: "Queso" }, { nombre: "Huevos", buscado: true }, { nombre: "Yogur" }, { nombre: "Huevos", buscado: true }, { nombre: "Jugo" }, { nombre: "Verduras" }];
const PISTAS = ["Libreta", "Pelota", "Hoja", "Mochila", "Lápiz", "Cuerda", "Gis"].map((nombre) => ({ nombre, buscado: ["Libreta", "Hoja", "Lápiz"].includes(nombre) }));

// Hold the button to heat the stove: the bar fills while it is held.
function Estufa({ alTerminar }: Alto) {
  const [nivel, setNivel] = useState(0);
  const [apretando, setApretando] = useState(false);
  useEffect(() => {
    if (!apretando) return;
    const id = setInterval(() => setNivel((n) => Math.min(100, n + 2)), 50);
    return () => clearInterval(id);
  }, [apretando]);
  useEffect(() => {
    if (nivel >= 100) alTerminar();
  }, [nivel]);
  return (
    <div className="juego">
      <h2>Prende la estufa</h2>
      <div className="juego-barra">
        <span style={{ width: `${nivel}%` }} />
      </div>
      <button
        className="boton principal juego-mantener"
        onPointerDown={() => setApretando(true)}
        onPointerUp={() => setApretando(false)}
        onPointerLeave={() => setApretando(false)}
      >
        Mantén presionado
      </button>
    </div>
  );
}

// Three sets of clothes. The one chosen is the one the child wears in the world.
const ROPA = [
  { nombre: "Uniforme", marca: "ropa_uniforme", codigo: "ELIGE_UNIFORME", ropa: "uniforme" as const },
  { nombre: "Ropa de deporte", marca: "ropa_deporte", codigo: "ELIGE_DEPORTE", ropa: "casa" as const },
  { nombre: "Ropa casual", marca: "ropa_casual", codigo: "ELIGE_CASUAL", ropa: "casa" as const },
];

function Ropero({ alTerminar }: Alto) {
  const elegir = (o: (typeof ROPA)[number]) => {
    cambiarEstado({ apariencia: { ...estado().apariencia, ropa: o.ropa } }, true);
    alTerminar({ marca: o.marca, codigo: o.codigo });
  };
  return (
    <div className="juego">
      <h2>¿Qué te pones hoy?</h2>
      <div className="juego-opciones">
        {ROPA.map((o) => (
          <button key={o.marca} className="boton principal" onClick={() => elegir(o)}>
            {o.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}

// Tap when the rope is low: five times is enough. A miss only means the next try.
function Cuerda({ alTerminar }: Alto) {
  const [ronda, setRonda] = useState(0);
  const [ventana, setVentana] = useState(false);
  const [aciertos, setAciertos] = useState(0);
  useEffect(() => {
    if (aciertos >= 5) return void alTerminar();
    const a = setTimeout(() => setVentana(true), 900);
    const b = setTimeout(() => {
      setVentana(false);
      setRonda((r) => r + 1);
    }, 1700);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [ronda, aciertos]);
  const saltar = () => {
    if (!ventana) return;
    setVentana(false);
    setAciertos((n) => n + 1);
  };
  return (
    <div className="juego">
      <h2>Salta la cuerda</h2>
      <p className="juego-cuenta">{aciertos} de 5</p>
      <button className={`boton principal juego-saltar${ventana ? " lista" : ""}`} onClick={saltar}>
        {ventana ? "¡Ahora!" : "Espera"}
      </button>
    </div>
  );
}

// Keep a drawing: Mi libro gets the page, as on the sheet of its own.
function Dibujar({ alTerminar }: Alto) {
  return (
    <Dibujo
      origen="minijuego-dibujo"
      consigna="Dibuja lo que quieras."
      alTerminar={(imagen) => {
        if (imagen) cambiarEstado({ libro: [...estado().libro, { dibujo: imagen, cuando: Date.now() }] }, true);
        alTerminar();
      }}
    />
  );
}

const EXAMEN = [
  { pregunta: "¿Cuánto es 7 + 5?", opciones: ["11", "12", "13"] },
  { pregunta: "¿Qué día va después del martes?", opciones: ["Lunes", "Miércoles", "Jueves"] },
  { pregunta: "¿Cuántas patas tiene un perro?", opciones: ["2", "6", "4"] },
  { pregunta: "¿Qué número sigue? 2, 4, 6, __", opciones: ["7", "8", "9"] },
];

// Four short questions. No answer is right or wrong on screen: the choices are logged and the test goes on.
function Examen({ alTerminar }: Alto) {
  const [i, setI] = useState(0);
  const siguiente = () => (i + 1 === EXAMEN.length ? alTerminar() : setI(i + 1));
  return (
    <div className="juego">
      <h2>
        Examen {i + 1} de {EXAMEN.length}
      </h2>
      <p className="juego-pregunta">{EXAMEN[i].pregunta}</p>
      <div className="juego-opciones">
        {EXAMEN[i].opciones.map((o) => (
          <button key={o} className="boton principal" onClick={siguiente}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

const TIENDA = [
  { nombre: "Leche", precio: 25 },
  { nombre: "Pan", precio: 18 },
  { nombre: "Huevos", precio: 42 },
  { nombre: "Manzanas", precio: 30 },
  { nombre: "Jugo", precio: 22 },
];
const PRESUPUESTO = 120;

// Buy from the list with $120. Going over is not allowed; the change is shown at the end.
function Tienda({ alTerminar }: Alto) {
  const [carrito, setCarrito] = useState<number[]>([]);
  const total = carrito.reduce((a, i) => a + TIENDA[i].precio, 0);
  const alternar = (i: number) => setCarrito(carrito.includes(i) ? carrito.filter((k) => k !== i) : [...carrito, i]);
  return (
    <div className="juego">
      <h2>Compras · ${PRESUPUESTO}</h2>
      <div className="juego-cuadricula">
        {TIENDA.map((x, i) => {
          const sube = !carrito.includes(i) && total + x.precio > PRESUPUESTO;
          return (
            <button key={x.nombre} className={`boton juego-celda${carrito.includes(i) ? " tocada" : ""}`} disabled={sube} onClick={() => alternar(i)}>
              {x.nombre} ${x.precio}
            </button>
          );
        })}
      </div>
      <p className="juego-cuenta">
        Total ${total} · Cambio ${PRESUPUESTO - total}
      </p>
      <button className="boton principal" disabled={carrito.length === 0} onClick={() => alTerminar()}>
        Pagar
      </button>
    </div>
  );
}

export const JUEGOS: Record<string, (p: Alto) => ReactElement> = {
  refri: (p) => <Buscar titulo="Busca lo del desayuno" items={REFRI} {...p} />,
  estufa: (p) => <Estufa {...p} />,
  ropero: (p) => <Ropero {...p} />,
  cuerda: (p) => <Cuerda {...p} />,
  dibujo: (p) => <Dibujar {...p} />,
  pistas: (p) => <Buscar titulo="Busca las pistas en el patio" items={PISTAS} {...p} />,
  examen: (p) => <Examen {...p} />,
  tienda: (p) => <Tienda {...p} />,
};
