// Runs one scene of the story over the world (contenido/escenas.yaml): lines to read, options to choose, minigames,
// marks and effects. Nothing runs by itself: the child goes on with "Seguir", and a scene never ends on its own.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import contenido, { type Escena, type Paso } from "virtual:contenido";
import { estado } from "../datos/guardado";
import { azar } from "../datos/azar";
import { registrar, semilla } from "../datos/eventos";
import { conGenero, marcar, pasoGuardado, terminarEscena } from "../datos/escenas";
import { Bocina } from "../ui/Bocina";
import { Cabeza, Cara } from "../lienzo/Personaje";
import { sonarToque } from "../ui/sonido";
import { JUEGOS, type Resultado } from "./Juegos";
import "./escena.css";

const E = contenido.textos.escena;

const hablante = (de: string) => E.hablantes[de]?.replace("{nombre}", estado().nombre) ?? de;

function RetratoHablante({ de }: { de: string }) {
  if (de === "sistema" || de === "mensaje_mama") return null;
  if (de === "yo" || de === "pensamiento") {
    return (
      <div className="escena-retrato" aria-hidden="true">
        <Cabeza a={estado().apariencia} escala={2} />
      </div>
    );
  }
  const piel = estado().apariencia.colores.piel ?? 0;
  if (de === "madre" || de === "mama") {
    return (
      <div className="escena-retrato" aria-hidden="true">
        <Cara id="figuras/mama" piel={piel} tam={64} />
      </div>
    );
  }
  if (de === "papa" || de === "padre") {
    return (
      <div className="escena-retrato" aria-hidden="true">
        <Cara id="figuras/papa" piel={piel} tam={64} />
      </div>
    );
  }
  if (de === "tio") {
    return (
      <div className="escena-retrato" aria-hidden="true">
        <Cara id="figuras/tio" piel={piel} tam={64} />
      </div>
    );
  }
  const idPersonaje: Record<string, string> = {
    valeria: "companero_1",
    leo: "companero_2",
    sam: "companero_3",
    companero_1: "companero_1",
    companero_2: "companero_2",
    companero_3: "companero_3",
    companero_4: "companero_4",
    lucia: "lucia",
    orientadora: "orientadora",
    nico: "nico",
    conserje: "conserje",
    don_chuy: "don_chuy",
    clara: "clara",
    cuentera: "cuentera",
  };
  const archivo = idPersonaje[de] ?? de;
  return (
    <div className="escena-retrato" aria-hidden="true">
      <Cara id={`personajes/${archivo}`} tam={64} />
    </div>
  );
}

// Who spoke last before step `i`: the answer to an option comes from them.
const ultimoAntes = (pasos: Paso[], i: number) => [...pasos.slice(0, i)].reverse().find((p) => p.de)?.de ?? "pensamiento";

// Steps that set something without waiting for the child: marks and effects are applied as the scene reaches them.
const invisible = (p: Paso) => p.marca !== undefined || p.efecto !== undefined;

