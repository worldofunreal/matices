// The world (GDD §8): one place at a time. Walking, running, the dog and drawing are in mundo/motor.ts;
// this screen holds the rules: doors and their hours with a sign on each one, the bed, the mirror, what a
// tap says, and the everyday situations (GDD §9), which never stop the world.
import { useEffect, useRef, useState } from "react";
import contenido from "virtual:contenido";
import { cargarMapa, quitarAusentes, visible, type Mapa, type Puerta, type Punto } from "../mundo/mapa";
import { Motor } from "../mundo/motor";
import { pieza, altoVisible } from "../lienzo/arte";
import { capas, coloresDe } from "../personaje/apariencia";
import { estado, cambiarEstado, type Estado, type FiguraPuesta } from "../datos/guardado";
import { bloqueo, revisarHora, dormir } from "../datos/dia";
import { adultoMasCerca, codigoDe, etiquetaDe } from "../datos/casa";
import { ocurre, responder, type Reaccion } from "../datos/situaciones";
import { registrar } from "../datos/eventos";
import { Bocina } from "../ui/Bocina";
import { Icono } from "../ui/iconos";
import { sonarSiGrabada } from "../ui/voz";
import { useSuperpuesto } from "../ui/Siempre";
import "./mundo.css";

const M = contenido.textos.mundo;
const CAIDA = 6; // the walker's body center sits 6 game pixels above the feet
const CORRER_MS = 500; // running this long in the house counts as running (S01)
const ENTRE_VECES_MS = 4000; // and a new time (a new run or running on) only this long after the last one
const ALEJARSE = 48; // game pixels the child walks away from a question to leave it unanswered (IGNORA)

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

// Where the day goes next (GDD §4): the school in the morning, home in the afternoon, bed at night.
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
    ...(m.lugar === "casa" && e.casa.some((f) => f.figura === "perro") ? [pieza("figuras/perro_lado")] : []),
    ...capas(e.apariencia).map((id) => pieza(id, coloresDe(e.apariencia))),
  ]);
}

