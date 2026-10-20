// The world (GDD §8): one place at a time. Walking and drawing are in mundo/motor.ts; this screen
// holds the rules: doors and their hours, the bed, the mirror, what a tap says, and the stories and
// drawings that start where the child stands (GDD §9, §10). Only the speaker plays a voice (GDD §12).
import { useEffect, useRef, useState } from "react";
import contenido from "virtual:contenido";
import { cargarMapa, quitarAusentes, type Mapa, type Puerta, type Punto } from "../mundo/mapa";
import { Motor } from "../mundo/motor";
import { pieza } from "../lienzo/arte";
import { capas, coloresDe } from "../personaje/apariencia";
import { estado, cambiarEstado, type Estado } from "../datos/guardado";
import { bloqueo, revisarHora, puedeDormir, dormir } from "../datos/dia";
import { siguiente, sitio, tocaAqui, terminar } from "../datos/cuentos";
import { registrar } from "../datos/eventos";
import { Bocina } from "../ui/Bocina";
import { Icono } from "../ui/iconos";
import { Cuento, type EstadoCuerpo } from "./Cuento";
import { Dibujo } from "./Dibujo";
import { Libro } from "./Libro";
import { Actividad, Calma, type TipoActividad } from "./Actividades";
import "./mundo.css";

const M = contenido.textos.mundo;
const CAIDA = 6; // the walker's body center sits 6 game pixels above the feet
const AMBIENTE_MS = 3200; // how long the surroundings look different after a story (GDD §9)

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

// Where the soft ring points: the next story's spot, or the door toward its place (GDD §5).
function guiaDe(m: Mapa): { x: number; y: number } | null {
  const { hora } = estado();
  const c = siguiente();
  let meta: string;
  let zona: { x: number; y: number } | null = null;
  if (c && c.hora === hora) {
    const s = sitio(c.id);
    meta = s.mapa;
    if (s.zona) zona = { x: s.zona.x + s.zona.w / 2, y: s.zona.y + s.zona.h / 2 };
  } else meta = hora === "manana" ? "calle" : "casa";
  if (meta === m.lugar) {
    const cama = m.puntos.find((p) => p.nombre === "cama");
    if (!zona && hora === "noche" && (!c || c.hora !== hora) && cama) zona = { x: cama.x, y: cama.y - 16 };
    return zona;
  }
  const paso = primerPaso(m.lugar, meta);
  const puerta = m.puertas.find((p) => p.destino === paso);
  return puerta ? { x: puerta.x + puerta.w / 2, y: puerta.y + puerta.h / 2 } : null;
}

// Where the child starts: the arrival of a door, or where they stopped, or where they put their
// character in the house (GDD §7).
function inicioDe(m: Mapa, e: Estado) {
  if (e.llegada && m.llegadas[e.llegada]) return m.llegadas[e.llegada];
  if (e.x !== null && e.y !== null) return { x: e.x, y: e.y };
  if (m.lugar === "casa" && e.protaCasa) return e.protaCasa;
  return m.inicio;
}

// Everything the place draws is read before the first frame, so the loop never waits.
async function cargarArte(m: Mapa, e: Estado) {
  await Promise.all([
    pieza(`lugares/${m.lugar}/fondo`),
    ...m.puntos.map((p) => pieza(p.arte)),
    ...(m.lugar === "casa" ? e.casa.map((f) => pieza(`figuras/${f.figura}`, { piel: f.piel })) : []),
    ...capas(e.apariencia).map((id) => pieza(id, coloresDe(e.apariencia))),
  ]);
}

type Abierto =
  | { tipo: "cuento"; id: string }
  | { tipo: "dibujo"; id: string }
  | { tipo: "actividad"; id: string; actividad: TipoActividad }
  | { tipo: "calma"; modo: "calma" | "aterrizaje"; final: boolean }
  | { tipo: "libro" };

