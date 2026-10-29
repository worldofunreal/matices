// The world: one place at a time. Walking and running are in mundo/motor.ts; this screen holds
// the rules: doors and their hours with a sign on each one, the bed, the mirror and what a tap says.
import { useEffect, useRef, useState } from "react";
import contenido, { type Escena } from "virtual:contenido";
import { cargarMapa, libre, quitarAusentes, visible, type Mapa, type Puerta, type Punto } from "../mundo/mapa";
import { Motor, type Figura } from "../mundo/motor";
import { pieza } from "../lienzo/arte";
import { capas, coloresDe } from "../personaje/apariencia";
import { estado, cambiarEstado, type Estado } from "../datos/guardado";
import { bloqueo, revisarHora, dormir } from "../datos/dia";
import { escenaPara, objetivoActual, pistaPaso, sincronizarHistoria } from "../datos/escenas";
import { Escena as EscenaEnCurso } from "./Escena";
import { registrar } from "../datos/eventos";
import { Bocina } from "../ui/Bocina";
import { Icono } from "../ui/iconos";
import { useSuperpuesto } from "../ui/Siempre";
import { sonarGolpe1, sonarGolpe2, sonarImpactoCaida, sonarMision, sonarPatadaRemate, sonarProximidad, sonarSalto, sonarToque } from "../ui/sonido";
import "./mundo.css";

const M = contenido.textos.mundo;
const CAIDA = 6; // the walker's body center sits 6 game pixels above the feet

const ICONOS_LUGAR: Record<string, string> = {
  casa: "🏡",
  calle: "🌳",
  tiendita: "🛒",
  parque: "⛲",
  escuela_planta_baja: "🏫",
  escuela_planta_alta: "🏫",
  escuela_patio: "🏀",
  biblioteca_planta_baja: "📚",
  biblioteca_planta_alta: "📖",
};

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

// Syncs family members in the house with the current story step (Mamá leaves after T05; Papá is in the living room on Day 2 night).
function sincronizarFamiliaEnCasa(m: Mapa) {
  if (m.lugar !== "casa") return;
  const e = estado();
  const piel = e.apariencia.colores.piel ?? 0;
  m.puntos = m.puntos.filter((p) => p.nombre !== "mama" && p.nombre !== "papa");
  if (e.dia === 1 && e.hora === "manana" && !e.historia.hechas.includes("T05")) {
    m.puntos.push({ nombre: "mama", tipo: "npc", x: 248, y: 416, arte: "figuras/mama", piel });
  }
  if (e.dia === 2 && e.hora === "noche") {
    m.puntos.push({ nombre: "papa", tipo: "npc", x: 144, y: 480, arte: "figuras/papa", piel });
  }
}

// Where the story guides the child right now: the active object/person in this map, or the next door toward the active map.
function guiaDe(m: Mapa): { x: number; y: number; nombre: string; puerta: string | null } | null {
  const obj = objetivoActual();

  if (m.lugar === obj.lugar) {
    if (obj.puertaDestino) {
      const puerta = m.puertas.find((p) => p.destino === obj.puertaDestino);
      if (puerta) return { x: puerta.x + puerta.w / 2, y: puerta.y + puerta.h / 2, nombre: obj.etiqueta, puerta: puerta.nombre };
    }
    if (obj.objeto) {
      const tieneMama = m.puntos.some((x) => x.nombre === "mama");
      const tienePapa = m.puntos.some((x) => x.nombre === "papa");
      const respaldo = obj.objeto === "mama" && !tieneMama ? "mesa" : obj.objeto === "papa" && !tienePapa ? "sillon" : null;
      const p = m.puntos.find((x) => x.nombre === obj.objeto) ?? (respaldo ? m.puntos.find((x) => x.nombre === respaldo) : undefined);
      if (p) return { x: p.x, y: p.y, nombre: obj.etiqueta, puerta: null };
    }
  }

  const tieneMama = m.puntos.some((x) => x.nombre === "mama");
  const tienePapa = m.puntos.some((x) => x.nombre === "papa");
  for (const p of m.puntos) {
    if (p.nombre === "calendario") continue;
    if (p.nombre === "mesa" && tieneMama) continue;
    if (p.nombre === "sillon" && tienePapa) continue;
    if (escenaPara(m.lugar, p.nombre)) {
      return { x: p.x, y: p.y, nombre: M.nombres[p.nombre] ?? M.objetos[m.lugar]?.[p.nombre] ?? M.objetos.comun[p.nombre] ?? p.nombre, puerta: null };
    }
  }

  if (m.lugar !== obj.lugar) {
    const paso = primerPaso(m.lugar, obj.lugar);
    const puerta = m.puertas.find((p) => p.destino === paso);
    if (puerta) {
      return { x: puerta.x + puerta.w / 2, y: puerta.y + puerta.h / 2, nombre: nombreSalida(m.lugar, puerta.destino), puerta: puerta.nombre };
    }
  }

  return null;
}