// Someone of the house speaking to the child, over their head; with answers, they wait for one.
type Habla = { r: Reaccion; f: FiguraPuesta; quien: string; t0: number; x0: number; y0: number };

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
  const [habla, setHabla] = useState<Habla | null>(null);
  const hablaRef = useRef<Habla | null>(null);
  hablaRef.current = habla;

  useEffect(() => {
    motorRef.current?.pausar(superpuesto);
  }, [superpuesto]);

  useEffect(() => {
    if (motorRef.current) motorRef.current.corriendo = corriendo;
  }, [corriendo]);

  // The answer to a question, or walking away from it (IGNORA).
  const contestar = (codigo: string) => {
    const h = hablaRef.current;
    if (!h?.r.respuestas) return;
    responder(h.r, h.quien, codigo, performance.now() - h.t0);
    setHabla(null);
  };

  // Numbers 1 to 3 answer on a computer (GDD §12).
  useEffect(() => {
    if (!habla?.r.respuestas) return;
    const tecla = (e: KeyboardEvent) => {
      const r = habla.r.respuestas?.[Number(e.key) - 1];
      if (r) contestar(r[0]);
    };
    addEventListener("keydown", tecla);
    return () => removeEventListener("keydown", tecla);
  }, [habla]);

  // A line without answers goes away by itself.
  useEffect(() => {
    if (!habla || habla.r.respuestas) return;
    const t = window.setTimeout(() => setHabla(null), Math.max(3000, habla.r.texto.length * 80));
    return () => clearTimeout(t);
  }, [habla]);

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
    let ultimaVez = -Infinity;
    let escapo = 0;
    setBurbuja(null);
    setHabla(null);

    const mostrar = (clave: string, texto: string) => {
      setBurbuja({ id: Date.now(), clave, texto });
      clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(() => setBurbuja(null), Math.max(3500, texto.length * 70));
    };

    // Going to bed: a line, then the next day (or the closing card after the last one).
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
      if (p.nombre === "cama" && estado().hora === "noche") return dormirse();
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
      const no = bloqueo(lugarActual, p.horas);
      if (no) return mostrar(`mundo.${no}`, M[no]);
      if (hablaRef.current?.r.respuestas) contestar("IGNORA");
      activo?.pausar(true);
      cambiarEstado({ lugar: p.destino, llegada: p.llegada, x: null, y: null }, true);
      revisarHora(p.destino, lugarActual);
      setCubierto(true);
      window.setTimeout(() => setRecarga((r) => r + 1), 220);
    };

    // S01 (GDD §9): running in the house. The closest adult the child placed reacts; with no adult, nobody does.
    const correrEnCasa = (motor: Motor) => {
      const f = adultoMasCerca(motor.x, motor.y);
      const quien = f ? codigoDe(f) : "NADIE";
      const r = ocurre("S01", quien);
      if (!r || !f) return;
      if (r.respuestas) motor.parar();
      sonarSiGrabada(r.clave, r.texto);
      setHabla({ r, f, quien, t0: performance.now(), x0: motor.x, y0: motor.y });
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
        alTocar: (cx, cy) => accion.current?.tocar(cx, cy),
        alPerro: (que) => {
          if (que === "escapa") escapo = performance.now();
          registrar("perro", que === "alcanza" ? { que, ms: Math.round(performance.now() - escapo) } : { que });
        },
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
          // Running on after being told counts again, so does a new run; an open question waits for its answer.
          if (lugarActual === "casa" && corriendoDesde && ahora - corriendoDesde > CORRER_MS && ahora - ultimaVez > ENTRE_VECES_MS && !hablaRef.current?.r.respuestas) {
            ultimaVez = ahora;
            correrEnCasa(motor);
          }
          // Walking away from a question leaves it unanswered.
          const h = hablaRef.current;
          if (h?.r.respuestas && Math.hypot(motor.x - h.x0, motor.y - h.y0) > ALEJARSE) contestar("IGNORA");
        },
      });
      motor.corriendo = corriendo;
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
      if (hablaRef.current?.r.respuestas) contestar("IGNORA");
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

      {/* A nameplate under everyone: the people and pets of the house, the fixed people here and the child.
          The dog the motor moves (the first one) carries its plate along. */}
      {mapa?.lugar === "casa" &&
        estado().casa.map((f) => (
          <div key={f.inst} className="nombre-mundo" data-mundo-x={f.x} data-mundo-y={f.y} data-mundo-sigue={f.inst === estado().casa.find((x) => x.figura === "perro")?.inst ? "perro" : undefined} aria-hidden="true">
            <span className="placa">{etiquetaDe(f)}</span>
          </div>
        ))}
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

      {/* A sign on every door: where it leads, dimmed with a lock when it is closed now (GDD §8). */}
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

      {habla && (
        <div className="globo-figura" data-mundo-x={habla.f.x} data-mundo-y={habla.f.y - altoVisible(`figuras/${habla.f.figura}`) - 2} role="status">
          <div className="globo-figura-caja">
            <span className="globo-quien">{etiquetaDe(habla.f)}</span>
            <p>{habla.r.texto}</p>
            <Bocina clave={habla.r.clave} texto={habla.r.texto} />
          </div>
        </div>
      )}
      {habla?.r.respuestas && (
        <div className="respuestas">
          {habla.r.respuestas.map(([codigo, texto]) => (
            <div key={codigo} className="respuesta">
              <button className="boton principal" onClick={() => contestar(codigo)}>
                {texto}
              </button>
              <Bocina clave={`situaciones.${habla.r.situacion}.${codigo}`} texto={texto} />
            </div>
          ))}
        </div>
      )}

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

      <div className={`velo-mundo${cubierto ? " cubierto" : ""}`} />

      {cartel && (
        <div className="cartel" role="status">
          <p>{cartel.texto}</p>
        </div>
      )}
    </main>
  );
}