export function Mundo({ alEspejo }: { alEspejo: () => void }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const accion = useRef<{ tocar: (cx: number, cy: number) => void } | null>(null);
  const alEspejoRef = useRef(alEspejo);
  alEspejoRef.current = alEspejo;
  const temporizador = useRef(0);
  const motorRef = useRef<Motor | null>(null);
  const mapaRef = useRef<Mapa | null>(null);
  const ocupado = useRef(false); // a story, a drawing or the book is open: the world stands still
  const finAterrizaje = useRef<(() => void) | null>(null); // what goes on after the landing, at bedtime
  const [recarga, setRecarga] = useState(0);
  const [cubierto, setCubierto] = useState(true);
  const [burbuja, setBurbuja] = useState<{ id: number; clave: string; texto: string } | null>(null);
  const [cartel, setCartel] = useState<{ texto: string } | null>(null);
  const [abierto, setAbierto] = useState<Abierto | null>(null);
  const [ambiente, setAmbiente] = useState<EstadoCuerpo | null>(null);

  const abrir = (a: Abierto) => {
    ocupado.current = true;
    motorRef.current?.pausar(true);
    setAbierto(a);
  };

  // Closing a story or a drawing: the world moves again, the ring points at what is next, and a new
  // part of the day (tarde → noche at home) reloads the place so its light changes.
  const cerrarOverlay = () => {
    setAbierto(null);
    ocupado.current = false;
    const motor = motorRef.current;
    const mapa = mapaRef.current;
    if (!motor || !mapa) return;
    motor.pausar(false);
    if (revisarHora(mapa.lugar)) {
      setCubierto(true);
      window.setTimeout(() => setRecarga((r) => r + 1), 400);
      return;
    }
    motor.guia = guiaDe(mapa);
  };

  const alCerrarCuento = (e: EstadoCuerpo | null) => {
    cerrarOverlay();
    if (e) setAmbiente(e);
  };

  useEffect(() => {
    if (!ambiente) return;
    const t = window.setTimeout(() => setAmbiente(null), AMBIENTE_MS);
    return () => clearTimeout(t);
  }, [ambiente]);

  // One place per run of this effect: a door, a new day or a return from the mirror starts it again.
  useEffect(() => {
    const e0 = estado();
    const lugarActual = e0.lugar;
    const visitas = (e0.visitas[lugarActual] ?? 0) + 1;
    const t0 = performance.now();
    let vivo = true;
    let activo: Motor | null = null;
    let puerta: string | null = null;
    setBurbuja(null);

    const mostrar = (clave: string, texto: string) => {
      setBurbuja({ id: Date.now(), clave, texto });
      clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(() => setBurbuja(null), Math.max(3500, texto.length * 70));
    };

    // Going to bed: the landing first (GDD §10), then a line, then the next day (or the closing card after the last one).
    const irADormir = () => {
      finAterrizaje.current = dormirse;
      abrir({ tipo: "calma", modo: "aterrizaje", final: estado().dia >= 3 });
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
      registrar("explora", { lugar: lugarActual, objeto: p.nombre });
      if (p.nombre === "espejo") return alEspejoRef.current();
      if (p.nombre === "cama" && estado().hora === "noche") return puedeDormir() ? irADormir() : mostrar("mundo.sin_sueno", M.sin_sueno);
      mostrar(`mundo.objetos.${lugarActual}.${p.nombre}`, M.objetos[lugarActual]?.[p.nombre] ?? M.objetos.comun[p.nombre]);
    };

    // Fixed people only greet with neutral lines; the line changes with each visit (GDD §8).
    const saludar = (p: Punto) => {
      registrar("explora", { lugar: lugarActual, persona: p.nombre });
      const saludos = M.saludos[p.nombre];
      const i = (estado().visitas[lugarActual] ?? 0) % saludos.length;
      mostrar(`mundo.saludos.${p.nombre}.${i}`, saludos[i]);
    };

    const cruzar = (p: Puerta) => {
      const no = bloqueo(lugarActual, p.destino, p.horas);
      if (no) return mostrar(`mundo.${no}`, M[no]);
      activo?.pausar(true);
      cambiarEstado({ lugar: p.destino, llegada: p.llegada, x: null, y: null }, true);
      revisarHora(p.destino, lugarActual);
      setCubierto(true);
      window.setTimeout(() => setRecarga((r) => r + 1), 220);
    };

    void cargarMapa(lugarActual).then(async (m) => {
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
        figuras: lugarActual === "casa" ? e0.casa.map((f) => ({ x: f.x, y: f.y, id: f.figura, piel: f.piel })) : [],
        hora: e0.hora,
        alCuadro: () => {
          if (motor.moviendo) cambiarEstado({ x: Math.round(motor.x), y: Math.round(motor.y), direccion: motor.dir });
          const p = m.puertas.find((d) => dentro(d, motor.x, motor.y - CAIDA));
          if (!p) puerta = null;
          else if (puerta !== p.nombre) {
            puerta = p.nombre;
            cruzar(p);
          }
          // A story or a drawing starts where the child stands, at its time of day (GDD §4).
          if (!ocupado.current) {
            const c = tocaAqui(lugarActual, motor.x, motor.y - CAIDA);
            if (c?.tipo === "cuento") abrir({ tipo: "cuento", id: c.id });
            else if (c?.tipo === "dibujo") abrir({ tipo: "dibujo", id: c.id });
            else if (c) abrir({ tipo: "actividad", id: c.id, actividad: c.tipo as TipoActividad });
          }
        },
      });
      motor.guia = guiaDe(m);
      activo = motor;
      motorRef.current = motor;
      mapaRef.current = m;
      accion.current = {
        tocar: (cx, cy) => {
          if (motor.pausado) return;
          const p = motor.puntoEn(cx, cy);
          if (p?.tipo === "objeto") motor.irA(p, () => usar(p));
          else if (p?.tipo === "npc") motor.irA(p, () => saludar(p));
          else motor.tocarSuelo(cx, cy);
        },
      };
      motor.iniciar();
      setCubierto(false);
      // Each day starts with the calm, once (GDD §4).
      if (lugarActual === "casa" && e0.hora === "manana" && e0.calma < e0.dia) {
        cambiarEstado({ calma: e0.dia }, true);
        abrir({ tipo: "calma", modo: "calma", final: false });
      }
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
      mapaRef.current = null;
    };
  }, [recarga]);

  const dibujoLibre = abierto?.tipo === "dibujo" ? abierto : null;
  const consignaLibre = contenido.textos.actividades.dibujo_libre;

  return (
    <main className={`mundo${ambiente === "alerta" || ambiente === "saturado" ? " encuadre" : ""}`}>
      <canvas ref={lienzo} className="mundo-lienzo" onPointerDown={(e) => accion.current?.tocar(e.clientX, e.clientY)} />

      {!abierto && (
        <div className="mundo-botones">
          <button className="boton redondo" aria-label="Mi libro" onClick={() => abrir({ tipo: "libro" })}>
            {Icono.libro}
          </button>
        </div>
      )}

      {burbuja && (
        <div key={burbuja.id} className="globo" role="status">
          <p>{burbuja.texto}</p>
          <Bocina clave={burbuja.clave} texto={burbuja.texto} />
        </div>
      )}

      {ambiente && <div key={ambiente} className={`velo-ambiente ${ambiente}`} />}
      <div className={`velo-mundo${cubierto ? " cubierto" : ""}`} />

      {abierto?.tipo === "cuento" && <Cuento id={abierto.id} alCerrar={alCerrarCuento} />}

      {abierto?.tipo === "actividad" && <Actividad id={abierto.id} tipo={abierto.actividad} alCerrar={cerrarOverlay} />}

      {abierto?.tipo === "calma" && (
        <Calma
          modo={abierto.modo}
          final={abierto.final}
          alCerrar={() => {
            const fin = finAterrizaje.current;
            finAterrizaje.current = null;
            cerrarOverlay();
            fin?.();
          }}
        />
      )}

      {dibujoLibre && (
        <Dibujo
          origen="libre"
          consigna={consignaLibre}
          alTerminar={(imagen) => {
            terminar(dibujoLibre.id, "terminado");
            cambiarEstado({ libro: [...estado().libro, { cuento: dibujoLibre.id, titulo: consignaLibre, lineas: [], carita: null, dibujos: imagen ? [imagen] : [] }] }, true);
            cerrarOverlay();
          }}
          ahoraNo={() => {
            registrar("ahora_no", { cuento: dibujoLibre.id, paso: "libre" });
            terminar(dibujoLibre.id, "ahora_no");
            cerrarOverlay();
          }}
        />
      )}

      {abierto?.tipo === "libro" && (
        <Libro
          alCerrar={() => {
            setAbierto(null);
            ocupado.current = false;
            motorRef.current?.pausar(false);
          }}
        />
      )}

      {cartel && (
        <div className="cartel" role="status">
          <p>{cartel.texto}</p>
        </div>
      )}
    </main>
  );
}