function alturaEntidad(pt: Punto): number {
  const ADULTOS = ["mama", "papa", "maestra", "director", "abuelo", "abuela", "tio", "tia", "don_chuy", "padrastro", "madrastra", "otra_persona"];
  if (ADULTOS.includes(pt.nombre)) return 82;
  if (pt.tipo === "npc") return 66;
  if (pt.tipo === "fauna") return 34;
  const MUEBLES_ALTOS = ["refrigerador", "ropero", "cama", "tinaco", "arbol", "arbol_grande", "kiosko", "poste"];
  if (MUEBLES_ALTOS.includes(pt.nombre)) return 66;
  return 44;
}

// Where the child starts: the arrival of a door, or where they stopped, or where they put their
// character in the house.
function inicioDe(m: Mapa, e: Estado) {
  if (e.llegada && m.llegadas[e.llegada]) return m.llegadas[e.llegada];
  if (e.x !== null && e.y !== null) {
    const tx = Math.floor(e.x / 32);
    const ty = Math.floor((e.y - CAIDA) / 32);
    if (libre(m, tx, ty)) return { x: e.x, y: e.y };
  }
  return m.inicio;
}

// Everything the place draws is read before the first frame, so the loop never waits.
async function cargarArte(m: Mapa, e: Estado, figuras: Figura[]) {
  const piel = e.apariencia.colores.piel ?? 0;
  await Promise.all([
    pieza(`lugares/${m.lugar}/fondo`),
    ...m.puntos.map((p) => (p.piel !== undefined ? pieza(p.arte, { piel: p.piel }) : pieza(p.arte))),
    ...figuras.map((f) => pieza(`figuras/${f.id}`, { piel: f.piel })),
    ...(m.lugar === "casa" ? [pieza("figuras/mama", { piel }), pieza("figuras/papa", { piel })] : []),
    ...capas(e.apariencia).map((id) => pieza(id, coloresDe(e.apariencia))),
    pieza("figuras/perro_lado"),
  ]);
}

interface PuntoInteraccion {
  id: string;
  nombre: string;
  tipo: "npc" | "objeto" | "fauna";
  x: number;
  y: number;
  alto: number;
  icono: string;
  etiqueta: string;
  esGuia: boolean;
  nivel: 1 | 2;
  punto: Punto;
}

interface SaludoAmbiental {
  id: string;
  quien: string;
  texto: string;
  x: number;
  y: number;
}