export function Escena({ escena, alTerminar }: { escena: Escena; alTerminar: (hecha: boolean) => void }) {
  const pasos = escena.pasos;
  const [i, setI] = useState(() => pasoGuardado(escena.id)); // a paused scene goes on from its line
  const [respuesta, setRespuesta] = useState<string | null>(null); // the answer to the option just chosen
  const [efecto, setEfecto] = useState<string | null>(null); // the effect on screen, until the next one or the scene ends
  const [letrasVisibles, setLetrasVisibles] = useState(0);
  const [fasePaso, setFasePaso] = useState<"entrando" | "activo" | "saliendo">("activo");
  const [opcionElegida, setOpcionElegida] = useState<number | null>(null);
  const t0 = useRef(performance.now()); // when the options of this step appeared
  const p = pasos[i];
  const orden = useMemo(() => (p?.opciones ? azar(`${semilla()}:${escena.id}:${i}`).barajar(p.opciones.map((_, j) => j)) : []), [i]);

  const textoActual = respuesta ? conGenero(respuesta) : p?.texto ? conGenero(p.texto) : "";

  // Typewriter effect: letters appear progressively; tap speeds it up.
  useEffect(() => {
    setLetrasVisibles(0);
    if (!textoActual) return;
    const duracionMs = Math.min(500, Math.max(160, textoActual.length * 14));
    const intervalo = Math.max(12, duracionMs / textoActual.length);
    let n = 0;
    const id = setInterval(() => {
      n += 2;
      if (n >= textoActual.length) {
        setLetrasVisibles(textoActual.length);
        clearInterval(id);
      } else {
        setLetrasVisibles(n);
      }
    }, intervalo);
    return () => clearInterval(id);
  }, [i, respuesta, textoActual]);

  // Walks on from step `desde`, applying the marks and effects on the way. The scene ends after its last step.
  const avanzar = (desde: number) => {
    let k = desde;
    while (k < pasos.length && invisible(pasos[k])) {
      if (pasos[k].marca) marcar(pasos[k].marca!);
      if (pasos[k].efecto) setEfecto(pasos[k].efecto!);
      k++;
    }
    setRespuesta(null);
    k >= pasos.length ? terminar(true) : setI(k);
  };

  const avanzarLinea = () => {
    sonarToque();
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(12);
    if (letrasVisibles < textoActual.length) {
      setLetrasVisibles(textoActual.length);
      return;
    }
    if (fasePaso === "saliendo") return;
    setFasePaso("saliendo");
    setTimeout(() => {
      avanzar(i + 1);
      setFasePaso("entrando");
      setTimeout(() => setFasePaso("activo"), 140);
    }, 80);
  };

  // Over: finished (hecha), skipped (hecha, saltada) or paused (not hecha: it goes on from this line next time).
  const terminar = (hecha: boolean, motivo?: "saltada" | "pausada", datos: Record<string, unknown> = {}) => {
    registrar("escena", { escena: escena.id, paso: "fin", ...(motivo ? { [motivo]: true } : {}), ...datos });
    if (hecha && motivo !== "saltada") {
      for (const paso of pasos) {
        if (paso.marca) marcar(paso.marca);
      }
    }
    terminarEscena(escena.id, hecha, i);
    alTerminar(hecha);
  };

  useEffect(() => {
    registrar("escena", { escena: escena.id, paso: "inicio" });
    avanzar(i);
  }, []);

  useEffect(() => {
    t0.current = performance.now();
  }, [i]);

  const elegir = (j: number) => {
    sonarToque();
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
    const [codigo, , res] = p.opciones![j];
    registrar("escena", {
      escena: escena.id,
      paso: "opcion",
      de: ultimoAntes(pasos, i),
      opciones: orden.map((k) => p.opciones![k][0]),
      elegida: codigo,
      ms_decidir: Math.round(performance.now() - t0.current),
    });
    setOpcionElegida(j);
    setFasePaso("saliendo");
    setTimeout(() => {
      setOpcionElegida(null);
      if (res) {
        setRespuesta(res);
        setFasePaso("entrando");
        setTimeout(() => setFasePaso("activo"), 140);
      } else {
        avanzar(i + 1);
        setFasePaso("entrando");
        setTimeout(() => setFasePaso("activo"), 140);
      }
    }, 90);
  };

  // Keys 1 to 4 choose an option; Space / Enter advance dialogue lines.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space" || e.code === "Enter") {
        if (!p?.opciones || respuesta) {
          e.preventDefault();
          avanzarLinea();
          return;
        }
      }
      if (!p?.opciones || respuesta) return;
      const k = Number(e.key) - 1;
      if (k >= 0 && k < orden.length) elegir(orden[k]);
    };
    addEventListener("keydown", tecla);
    return () => removeEventListener("keydown", tecla);
  });

  const esMain = !escena.sugerida;

  // A minigame reports its result: the mark it leaves, the code of the choice, and the log.
  const alJuego = (r?: Resultado) => {
    registrar("minijuego", { minijuego: p.minijuego, resultado: "completado", ms: Math.round(performance.now() - t0.current), ...(r?.codigo ? { codigo: r.codigo } : {}) });
    if (r?.marca) marcar(r.marca);
    avanzar(i + 1);
  };

  const abortarMinijuego = (motivo: "click_fuera" | "boton_cerrar" | "boton_pausar") => {
    if (!p?.minijuego) return;
    const ms = Math.round(performance.now() - t0.current);
    registrar("minijuego", {
      minijuego: p.minijuego,
      resultado: "abortado",
      motivo,
      ms,
      escena: escena.id,
      es_main: esMain,
    });
    registrar("escena", {
      escena: escena.id,
      paso: "minijuego_abortado",
      minijuego: p.minijuego,
      motivo,
      es_main: esMain,
      ms,
    });

    if (esMain || motivo === "boton_pausar") {
      terminar(false, "pausada", { motivo, minijuego: p.minijuego, es_main: esMain });
    } else {
      terminar(true, "saltada", { motivo, minijuego: p.minijuego, es_main: false });
    }
  };

  const saltarMinijuego = () => {
    if (!p?.minijuego) return;
    const ms = Math.round(performance.now() - t0.current);
    registrar("minijuego", {
      minijuego: p.minijuego,
      resultado: "saltado",
      motivo: "omitir_objetivo",
      ms,
      escena: escena.id,
      es_main: esMain,
    });
    registrar("escena", {
      escena: escena.id,
      paso: "minijuego_saltado",
      motivo: "omitir_objetivo",
      minijuego: p.minijuego,
      es_main: esMain,
      ms,
    });

    terminar(true, "saltada", { motivo: "omitir_objetivo", minijuego: p.minijuego, es_main: esMain });
  };

  // Lines of a scene: RPG-style dialogue box docked at the bottom with title and 1-2 line description.
  const linea = (quien: string, texto: string, de?: string, titulo?: string) => {
    const textoCompleto = conGenero(texto);
    const visible = letrasVisibles >= textoCompleto.length ? textoCompleto : textoCompleto.slice(0, letrasVisibles);
    const estaCompleto = letrasVisibles >= textoCompleto.length;
    const tituloFinal = titulo ? conGenero(titulo) : null;
    return (
      <div className={`escena-contenedor-dialogo fase-${fasePaso}`}>
        <div className={`escena-caja interactiva panel fase-${fasePaso}`} role="status" style={{ cursor: "pointer" }}>
          {quien && (
            <div className="escena-nombre-placa">
              <span>{quien}</span>
            </div>
          )}
          <div className={`escena-cuerpo fase-${fasePaso}`}>
            {de && <RetratoHablante de={de} />}
            <div className="escena-texto-col">
              {tituloFinal && <h3 className="escena-titulo">{tituloFinal}</h3>}
              <p className="escena-descripcion">
                {visible}
                {!estaCompleto && <span className="cursor-escena" aria-hidden="true">▍</span>}
              </p>
            </div>
          </div>
          <div className={`escena-pie fase-${fasePaso}`}>
            <Bocina clave={`escena.${escena.id}.${i}`} texto={tituloFinal ? `${tituloFinal}. ${textoCompleto}` : textoCompleto} />
            <div className="escena-indicador-avance">
              {estaCompleto ? (
                <button
                  type="button"
                  className="boton-avance-dialogo estado-listo"
                  aria-label="Continuar conversación"
                >
                  <span className="boton-avance-texto">Continuar</span>
                  <span className="boton-avance-flecha" aria-hidden="true">▼</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="boton-avance-dialogo estado-acelerar"
                  aria-label="Acelerar texto"
                >
                  <span className="boton-avance-texto">Acelerar</span>
                  <span className="boton-avance-icono" aria-hidden="true">⏩</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Efectos in Opciones, 0 to 5: the strength of the effect on screen; at 0 there is none.
  const fuerza = estado().opciones.efectos / 5;

  if (!p) return null;

  // Tapping the dialogue box advances it or completes its typewriter text; a tap anywhere else does nothing, so a stray
  // touch never skips a line. In minigames, tapping outside the game area aborts the activity.
  const alTocarPantalla = (e: React.MouseEvent<HTMLElement>) => {
    if (e.target instanceof Element && e.target.closest(".escena-controles, .bocina, .minijuego-acciones, .respuesta-btn")) return;
    if (p.minijuego) {
      if (e.target instanceof Element && e.target.closest(".juego, .dibujo")) return;
      abortarMinijuego("click_fuera");
      return;
    }
    if (p.opciones && !respuesta) return;
    if (!(e.target instanceof Element && e.target.closest(".escena-caja"))) return;
    avanzarLinea();
  };

  return (
    <section className="escena" aria-label={escena.nombre} onClick={alTocarPantalla}>
      {efecto && fuerza > 0 && <div className={`escena-efecto ${efecto}`} style={{ "--fuerza": fuerza } as CSSProperties} />}
      {!p.minijuego && (
        <div className="escena-controles">
          {escena.saltable && (
            <button className="boton" onClick={() => terminar(true, "saltada")}>
              {E.saltar}
            </button>
          )}
          <button className="boton" onClick={() => terminar(false, "pausada")}>
            {E.pausar}
          </button>
        </div>
      )}

      {p.de !== undefined && linea(hablante(p.de), p.texto!, p.de, p.titulo)}

      {p.opciones && !respuesta && (
        <div className={`escena-contenedor-dialogo con-opciones fase-${fasePaso}`}>
          {(() => {
            const pasoPrevio = [...pasos.slice(0, i)].reverse().find((x) => x.texto);
            const hablantePrevio = ultimoAntes(pasos, i);
            const tituloPregunta = p.titulo ? conGenero(p.titulo) : pasoPrevio?.titulo ? conGenero(pasoPrevio.titulo) : "¿Qué respondes?";
            const textoPregunta = pasoPrevio ? conGenero(pasoPrevio.texto!) : "¿Qué quieres responder?";
            return (
              <div className={`escena-caja fija opciones-libro panel fase-${fasePaso}`} role="status">
                <div className="escena-nombre-placa">
                  <span>{hablante(hablantePrevio)}</span>
                </div>
                <div className="escena-cuerpo">
                  <RetratoHablante de={hablantePrevio} />
                  <div className="escena-texto-col">
                    <h3 className="escena-titulo">{tituloPregunta}</h3>
                    <p className="escena-descripcion">{textoPregunta}</p>
                  </div>
                </div>
              </div>
            );
          })()}
          <div className="respuestas-integradas" role="group">
            {orden.map((j, n) => (
              <button
                key={j}
                className={`boton principal respuesta-btn${opcionElegida === j ? " seleccionada" : ""}`}
                style={{ "--opcion-idx": n } as CSSProperties}
                onClick={() => elegir(j)}
              >
                <span className="escena-numero">{n + 1}</span>
                <span>{conGenero(p.opciones![j][1])}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {p.opciones && respuesta && linea(hablante(ultimoAntes(pasos, i)), respuesta, ultimoAntes(pasos, i), "Respuesta")}

      {p.minijuego && (
        <div className="escena-contenedor-minijuego" onClick={(e) => e.stopPropagation()}>
          <div className="minijuego-panel panel">
            {JUEGOS[p.minijuego]({
              alTerminar: alJuego,
              alOmitirObjetivo: saltarMinijuego,
              alPausar: () => abortarMinijuego("boton_pausar"),
            })}
            <div className="minijuego-acciones" role="toolbar" aria-label="Opciones de actividad">
              <button
                type="button"
                className="boton suave boton-cerrar-minijuego"
                onClick={() => abortarMinijuego("boton_pausar")}
                aria-label={E.seguir_despues}
              >
                {E.seguir_despues}
              </button>
              <button
                type="button"
                className="boton principal boton-saltar-minijuego"
                onClick={saltarMinijuego}
                aria-label={E.omitir_objetivo}
              >
                {E.omitir_objetivo}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
