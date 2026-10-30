// The minigames of the story (contenido/escenas.yaml, `minijuego: <nombre>`). Each one covers the world and
// ends with alTerminar; the scene goes on from there. Every minigame is simple and has no wrong answer.
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Dibujo } from "./Dibujo";
import { Personaje } from "../lienzo/Personaje";
import { Icono } from "../ui/iconos";
import { sonarSalto } from "../ui/sonido";
import { cambiarEstado, estado } from "../datos/guardado";
import { azar } from "../datos/azar";
import { semilla } from "../datos/eventos";
import "./juegos.css";

export interface Resultado {
  marca?: string; // the mark the choice leaves behind (ropero)
  codigo?: string; // the code of the choice (ropero)
  resultado?: "sin_respuesta";
  motivo?: string;
}
export type Alto = {
  alTerminar: (r?: Resultado) => void;
  alProgreso: (progreso: Record<string, unknown>) => void;
};

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

// What the game asks of the child: the voice of the game, not of the story (estilos.css, data-tipo).
function Instruccion({ titulo, children }: { titulo: ReactNode; children?: ReactNode }) {
  return (
    <div className="juego-instruccion" data-tipo="sistema">
      <h2>{titulo}</h2>
      {children}
    </div>
  );
}

// Find what is needed among things on a shelf: all the marked ones.
function Buscar({ titulo, items, alTerminar, alProgreso }: Alto & { titulo: string; items: { nombre: string; buscado?: boolean }[] }) {
  const [tocados, setTocados] = useState<number[]>([]);
  const [completado, setCompletado] = useState(false);
  const hallados = tocados.filter((i) => items[i].buscado).length;
  const total = items.filter((x) => x.buscado).length;
  useEffect(() => alProgreso({ etapa: "busqueda", selecciones: 0, aciertos: 0, total }), [alProgreso, total]);
  const tocar = (i: number) => {
    if (tocados.includes(i) || completado) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(items[i].buscado ? 25 : 12);
    const nuevos = [...tocados, i];
    const nuevosAciertos = nuevos.filter((k) => items[k].buscado).length;
    alProgreso({
      etapa: nuevosAciertos === total ? "completado" : "busqueda",
      selecciones: nuevos.length,
      aciertos: nuevosAciertos,
      total,
      elementos: nuevos.map((k) => ({ nombre: items[k].nombre, buscado: !!items[k].buscado })),
    });
    setTocados(nuevos);
    if (nuevosAciertos === total) {
      setCompletado(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([30, 50, 30]);
      setTimeout(() => alTerminar(), 600);
    }
  };
  return (
    <div className={`juego${completado ? " exito" : ""}`}>
      <Instruccion titulo={titulo} />
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
function Estufa({ alTerminar, alProgreso }: Alto) {
  const [nivel, setNivel] = useState(0);
  const [apretando, setApretando] = useState(false);
  const [completado, setCompletado] = useState(false);
  const presiones = useRef(0);
  useEffect(() => alProgreso({ etapa: "esperando", porcentaje: 0, presiones: 0 }), [alProgreso]);
  useEffect(() => {
    if (!apretando || completado) return;
    const id = setInterval(() => {
      setNivel((n) => {
        const sig = Math.min(100, n + 2.5);
        alProgreso({ etapa: sig >= 100 ? "completado" : "calentando", porcentaje: sig, presiones: presiones.current });
        if (sig >= 100) {
          setCompletado(true);
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([25, 45, 25]);
          setTimeout(() => alTerminar({ marca: "estufa_prendida" }), 500);
        }
        return sig;
      });
    }, 45);
    return () => clearInterval(id);
  }, [apretando, completado, alProgreso]);
  return (
    <div className={`juego${completado ? " exito" : ""}`}>
      <Instruccion titulo={completado ? "¡Estufa lista! 🔥" : "Prende la estufa"} />
      <div className="juego-barra">
        <span style={{ width: `${nivel}%` }} />
      </div>
      <button
        className={`boton principal juego-mantener${apretando ? " caliente" : ""}`}
        onPointerDown={() => {
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
          presiones.current++;
          alProgreso({ etapa: "calentando", porcentaje: nivel, presiones: presiones.current });
          setApretando(true);
        }}
        onPointerUp={() => {
          alProgreso({ etapa: "pausa", porcentaje: nivel, presiones: presiones.current, causa: "solto" });
          setApretando(false);
        }}
        onPointerLeave={() => {
          alProgreso({ etapa: "pausa", porcentaje: nivel, presiones: presiones.current, causa: "salio_del_boton" });
          setApretando(false);
        }}
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

function Ropero({ alTerminar, alProgreso }: Alto) {
  useEffect(() => alProgreso({ etapa: "eleccion", respuestas: 0, opciones: ROPA.length }), [alProgreso]);
  const elegir = (o: (typeof ROPA)[number]) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(20);
    alProgreso({ etapa: "completado", respuestas: 1, opciones: ROPA.length, codigo: o.codigo });
    cambiarEstado({ apariencia: { ...estado().apariencia, ropa: o.ropa } }, true);
    alTerminar({ marca: o.marca, codigo: o.codigo });
  };
  return (
    <div className="juego">
      <Instruccion titulo="¿Qué te pones hoy?" />
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

// Tap when the rope is low: five times is enough. A miss only means the next try. The first turns only show it: the
// character jumps by itself, the button says when, and nothing counts yet.
const DEMOSTRACIONES = 2;
function Cuerda({ alTerminar, alProgreso }: Alto) {
  const [ronda, setRonda] = useState(0);
  const [ventana, setVentana] = useState(false);
  const [aciertos, setAciertos] = useState(0);
  const [intentos, setIntentos] = useState(0);
  const [fallos, setFallos] = useState(0);
  const demostrando = ronda < DEMOSTRACIONES;
  const turno = ronda - DEMOSTRACIONES + 1;
  const figura = useRef<HTMLDivElement>(null);
  // The child's own character, with the sound and the icon of the jump in the world.
  const animarSalto = () => {
    figura.current?.animate([{ transform: "none" }, { transform: "translateY(-40px)" }, { transform: "none" }], { duration: 360, easing: "ease-out" });
    sonarSalto();
  };
  useEffect(() => alProgreso(demostrando ? { etapa: "demostracion" } : { etapa: ventana ? "oportunidad" : "espera", ronda: turno, aciertos, intentos, fallos }), [alProgreso, demostrando, ventana, turno, aciertos, intentos, fallos]);
  useEffect(() => {
    if (aciertos >= 5) return;
    const a = setTimeout(() => setVentana(true), 900);
    const b = setTimeout(() => {
      setVentana(false);
      setRonda((r) => r + 1);
    }, 1700);
    const c = demostrando ? setTimeout(animarSalto, 1110) : undefined; // highest while the rope is at the feet
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
    };
  }, [ronda, aciertos]);
  useEffect(() => {
    if (aciertos < 5) return;
    alProgreso({ etapa: "completado", ronda: turno, aciertos, intentos, fallos });
    alTerminar();
  }, [aciertos, turno, intentos, fallos, alProgreso, alTerminar]);
  const saltar = () => {
    if (demostrando) return;
    animarSalto();
    const nuevosIntentos = intentos + 1;
    setIntentos(nuevosIntentos);
    if (!ventana) {
      const nuevosFallos = fallos + 1;
      setFallos(nuevosFallos);
      alProgreso({ etapa: "espera", ronda: turno, aciertos, intentos: nuevosIntentos, fallos: nuevosFallos });
      return;
    }
    alProgreso({ etapa: aciertos + 1 === 5 ? "completado" : "salto", ronda: turno, aciertos: aciertos + 1, intentos: nuevosIntentos, fallos });
    setVentana(false);
    setAciertos((n) => n + 1);
  };
  // Space jumps here as it does in the world.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      e.preventDefault();
      saltar();
    };
    addEventListener("keydown", tecla);
    return () => removeEventListener("keydown", tecla);
  });
  return (
    <div className="juego">
      <Instruccion titulo="Salta la cuerda">
        <p className="juego-pregunta">{demostrando ? "Mira: salta cuando la cuerda llega a los pies." : "Ahora tú: salta cuando la cuerda llegue a tus pies."}</p>
      </Instruccion>
      <div className="cuerda-escenario" aria-hidden="true">
        {/* keyed by turn: the rope reaches the feet in the middle of the moment to jump */}
        <span key={`${ronda}-${aciertos}`} className="cuerda-arco" />
        <div ref={figura}>
          <Personaje a={estado().apariencia} escala={2} />
        </div>
      </div>
      <p className="juego-cuenta">{aciertos} de 5</p>
      <button className={`boton principal juego-saltar${ventana ? " lista" : ""}`} title="Saltar (Espacio)" aria-disabled={demostrando} onClick={saltar}>
        {Icono.brincar}
        {ventana ? "¡Ahora!" : "Saltar"}
      </button>
    </div>
  );
}

// Keep a drawing: Mi libro gets the page, as on the sheet of its own.
function Dibujar({ alTerminar, alProgreso }: Alto) {
  return (
    <Dibujo
      origen="minijuego-dibujo"
      consigna="Dibuja lo que quieras."
      modoActividad
      alProgreso={alProgreso}
      alTerminar={(imagen) => {
        if (imagen) cambiarEstado({ libro: [...estado().libro, { dibujo: imagen, cuando: Date.now() }] }, true);
        alTerminar({ resultado: imagen ? undefined : "sin_respuesta", motivo: imagen ? undefined : "listo_sin_dibujo" });
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
function Examen({ preguntas, alTerminar, alProgreso }: Alto & { preguntas: { pregunta: string; opciones: string[] }[] }) {
  const [i, setI] = useState(0);
  const respuestas = useRef<{ pregunta: number; respuesta: string }[]>([]);
  useEffect(() => alProgreso({ etapa: "pregunta", pregunta: 1, respondidas: 0, total: preguntas.length, respuestas: [] }), [alProgreso, preguntas.length]);
  const responder = (respuesta: string) => {
    const nuevas = [...respuestas.current, { pregunta: i + 1, respuesta }];
    respuestas.current = nuevas;
    if (i + 1 === preguntas.length) {
      alProgreso({ etapa: "completado", pregunta: i + 1, respondidas: nuevas.length, total: preguntas.length, respuestas: nuevas });
      alTerminar({ marca: "hizo_examen" });
    } else {
      alProgreso({ etapa: "pregunta", pregunta: i + 2, respondidas: nuevas.length, total: preguntas.length, respuestas: nuevas });
      setI(i + 1);
    }
  };
  const q = preguntas[i];
  return (
    <div className="juego">
      <Instruccion titulo={`Examen ${i + 1} de ${preguntas.length}`}>
        <p className="juego-pregunta">{q.pregunta}</p>
      </Instruccion>
      <div className="juego-opciones">
        {q.opciones.map((o) => (
          <button key={o} className="boton principal" onClick={() => responder(o)}>
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
function Tienda({ items, alTerminar, alProgreso }: Alto & { items: { nombre: string; precio: number }[] }) {
  const [carrito, setCarrito] = useState<number[]>([]);
  const total = carrito.reduce((a, i) => a + items[i].precio, 0);
  useEffect(() => alProgreso({ etapa: "seleccion", seleccionados: 0, gasto: 0, total: items.length }), [alProgreso, items.length]);
  const alternar = (i: number) => {
    const nuevo = carrito.includes(i) ? carrito.filter((k) => k !== i) : [...carrito, i];
    const gasto = nuevo.reduce((a, k) => a + items[k].precio, 0);
    setCarrito(nuevo);
    alProgreso({ etapa: "seleccion", seleccionados: nuevo.length, gasto, total: items.length, compra: nuevo.map((k) => ({ nombre: items[k].nombre, precio: items[k].precio })) });
  };
  return (
    <div className="juego">
      <Instruccion titulo={`Compras · $${PRESUPUESTO}`} />
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
      <button className="boton principal" disabled={carrito.length === 0} onClick={() => {
        alProgreso({ etapa: "completado", seleccionados: carrito.length, gasto: total, total: items.length, compra: carrito.map((k) => ({ nombre: items[k].nombre, precio: items[k].precio })) });
        alTerminar({ marca: "hizo_compras" });
      }}>
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