export function Mundo({ alEspejo }: { alEspejo: () => void }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const accion = useRef<{
    tocar: (cx: number, cy: number) => void;
    interactuar: (p: Punto) => void;
  } | null>(null);
  const alEspejoRef = useRef(alEspejo);
  alEspejoRef.current = alEspejo;
  const temporizador = useRef(0);
  const temporizadorSaludo = useRef(0);
  const ultimosSaludos = useRef<Record<string, number>>({});
  const motorRef = useRef<Motor | null>(null);
  // Mi libro, Opciones or the "Quiero hablar" card cover the screen (Siempre.tsx): the world stands still under them.
  const superpuesto = useSuperpuesto();
  const [recarga, setRecarga] = useState(0);
  const [cubierto, setCubierto] = useState(true);
  const [burbuja, setBurbuja] = useState<{ id: number; clave: string; texto: string; x?: number; y?: number } | null>(null);
  const [cartel, setCartel] = useState<{ texto: string } | null>(null);
  const [mapa, setMapa] = useState<Mapa | null>(null);
  const [guia, setGuia] = useState<ReturnType<typeof guiaDe>>(null);
  const [emotes, setEmotes] = useState<PuntoInteraccion[]>([]);
  const [saludoAmbiental, setSaludoAmbiental] = useState<SaludoAmbiental | null>(null);
  const [anuncioLugar, setAnuncioLugar] = useState<{ id: number; icono: string; nombre: string } | null>(null);
  const temporizadorLugar = useRef(0);
  const [corriendo, setCorriendo] = useState(false);
  // A scene of the story is on: the world stands still under it, and the mission shows once it is over.
  const [escena, setEscena] = useState<{ escena: Escena; alFin: () => void } | null>(null);
  const [mision, setMision] = useState<string | null>(() => sincronizarHistoria().mision);

  useEffect(() => {
    motorRef.current?.pausar(superpuesto || !!escena);
  }, [superpuesto, escena]);

  useEffect(() => {
    if (motorRef.current) motorRef.current.corriendo = corriendo;
  }, [corriendo]);

  const dispararSalto = () => {
    if (!motorRef.current || motorRef.current.pausado || escena || superpuesto) return;
    sonarSalto();
    const res = motorRef.current.brincar();
    registrar("accion_personaje", {
      accion: "brincar",
      combo_paso: 0,
      sub_tipo: "salto",
      objetivo: res.objetivo,
      tipo_objetivo: res.tipo_objetivo,
      distancia: res.distancia,
      lugar: estado().lugar,
      x: res.x,
      y: res.y,
    });
  };

  const dispararAtaque = () => {
    if (!motorRef.current || motorRef.current.pausado || escena || superpuesto) return;
    const res = motorRef.current.atacar();
    if (res.combo_paso === 1) sonarGolpe1();
    else if (res.combo_paso === 2) sonarGolpe2();
    else if (res.combo_paso === 3) sonarPatadaRemate();

    const subTipo = res.combo_paso === 1 ? "combo_1" : res.combo_paso === 2 ? "combo_2" : "combo_remate";
    registrar("accion_personaje", {
      accion: res.accion,
      combo_paso: res.combo_paso,
      sub_tipo: subTipo,
      objetivo: res.objetivo,
      tipo_objetivo: res.tipo_objetivo,
      distancia: res.distancia,
      lugar: estado().lugar,
      x: res.x,
      y: res.y,
    });
  };

  useEffect(() => {
    const alTeclado = (ev: KeyboardEvent) => {
      if (escena || superpuesto) return;
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
      if (ev.code === "Space" || ev.key === " ") {
        ev.preventDefault();
        dispararSalto();
      } else if (ev.code === "KeyZ" || ev.code === "KeyJ" || ev.code === "KeyX" || ev.code === "KeyK") {
        dispararAtaque();
      }
    };
    addEventListener("keydown", alTeclado);
    return () => removeEventListener("keydown", alTeclado);
  }, [escena, superpuesto]);

  // One place per run of this effect: a door, a new day or a return from the mirror starts it again.
  useEffect(() => {
    sincronizarHistoria();
    const e0 = estado();
    const lugarActual = e0.lugar;
    const visitas = (e0.visitas[lugarActual] ?? 0) + 1;
    const t0 = performance.now();
    let vivo = true;
    let activo: Motor | null = null;
    let mapaActual: Mapa | null = null;
    let puerta: string | null = null;
    let corriendoDesde = 0; // when the current run started
    let ultimoChequeoCercanos = 0;
    setBurbuja(null);
    setMision(e0.historia.mision);

    const mostrar = (clave: string, texto: string, punto?: { x: number; y: number }) => {
      setBurbuja({ id: Date.now(), clave, texto, x: punto?.x, y: punto?.y });
      clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(() => setBurbuja(null), Math.max(3500, texto.length * 70));
    };

    const refrescarGuia = () => {
      sincronizarHistoria();
      setMision(estado().historia.mision);
      if (!mapaActual) return;
      sincronizarFamiliaEnCasa(mapaActual);
      const g = guiaDe(mapaActual);
      if (activo) activo.guia = g;
      setGuia(g);
      setMapa({ ...mapaActual, puntos: [...mapaActual.puntos] });
    };

    // A scene starts over the world. When it is over, the mission, family presence and yellow guide update immediately,
    // a changed look is drawn again, any chained "entrar" scene starts, and `alFin` goes on.
    const iniciarEscena = (e: Escena, alFin: () => void = () => {}) => {
      const antes = estado().apariencia;
      sonarMision();
      setEscena({
        escena: e,
        alFin: () => {
          setEscena(null);
          refrescarGuia();
          if (estado().apariencia !== antes) setRecarga((r) => r + 1);
          const siguienteEntrar = escenaPara(lugarActual, "entrar");
          if (siguienteEntrar) {
            iniciarEscena(siguienteEntrar, alFin);
          } else {
            alFin();
          }
        },
      });
    };

    const dormirse = () => {
      activo?.pausar(true);
      mostrar("mundo.dormir", M.dormir);
      window.setTimeout(() => {
        const dia = dormir();
        if (dia === null) return setCartel({ texto: M.fin });
        sincronizarHistoria();
        setMision(estado().historia.mision);
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
      const pista = pistaPaso(lugarActual, p.nombre);
      if (pista) return mostrar(`mundo.pista.${p.nombre}`, pista, { x: p.x, y: p.y });
      registrar("explora", { lugar: lugarActual, objeto: p.nombre });
      if (p.nombre === "espejo") return alEspejoRef.current();
      if (p.nombre === "cama" && estado().hora === "noche") return dormirse();
      mostrar(`mundo.objetos.${lugarActual}.${p.nombre}`, M.objetos[lugarActual]?.[p.nombre] ?? M.objetos.comun[p.nombre], { x: p.x, y: p.y });
    };

    // Fixed people greet or start their story scene.
    const saludar = (p: Punto) => {
      const e = escenaPara(lugarActual, p.nombre);
      if (e) return iniciarEscena(e);
      const pista = pistaPaso(lugarActual, p.nombre);
      if (pista) return mostrar(`mundo.pista.${p.nombre}`, pista, { x: p.x, y: p.y });
      registrar("explora", { lugar: lugarActual, persona: p.nombre });
      const saludos = M.saludos[p.nombre] ?? M.saludos.vecino_generico ?? ["Buenos días.", "Hola."];
      const i = (estado().visitas[lugarActual] ?? 0) % saludos.length;
      mostrar(`mundo.saludos.${p.nombre}.${i}`, saludos[i], { x: p.x, y: p.y });
    };

    const acariciar = (p: Punto) => {
      registrar("explora", { lugar: lugarActual, animal: p.nombre });
      const esGato = p.nombre.startsWith("gato");
      const saludos = (esGato ? M.saludos.gato : M.saludos.perro) ?? (esGato ? ["¡Miau!"] : ["¡Guau!"]);
      const i = (estado().visitas[lugarActual] ?? 0) % saludos.length;
      mostrar(`mundo.animal.${p.nombre}`, saludos[i], { x: p.x, y: p.y });
    };

    // The scenes of this door play one after another, then the child goes through. A scene with `frena` keeps the
    // child at the door; it plays once, so the next try goes through (contenido/escenas.yaml).
    const cruzar = (p: Puerta) => {
      const no = bloqueo(lugarActual, p.horas);
      if (no) return mostrar(`mundo.${no}`, M[no]);
      const salir = (): void => {
        const e = escenaPara(lugarActual, `salir:${p.destino}`);
        if (!e) return irse(p);
        iniciarEscena(e, e.frena ? () => {} : () => irse(p));
      };
      salir();
    };

    const irse = (p: Puerta) => {
      activo?.pausar(true);
      cambiarEstado({ lugar: p.destino, llegada: p.llegada, x: null, y: null }, true);
      revisarHora(p.destino, lugarActual);
      sincronizarHistoria();
      setMision(estado().historia.mision);
      setCubierto(true);
      window.setTimeout(() => setRecarga((r) => r + 1), 260);
    };

    const figuras: Figura[] = [];
    if (lugarActual === "calle" || lugarActual === "parque") {
      figuras.push({ id: "perro", x: 260, y: 460, piel: 0 });
    }

    void cargarMapa(lugarActual, e0.semilla, estado().dia, estado().hora).then(async (m) => {
      mapaActual = m;
      sincronizarFamiliaEnCasa(m);
      quitarAusentes(m, estado().hora);
      await cargarArte(m, estado(), figuras);
      if (!vivo) return;
      const inicio = inicioDe(m, estado());
      puerta = m.puertas.find((d) => dentro(d, inicio.x, inicio.y - CAIDA))?.nombre ?? null;
      cambiarEstado({ llegada: null, x: Math.round(inicio.x), y: Math.round(inicio.y), visitas: { ...estado().visitas, [lugarActual]: visitas } });
      const motor = new Motor({
        canvas: lienzo.current!,
        mapa: m,
        x: inicio.x,
        y: inicio.y,
        dir: estado().direccion,
        apariencia: estado().apariencia,
        figuras,
        hora: estado().hora,
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

          if (ahora - ultimoChequeoCercanos > 120 && !superpuesto && !escena) {
            ultimoChequeoCercanos = ahora;
            const obj = objetivoActual();
            const nuevos: PuntoInteraccion[] = [];
            const tieneMama = m.puntos.some((x) => x.nombre === "mama");
            const tienePapa = m.puntos.some((x) => x.nombre === "papa");

            for (const pt of m.puntos) {
              if (!visible(pt, estado().hora)) continue;
              const dist = Math.hypot(pt.x - motor.x, pt.y - motor.y);
              const esGuia =
                obj.lugar === lugarActual &&
                (obj.objeto === pt.nombre ||
                  (!tieneMama && obj.objeto === "mama" && pt.nombre === "mesa") ||
                  (!tienePapa && obj.objeto === "papa" && pt.nombre === "sillon"));
              const tieneEscena = !!escenaPara(lugarActual, pt.nombre);
              const estaCerca = dist <= 75;

              // Nivel 1: Objetivo Principal activo de la historia
              if (esGuia) {
                const icono = pt.tipo === "npc" ? "💬" : "✨";
                const etiqueta = M.nombres[pt.nombre] ?? M.objetos[lugarActual]?.[pt.nombre] ?? M.objetos.comun[pt.nombre] ?? pt.nombre;
                nuevos.push({
                  id: `${pt.nombre}_${pt.x}_${pt.y}`,
                  nombre: pt.nombre,
                  tipo: pt.tipo,
                  x: pt.x,
                  y: pt.y,
                  alto: alturaEntidad(pt) + 12,
                  icono,
                  etiqueta,
                  esGuia: true,
                  nivel: 1,
                  punto: pt,
                });
              } else if (estaCerca && (pt.tipo === "fauna" || tieneEscena || pt.nombre === "espejo" || (pt.nombre === "cama" && estado().hora === "noche"))) {
                // Nivel 2: Acción Secundaria Cercana
                let icono = "💬";
                if (pt.tipo === "fauna") icono = "🐾";
                else if (pt.nombre === "espejo") icono = "🪞";
                else if (pt.nombre === "cama") icono = "💤";

                const etiqueta = M.nombres[pt.nombre] ?? M.objetos[lugarActual]?.[pt.nombre] ?? M.objetos.comun[pt.nombre] ?? pt.nombre;
                nuevos.push({
                  id: `${pt.nombre}_${pt.x}_${pt.y}`,
                  nombre: pt.nombre,
                  tipo: pt.tipo,
                  x: pt.x,
                  y: pt.y,
                  alto: alturaEntidad(pt) + 10,
                  icono,
                  etiqueta,
                  esGuia: false,
                  nivel: 2,
                  punto: pt,
                });
              }

              // Saludo ambiental al pasar cerca de un NPC común
              if (motor.moviendo && pt.tipo === "npc" && !tieneEscena && !esGuia && dist <= 56) {
                const ultimo = ultimosSaludos.current[pt.nombre] ?? 0;
                if (ahora - ultimo > 14000) {
                  ultimosSaludos.current[pt.nombre] = ahora;
                  const saludos = M.saludos[pt.nombre] ?? M.saludos.vecino_generico ?? ["¡Hola!"];
                  const idx = (estado().visitas[lugarActual] ?? 0) % saludos.length;
                  const texto = saludos[idx];
                  setSaludoAmbiental({ id: pt.nombre, quien: M.nombres[pt.nombre] ?? "Vecino", texto, x: pt.x, y: pt.y });
                  clearTimeout(temporizadorSaludo.current);
                  temporizadorSaludo.current = window.setTimeout(() => setSaludoAmbiental(null), 2800);
                }
              }
            }

            if (nuevos.some((n) => n.nivel === 2 && !emotes.some((e) => e.id === n.id))) {
              sonarProximidad();
            }

            setEmotes(nuevos);
          }
        },
      });
      motor.corriendo = corriendo;
      activo = motor;
      motorRef.current = motor;
      const alEntrar = escenaPara(lugarActual, "entrar");
      if (alEntrar) iniciarEscena(alEntrar);
      const g = guiaDe(m);
      motor.guia = g;
      motor.pausar(superpuesto);
      accion.current = {
        tocar: (cx, cy) => {
          if (motor.pausado) return;
          const p = motor.puntoEn(cx, cy);
          if (p?.tipo === "objeto") motor.irA(p, () => usar(p));
          else if (p?.tipo === "npc") motor.irA(p, () => saludar(p));
          else if (p?.tipo === "fauna") motor.irA(p, () => acariciar(p));
          else motor.tocarSuelo(cx, cy);
        },
        interactuar: (p: Punto) => {
          if (motor.pausado) return;
          if (p.tipo === "objeto") motor.irA(p, () => usar(p));
          else if (p.tipo === "npc") motor.irA(p, () => saludar(p));
          else if (p.tipo === "fauna") motor.irA(p, () => acariciar(p));
        },
      };
      setMapa(m);
      setGuia(g);
      motor.alCaerSalto = (res) => {
        sonarImpactoCaida();
        registrar("accion_personaje", {
          accion: "brincar",
          combo_paso: 0,
          sub_tipo: "impacto_caida",
          objetivo: res.objetivo,
          tipo_objetivo: res.tipo_objetivo,
          distancia: res.distancia,
          lugar: lugarActual,
          x: res.x,
          y: res.y,
        });
      };
      motor.iniciar();
      setCubierto(false);
      const nombreLugar = M.lugares[lugarActual] ?? lugarActual;
      const iconoLugar = ICONOS_LUGAR[lugarActual] ?? "📍";
      setAnuncioLugar({ id: Date.now(), icono: iconoLugar, nombre: nombreLugar });
      clearTimeout(temporizadorLugar.current);
      temporizadorLugar.current = window.setTimeout(() => setAnuncioLugar(null), 2800);
    });

    return () => {
      vivo = false;
      accion.current = null;
      clearTimeout(temporizador.current);
      clearTimeout(temporizadorSaludo.current);
      clearTimeout(temporizadorLugar.current);
      setEmotes([]);
      setSaludoAmbiental(null);
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
      {mapa?.puntos.filter((p) => p.tipo === "npc" && visible(p, estado().hora)).map((p, i) => (
        <div key={`${p.nombre}_${i}`} className="nombre-mundo" data-mundo-x={p.x} data-mundo-y={p.y} aria-hidden="true">
          <span className="placa">{M.nombres[p.nombre] ?? M.nombres.vecino_generico ?? "Vecino"}</span>
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
      {/* Edge arrow text when the guided target is outside the screen */}
      <div className="letrero guia flecha-texto" data-flecha hidden aria-hidden="true">
        <span>{guia?.nombre}</span>
      </div>

      {/* Interactive comic balloons over the active goal or nearby characters/activities */}
      {!escena && emotes.map((p) => (
        <div
          key={`emote_${p.id}`}
          className="contenedor-emote"
          data-mundo-x={p.x}
          data-mundo-y={p.y - p.alto}
        >
          <button
            type="button"
            className={`emote-mundo nivel-${p.nivel}${p.esGuia ? " guia" : ""}`}
            onClick={(ev) => {
              ev.stopPropagation();
              sonarToque();
              accion.current?.interactuar(p.punto);
            }}
            aria-label={p.etiqueta}
          >
            <span>{p.icono}</span>
          </button>
        </div>
      ))}

      {/* Ambient speech over an NPC's head */}
      {!escena && saludoAmbiental && (
        <div
          className="globo-figura-mundo"
          data-mundo-x={saludoAmbiental.x}
          data-mundo-y={saludoAmbiental.y - 52}
          role="status"
        >
          <div className="globo-figura-caja">
            <span className="globo-quien">{saludoAmbiental.quien}</span>
            <p>{saludoAmbiental.texto}</p>
          </div>
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

      {!escena && (
        <div className="mundo-acciones" role="toolbar" aria-label="Acciones del personaje">
          <button
            type="button"
            className="boton redondo accion-btn brincar"
            aria-label="Brincar"
            title="Brincar (Espacio)"
            onClick={dispararSalto}
          >
            {Icono.brincar}
          </button>
          <button
            type="button"
            className="boton redondo accion-btn atacar"
            aria-label="Atacar"
            title="Atacar (Z o J) - Combo de 3 golpes"
            onClick={dispararAtaque}
          >
            {Icono.atacar}
          </button>
        </div>
      )}

      {burbuja && (burbuja.x !== undefined && burbuja.y !== undefined ? (
        <div
          key={burbuja.id}
          className="globo-figura-mundo"
          data-mundo-x={burbuja.x}
          data-mundo-y={burbuja.y - 48}
          role="status"
        >
          <div className="globo-figura-caja">
            <p>{burbuja.texto}</p>
            <Bocina clave={burbuja.clave} texto={burbuja.texto} />
          </div>
        </div>
      ) : (
        <div key={burbuja.id} className="globo" role="status">
          <p>{burbuja.texto}</p>
          <Bocina clave={burbuja.clave} texto={burbuja.texto} />
        </div>
      ))}

      {/* keyed by scene: a scene chained right after another starts from its first step */}
      {escena && <EscenaEnCurso key={escena.escena.id} escena={escena.escena} alTerminar={escena.alFin} />}
      {anuncioLugar && !escena && (
        <aside key={anuncioLugar.id} className="banner-ubicacion" role="status" aria-live="polite">
          <span className="banner-ubicacion-icono" aria-hidden="true">{anuncioLugar.icono}</span>
          <span className="banner-ubicacion-texto">{anuncioLugar.nombre}</span>
        </aside>
      )}
      {mision && !escena && (
        <div className="mision-mundo">
          <span className="mision-icono" aria-hidden="true">⭐</span>
          <span className="mision-texto">{mision}</span>
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
