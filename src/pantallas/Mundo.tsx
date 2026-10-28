// The world: one place at a time. Walking and running are in mundo/motor.ts; this screen holds
// the rules: doors and their hours with a sign on each one, the bed, the mirror and what a tap says.
import { useEffect, useRef, useState } from "react";
import contenido, { type Escena } from "virtual:contenido";
import { cargarMapa, quitarAusentes, visible, type Mapa, type Puerta, type Punto } from "../mundo/mapa";
import { Motor } from "../mundo/motor";
import { pieza } from "../lienzo/arte";
import { capas, coloresDe } from "../personaje/apariencia";
import { estado, cambiarEstado, type Estado } from "../datos/guardado";
import { bloqueo, revisarHora, dormir } from "../datos/dia";
import { escenaPara } from "../datos/escenas";
import { Escena as EscenaEnCurso } from "./Escena";
import { registrar } from "../datos/eventos";
import { Bocina } from "../ui/Bocina";
import { Icono } from "../ui/iconos";
import { useSuperpuesto } from "../ui/Siempre";
import "./mundo.css";

const M = contenido.textos.mundo;
const CAIDA = 6; // the walker's body center sits 6 game pixels above the feet

const dentro = (r: { x: number; y: number; w: number; h: number }, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// The first door on the shortest way from one place to another, over the door graph of all maps.
function primerPaso(desde: string, meta: string): string | null {
  const previo = new Map<string, string>();
  const cola = [desde];
  const vistos = new Set(cola);
  for (let i = 0; i < cola.length; i++) {
    const l = cola[i];
    if (l === meta) break;
    for (const d of contenido.conexiones[l] ?? [])
      if (!vistos.has(d)) {
        vistos.add(d);
        previo.set(d, l);
        cola.push(d);
      }
  }
  if (!vistos.has(meta)) return null;
  let paso = meta;
  while (previo.get(paso) !== desde) paso = previo.get(paso)!;
  return paso;
}

// The sign over a door: where it leads. Inside the same building a place has its inside name ("Patio").
export const nombreSalida = (desde: string, destino: string) => (desde.split("_")[0] === destino.split("_")[0] && M.lugares_dentro[destino]) || M.lugares[destino];

// Where the day goes next: the school in the morning, home in the afternoon, bed at night.
// The ring sits on the door toward it (or on the bed), and its sign and the edge arrow say its name.
function guiaDe(m: Mapa): { x: number; y: number; nombre: string; puerta: string | null } | null {
  const { hora } = estado();
  const meta = hora === "manana" ? "escuela_patio" : "casa";
  if (hora === "manana" && m.lugar.startsWith("escuela")) return null;
  if (m.lugar === meta) {
    const cama = m.puntos.find((p) => p.nombre === "cama");
    return hora === "noche" && cama ? { x: cama.x, y: cama.y - 16, nombre: M.a_dormir, puerta: null } : null;
  }
  const paso = primerPaso(m.lugar, meta);
  const puerta = m.puertas.find((p) => p.destino === paso);
  return puerta ? { x: puerta.x + puerta.w / 2, y: puerta.y + puerta.h / 2, nombre: nombreSalida(m.lugar, puerta.destino), puerta: puerta.nombre } : null;
}

// Where the child starts: the arrival of a door, or where they stopped, or where they put their
// character in the house.
function inicioDe(m: Mapa, e: Estado) {
  if (e.llegada && m.llegadas[e.llegada]) return m.llegadas[e.llegada];
  if (e.x !== null && e.y !== null) return { x: e.x, y: e.y };
  return m.inicio;
}

// Everything the place draws is read before the first frame, so the loop never waits.
async function cargarArte(m: Mapa, e: Estado) {
  await Promise.all([
    pieza(`lugares/${m.lugar}/fondo`),
    ...m.puntos.map((p) => pieza(p.arte)),
    ...capas(e.apariencia).map((id) => pieza(id, coloresDe(e.apariencia))),
  ]);
}

export function Mundo({ alEspejo }: { alEspejo: () => void }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const accion = useRef<{ tocar: (cx: number, cy: number) => void } | null>(null);
  const alEspejoRef = useRef(alEspejo);
  alEspejoRef.current = alEspejo;
  const temporizador = useRef(0);
  const motorRef = useRef<Motor | null>(null);
  // Mi libro, Opciones or the "Quiero hablar" card cover the screen (Siempre.tsx): the world stands still under them.
  const superpuesto = useSuperpuesto();
  const [recarga, setRecarga] = useState(0);
  const [cubierto, setCubierto] = useState(true);
  const [burbuja, setBurbuja] = useState<{ id: number; clave: string; texto: string } | null>(null);
  const [cartel, setCartel] = useState<{ texto: string } | null>(null);
  const [mapa, setMapa] = useState<Mapa | null>(null);
  const [guia, setGuia] = useState<ReturnType<typeof guiaDe>>(null);
  const [corriendo, setCorriendo] = useState(false);
  // A scene of the story is on: the world stands still under it, and the mission shows once it is over.
  const [escena, setEscena] = useState<{ escena: Escena; alFin: () => void } | null>(null);
  const [mision, setMision] = useState(estado().historia.mision);

  useEffect(() => {
    motorRef.current?.pausar(superpuesto || !!escena);
  }, [superpuesto, escena]);

  useEffect(() => {
    if (motorRef.current) motorRef.current.corriendo = corriendo;
  }, [corriendo]);

  // One place per run of this effect: a door, a new day or a return from the mirror starts it again.
  useEffect(() => {
    const e0 = estado();
    const lugarActual = e0.lugar;
    const visitas = (e0.visitas[lugarActual] ?? 0) + 1;
    const t0 = performance.now();
    let vivo = true;
    let activo: Motor | null = null;
    let puerta: string | null = null;
    let corriendoDesde = 0; // when the current run started
    setBurbuja(null);

    const mostrar = (clave: string, texto: string) => {
      setBurbuja({ id: Date.now(), clave, texto });
      clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(() => setBurbuja(null), Math.max(3500, texto.length * 70));
    };

    // Going to bed: a line, then the next day (or the closing card after the last one).
    // A scene starts over the world. When it is over, a changed look is drawn again and then `alFin` goes on
    // (a door crossing waits for its scene).
    const iniciarEscena = (e: Escena, alFin: () => void = () => {}) => {
      const antes = estado().apariencia;
      setEscena({
        escena: e,
        alFin: () => {
          setEscena(null);
          setMision(estado().historia.mision);
          if (estado().apariencia !== antes) setRecarga((r) => r + 1);
          alFin();
        },
      });
    };

    const dormirse = () => {
      activo?.pausar(true);
      mostrar("mundo.dormir", M.dormir);
      window.setTimeout(() => {
        const dia = dormir();
        if (dia === null) return setCartel({ texto: M.fin });
        setCartel({ texto: M.dia.replace("{n}", String(dia)) });
        window.setTimeout(() => {
          setCartel(null);
          setRecarga((r) => r + 1);
        }, 2500);
      }, 1200);
    };

    const usar = (p: Punto) => {
      const e = escenaPara(lugarActual, p.nombre);
      if (e) return iniciarEscena(e);
      registrar("explora", { lugar: lugarActual, objeto: p.nombre });
      if (p.nombre === "espejo") return alEspejoRef.current();
      if (p.nombre === "cama" && estado().hora === "noche") return dormirse();
      mostrar(`mundo.objetos.${lugarActual}.${p.nombre}`, M.objetos[lugarActual]?.[p.nombre] ?? M.objetos.comun[p.nombre]);
    };

    // Fixed people only greet with neutral lines; the line changes with each visit.
    const saludar = (p: Punto) => {
      const e = escenaPara(lugarActual, p.nombre);
      if (e) return iniciarEscena(e);
      registrar("explora", { lugar: lugarActual, persona: p.nombre });
      const saludos = M.saludos[p.nombre];
      const i = (estado().visitas[lugarActual] ?? 0) % saludos.length;
      mostrar(`mundo.saludos.${p.nombre}.${i}`, saludos[i]);
    };

    const cruzar = (p: Puerta) => {
      const no = bloqueo(lugarActual, p.horas);
      if (no) return mostrar(`mundo.${no}`, M[no]);
      const e = escenaPara(lugarActual, `salir:${p.destino}`);
      if (e) return iniciarEscena(e, () => irse(p));
      irse(p);
    };

    const irse = (p: Puerta) => {
      activo?.pausar(true);
      cambiarEstado({ lugar: p.destino, llegada: p.llegada, x: null, y: null }, true);
      revisarHora(p.destino, lugarActual);
      setCubierto(true);
      window.setTimeout(() => setRecarga((r) => r + 1), 220);
    };

    void cargarMapa(lugarActual, e0.semilla).then(async (m) => {
      quitarAusentes(m, e0.hora);
      await cargarArte(m, e0);
      if (!vivo) return;
      const inicio = inicioDe(m, e0);
      puerta = m.puertas.find((d) => dentro(d, inicio.x, inicio.y - CAIDA))?.nombre ?? null;
      cambiarEstado({ llegada: null, x: Math.round(inicio.x), y: Math.round(inicio.y), visitas: { ...estado().visitas, [lugarActual]: visitas } });
      const motor = new Motor({
        canvas: lienzo.current!,
        mapa: m,
        x: inicio.x,
        y: inicio.y,
        dir: e0.direccion,
        apariencia: e0.apariencia,
        figuras: [],
        hora: e0.hora,
        alTocar: (cx, cy) => accion.current?.tocar(cx, cy),
        alCuadro: () => {
          if (motor.moviendo) cambiarEstado({ x: Math.round(motor.x), y: Math.round(motor.y), direccion: motor.dir });
          const p = m.puertas.find((d) => dentro(d, motor.x, motor.y - CAIDA));
          if (!p) puerta = null;
          else if (puerta !== p.nombre) {
            puerta = p.nombre;
            cruzar(p);
          }
          const ahora = performance.now();
          if (motor.rapido && !corriendoDesde) corriendoDesde = ahora;
          if (!motor.rapido && corriendoDesde) {
            registrar("corre", { lugar: lugarActual, ms: Math.round(ahora - corriendoDesde) });
            corriendoDesde = 0;
          }
        },
      });
      motor.corriendo = corriendo;
      const alEntrar = escenaPara(lugarActual, "entrar");
      if (alEntrar) iniciarEscena(alEntrar);
      const g = guiaDe(m);
      motor.guia = g;
      motor.pausar(superpuesto);
      activo = motor;
      motorRef.current = motor;
      accion.current = {
        tocar: (cx, cy) => {
          if (motor.pausado) return;
          const p = motor.puntoEn(cx, cy);
          if (p?.tipo === "objeto") motor.irA(p, () => usar(p));
          else if (p?.tipo === "npc") motor.irA(p, () => saludar(p));
          else motor.tocarSuelo(cx, cy);
        },
      };
      setMapa(m);
      setGuia(g);
      motor.iniciar();
      setCubierto(false);
    });

    return () => {
      vivo = false;
      accion.current = null;
      clearTimeout(temporizador.current);
      if (activo) {
        activo.detener();
        registrar("explora", { lugar: lugarActual, ms: Math.round(performance.now() - t0), visitas });
      }
      motorRef.current = null;
    };
  }, [recarga]);

  return (
    <main className="mundo">
      <canvas ref={lienzo} className="mundo-lienzo" />

      {/* A nameplate under the fixed people here and under the child. */}
      {mapa?.puntos.filter((p) => p.tipo === "npc" && visible(p, estado().hora)).map((p) => (
        <div key={p.nombre} className="nombre-mundo" data-mundo-x={p.x} data-mundo-y={p.y} aria-hidden="true">
          <span className="placa">{M.nombres[p.nombre]}</span>
        </div>
      ))}
      {mapa && estado().nombre && (
        <div className="nombre-mundo" data-mundo-sigue="prota" aria-hidden="true">
          <span className="placa">{estado().nombre}</span>
        </div>
      )}

      {/* A sign on every door: where it leads, dimmed with a lock when it is closed now. */}
      {mapa?.puertas.map((d) => {
        const cerrada = !!bloqueo(mapa.lugar, d.horas);
        return (
          <div key={d.nombre} className={`letrero${cerrada ? " cerrada" : ""}${guia?.puerta === d.nombre ? " guia" : ""}`} data-mundo-x={d.x + d.w / 2} data-mundo-y={d.y + d.h / 2} aria-hidden="true">
            <span>
              {cerrada && Icono.candado}
              {nombreSalida(mapa.lugar, d.destino)}
            </span>
          </div>
        );
      })}
      <div className="letrero guia flecha-texto" data-flecha hidden aria-hidden="true">
        <span>{guia?.nombre}</span>
      </div>

      <div className="controles mundo-controles">
        <button className="boton redondo" aria-label="Acercar" onClick={() => motorRef.current?.acercar()}>
          {Icono.mas}
        </button>
        <button className="boton redondo" aria-label="Alejar" onClick={() => motorRef.current?.alejar()}>
          {Icono.menos}
        </button>
        <button className="boton redondo" aria-label="Centrar en el personaje" onClick={() => motorRef.current?.centrar()}>
          {Icono.encuadrar}
        </button>
        <button className="boton redondo correr" aria-label={M.correr} aria-pressed={corriendo} onClick={() => setCorriendo((c) => !c)}>
          {Icono.correr}
        </button>
      </div>

      {burbuja && (
        <div key={burbuja.id} className="globo" role="status">
          <p>{burbuja.texto}</p>
          <Bocina clave={burbuja.clave} texto={burbuja.texto} />
        </div>
      )}

      {escena && <EscenaEnCurso escena={escena.escena} alTerminar={escena.alFin} />}
      {mision && !escena && <p className="mision-mundo">{contenido.textos.escena.mision}: {mision}</p>}

      <div className={`velo-mundo${cubierto ? " cubierto" : ""}`} />

      {cartel && (
        <div className="cartel" role="status">
          <p>{cartel.texto}</p>
        </div>
      )}
    </main>
  );
}
