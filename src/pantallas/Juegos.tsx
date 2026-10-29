// The minigames of the story (contenido/escenas.yaml, `minijuego: <nombre>`). Each one covers the world and
// ends with alTerminar; the scene goes on from there. Every minigame is simple and has no wrong answer.
import { useEffect, useState, type ReactElement } from "react";
import { Dibujo } from "./Dibujo";
import { cambiarEstado, estado } from "../datos/guardado";
import { azar } from "../datos/azar";
import { semilla } from "../datos/eventos";
import "./juegos.css";

export interface Resultado {
  marca?: string; // the mark the choice leaves behind (ropero)
  codigo?: string; // the code of the choice (ropero)
}
export type Alto = { alTerminar: (r?: Resultado) => void; alAbortar?: () => void };

const ICONOS_ITEMS: Record<string, string> = {
  Huevos: "🥚",
  Leche: "🥛",
  Queso: "🧀",
  Jamón: "🥓",
  Yogur: "🥣",
  Jugo: "🧃",
  Verduras: "🥦",
  Libreta: "📓",
  Pelota: "⚽",
  Hoja: "📄",
  Mochila: "🎒",
  Lápiz: "✏️",
  Cuerda: "🪢",
  Gis: "🖍️",
};

// Find what is needed among things on a shelf: all the marked ones.
function Buscar({ titulo, items, alTerminar }: Alto & { titulo: string; items: { nombre: string; buscado?: boolean }[] }) {
  const [tocados, setTocados] = useState<number[]>([]);
  const [completado, setCompletado] = useState(false);
  const hallados = tocados.filter((i) => items[i].buscado).length;
  const total = items.filter((x) => x.buscado).length;
  const tocar = (i: number) => {
    if (tocados.includes(i) || completado) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(items[i].buscado ? 25 : 12);
    const nuevos = [...tocados, i];
    setTocados(nuevos);
    if (nuevos.filter((k) => items[k].buscado).length === total) {
      setCompletado(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([30, 50, 30]);
      setTimeout(() => alTerminar(), 600);
    }
  };
  return (
    <div className={`juego${completado ? " exito" : ""}`}>
      <h2>{titulo}</h2>
      <div className="juego-cuadricula">
        {items.map((x, i) => {
          const tocada = tocados.includes(i);
          const acertada = tocada && x.buscado;
          return (
            <button
              key={i}
              className={`boton juego-celda${tocada ? " tocada" : ""}${acertada ? " acertada" : ""}`}
              onClick={() => tocar(i)}
            >
              <span className="juego-icono" aria-hidden="true">{ICONOS_ITEMS[x.nombre] ?? "📦"}</span>
              <span className="juego-texto">{x.nombre}</span>
            </button>
          );
        })}
      </div>
      <p className="juego-cuenta">
        {completado ? "¡Listo! ✨" : `${hallados} de ${total}`}
      </p>
    </div>
  );
}

function generarRefri(sem: string) {
  const r = azar(`${sem}:refri`);
  const base = [
    { nombre: "Leche" },
    { nombre: "Jamón" },
    { nombre: "Queso" },
    { nombre: "Yogur" },
    { nombre: "Jugo" },
    { nombre: "Verduras" },
    { nombre: "Huevos", buscado: true },
    { nombre: "Huevos", buscado: true },
    { nombre: "Huevos", buscado: true },
  ];
  return r.barajar(base);
}

function generarPistas(sem: string) {
  const r = azar(`${sem}:pistas`);
  const lista = ["Libreta", "Pelota", "Hoja", "Mochila", "Lápiz", "Cuerda", "Gis"];
  return r.barajar(lista.map((nombre) => ({ nombre, buscado: ["Libreta", "Hoja", "Lápiz"].includes(nombre) })));
}

// Hold the button to heat the stove: the bar fills while it is held.
function Estufa({ alTerminar }: Alto) {
  const [nivel, setNivel] = useState(0);
  const [apretando, setApretando] = useState(false);
  const [completado, setCompletado] = useState(false);
  useEffect(() => {
    if (!apretando || completado) return;
    const id = setInterval(() => {
      setNivel((n) => {
        const sig = Math.min(100, n + 2.5);
        if (sig >= 100) {
          setCompletado(true);
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([25, 45, 25]);
          setTimeout(() => alTerminar({ marca: "estufa_prendida" }), 500);
        }
        return sig;
      });
    }, 45);
    return () => clearInterval(id);
  }, [apretando, completado]);
  return (
    <div className={`juego${completado ? " exito" : ""}`}>
      <h2>{completado ? "¡Estufa lista! 🔥" : "Prende la estufa"}</h2>
      <div className="juego-barra">
        <span style={{ width: `${nivel}%` }} />
      </div>
      <button
        className={`boton principal juego-mantener${apretando ? " caliente" : ""}`}
        onPointerDown={() => {
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
          setApretando(true);
        }}
        onPointerUp={() => setApretando(false)}
        onPointerLeave={() => setApretando(false)}
      >
        {completado ? "¡Caliente! ✨" : apretando ? "🔥 Calentando..." : "Mantén presionado"}
      </button>
    </div>
  );
}

// Three sets of clothes. The one chosen is the one the child wears in the world.
const ROPA = [
  { nombre: "Uniforme", icono: "👔", marca: "ropa_uniforme", codigo: "ELIGE_UNIFORME", ropa: "uniforme" as const },
  { nombre: "Ropa de deporte", icono: "👟", marca: "ropa_deporte", codigo: "ELIGE_DEPORTE", ropa: "casa" as const },
  { nombre: "Ropa casual", icono: "👕", marca: "ropa_casual", codigo: "ELIGE_CASUAL", ropa: "casa" as const },
];

function Ropero({ alTerminar }: Alto) {
  const elegir = (o: (typeof ROPA)[number]) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(20);
    cambiarEstado({ apariencia: { ...estado().apariencia, ropa: o.ropa } }, true);
    alTerminar({ marca: o.marca, codigo: o.codigo });
  };
  return (
    <div className="juego">
      <h2>¿Qué te pones hoy?</h2>
      <div className="juego-opciones">
        {ROPA.map((o) => (
          <button key={o.marca} className="boton principal juego-ropa-btn" onClick={() => elegir(o)}>
            <span className="juego-icono-ropa" aria-hidden="true">{o.icono}</span>
            <span>{o.nombre}</span>
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
function Dibujar({ alTerminar, alAbortar }: Alto) {
  return (
    <Dibujo
      origen="minijuego-dibujo"
      consigna="Dibuja lo que quieras."
      alAbortar={alAbortar}
      alTerminar={(imagen) => {
        if (imagen) cambiarEstado({ libro: [...estado().libro, { dibujo: imagen, cuando: Date.now() }] }, true);
        alTerminar();
      }}
    />
  );
}

const BANCO_EXAMEN = [
  { pregunta: "¿Cuánto es 7 + 5?", opciones: ["11", "12", "13"] },
  { pregunta: "¿Qué día va después del martes?", opciones: ["Lunes", "Miércoles", "Jueves"] },
  { pregunta: "¿Cuántas patas tiene un perro?", opciones: ["2", "6", "4"] },
  { pregunta: "¿Qué número sigue? 2, 4, 6, __", opciones: ["7", "8", "9"] },
  { pregunta: "¿Cuántos días tiene una semana?", opciones: ["5", "7", "10"] },
  { pregunta: "¿Cuál objeto se usa para medir el tiempo?", opciones: ["Reloj", "Regla", "Báscula"] },
];

function generarExamen(sem: string) {
  const r = azar(`${sem}:examen`);
  const barajadas = r.barajar(BANCO_EXAMEN).slice(0, 4);
  return barajadas.map((q) => ({ pregunta: q.pregunta, opciones: r.barajar(q.opciones) }));
}

// Four short questions. No answer is right or wrong on screen: the choices are logged and the test goes on.
function Examen({ preguntas, alTerminar }: Alto & { preguntas: { pregunta: string; opciones: string[] }[] }) {
  const [i, setI] = useState(0);
  const siguiente = () => (i + 1 === preguntas.length ? alTerminar({ marca: "hizo_examen" }) : setI(i + 1));
  const q = preguntas[i];
  return (
    <div className="juego">
      <h2>
        Examen {i + 1} de {preguntas.length}
      </h2>
      <p className="juego-pregunta">{q.pregunta}</p>
      <div className="juego-opciones">
        {q.opciones.map((o) => (
          <button key={o} className="boton principal" onClick={siguiente}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

const PRODUCTOS_TIENDA = [
  { nombre: "Leche", precio: 25 },
  { nombre: "Pan", precio: 18 },
  { nombre: "Huevos", precio: 42 },
  { nombre: "Manzanas", precio: 30 },
  { nombre: "Jugo", precio: 22 },
  { nombre: "Tortillas", precio: 24 },
  { nombre: "Frijoles", precio: 28 },
  { nombre: "Arroz", precio: 20 },
];
const PRESUPUESTO = 120;

function generarTienda(sem: string) {
  const r = azar(`${sem}:tienda`);
  return r.barajar(PRODUCTOS_TIENDA).slice(0, 5);
}

// Buy from the list with $120. Going over is not allowed; the change is shown at the end.
function Tienda({ items, alTerminar }: Alto & { items: { nombre: string; precio: number }[] }) {
  const [carrito, setCarrito] = useState<number[]>([]);
  const total = carrito.reduce((a, i) => a + items[i].precio, 0);
  const alternar = (i: number) => setCarrito(carrito.includes(i) ? carrito.filter((k) => k !== i) : [...carrito, i]);
  return (
    <div className="juego">
      <h2>Compras · ${PRESUPUESTO}</h2>
      <div className="juego-cuadricula">
        {items.map((x, i) => {
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
      <button className="boton principal" disabled={carrito.length === 0} onClick={() => alTerminar({ marca: "hizo_compras" })}>
        Pagar
      </button>
    </div>
  );
}

export const JUEGOS: Record<string, (p: Alto) => ReactElement> = {
  refri: (p) => <Buscar titulo="Busca lo del desayuno" items={generarRefri(`${semilla()}:${estado().dia}`)} {...p} />,
  estufa: (p) => <Estufa {...p} />,
  ropero: (p) => <Ropero {...p} />,
  cuerda: (p) => <Cuerda {...p} />,
  dibujo: (p) => <Dibujar {...p} />,
  pistas: (p) => <Buscar titulo="Busca las pistas en el patio" items={generarPistas(`${semilla()}:${estado().dia}`)} {...p} />,
  examen: (p) => <Examen preguntas={generarExamen(`${semilla()}:${estado().dia}`)} {...p} />,
  tienda: (p) => <Tienda items={generarTienda(`${semilla()}:${estado().dia}`)} {...p} />,
};
