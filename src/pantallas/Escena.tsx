// Runs one scene of the story over the world (contenido/escenas.yaml): lines to read, options to choose, minigames,
// marks and missions. Nothing runs by itself: the child goes on with "Seguir", and a scene never ends on its own.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import contenido, { type Escena, type Paso } from "virtual:contenido";
import { cambiarEstado, estado } from "../datos/guardado";
import { azar } from "../datos/azar";
import { registrar, semilla } from "../datos/eventos";
import { conGenero, marcar, mision, terminarEscena } from "../datos/escenas";
import { Bocina } from "../ui/Bocina";
import { Cabeza, Cara } from "../lienzo/Personaje";
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

// Steps that set something without waiting for the child: marks, missions and effects are applied as the scene reaches them.
const invisible = (p: Paso) => p.marca !== undefined || p.mision !== undefined || p.efecto !== undefined;

export function Escena({ escena, alTerminar }: { escena: Escena; alTerminar: (hecha: boolean) => void }) {
  const pasos = escena.pasos;
  const [i, setI] = useState(0);
  const [respuesta, setRespuesta] = useState<string | null>(null); // the answer to the option just chosen
  const [efecto, setEfecto] = useState<string | null>(null); // the effect on screen, until the next one or the scene ends
  const [letrasVisibles, setLetrasVisibles] = useState(0);
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

  // Walks on from step `desde`, applying the marks and missions on the way. The scene ends after its last step.
  const avanzar = (desde: number) => {
    let k = desde;
    while (k < pasos.length && invisible(pasos[k])) {
      if (pasos[k].marca) marcar(pasos[k].marca!);
      if (pasos[k].mision) mision(pasos[k].mision!);
      if (pasos[k].efecto) setEfecto(pasos[k].efecto!);
      k++;
    }
    setRespuesta(null);
    k >= pasos.length ? terminar(true) : setI(k);
  };

  const avanzarLinea = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(12);
    if (letrasVisibles < textoActual.length) {
      setLetrasVisibles(textoActual.length);
      return;
    }
    avanzar(i + 1);
  };

  // Over: finished (hecha), skipped (hecha, saltada) or paused (not hecha: it starts again next time).
  const terminar = (hecha: boolean, motivo?: "saltada" | "pausada", datos: Record<string, unknown> = {}) => {
    registrar("escena", { escena: escena.id, paso: "fin", ...(motivo ? { [motivo]: true } : {}), ...datos });
    terminarEscena(escena.id, hecha);
    alTerminar(hecha);
  };

  useEffect(() => {
    registrar("escena", { escena: escena.id, paso: "inicio" });
    avanzar(0);
  }, []);

  useEffect(() => {
    t0.current = performance.now();
  }, [i]);

  const elegir = (j: number) => {
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
    if (res) setRespuesta(res);
    else avanzar(i + 1);
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

  const marcasPorDefecto: Record<string, Resultado> = {
    estufa: { marca: "estufa_prendida" },
    ropero: { marca: "ropa_uniforme", codigo: "ELIGE_UNIFORME" },
    examen: { marca: "hizo_examen" },
    tienda: { marca: "hizo_compras" },
  };

  // A minigame reports its result: the mark it leaves, the code of the choice, and the log.
  const alJuego = (r?: Resultado) => {
    registrar("minijuego", { minijuego: p.minijuego, resultado: "completado", ms: Math.round(performance.now() - t0.current), ...(r?.codigo ? { codigo: r.codigo } : {}) });
    if (r?.marca) marcar(r.marca);
    avanzar(i + 1);
  };

  const abortarMinijuego = (motivo: "click_fuera" | "boton_cerrar") => {
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

    if (esMain) {
      terminar(false, "pausada", { motivo, minijuego: p.minijuego, es_main: true });
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
      motivo: "boton_saltar",
      ms,
      escena: escena.id,
      es_main: esMain,
    });
    registrar("escena", {
      escena: escena.id,
      paso: "minijuego_saltado",
      minijuego: p.minijuego,
      es_main: esMain,
      ms,
    });

    const resDefecto = marcasPorDefecto[p.minijuego];
    if (resDefecto?.marca) marcar(resDefecto.marca);
    if (p.minijuego === "ropero") {
      cambiarEstado({ apariencia: { ...estado().apariencia, ropa: "uniforme" } }, true);
    }
    avanzar(i + 1);
  };

  // Lines of a scene: RPG-style dialogue box docked at the bottom with title and 1-2 line description.
  const linea = (quien: string, texto: string, de?: string, titulo?: string) => {
    const textoCompleto = conGenero(texto);
    const visible = letrasVisibles >= textoCompleto.length ? textoCompleto : textoCompleto.slice(0, letrasVisibles);
    const estaCompleto = letrasVisibles >= textoCompleto.length;
    const tituloFinal = titulo ? conGenero(titulo) : null;
    return (
      <div className="escena-contenedor-dialogo">
        <div className="escena-caja interactiva" role="status" onClick={avanzarLinea} style={{ cursor: "pointer" }}>
          {quien && (
            <div className="escena-nombre-placa">
              <span>{quien}</span>
            </div>
          )}
          <div className="escena-cuerpo">
            {de && <RetratoHablante de={de} />}
            <div className="escena-texto-col">
              {tituloFinal && <h3 className="escena-titulo">{tituloFinal}</h3>}
              <p className="escena-descripcion">
                {visible}
                {!estaCompleto && <span className="cursor-escena" aria-hidden="true">▍</span>}
              </p>
            </div>
          </div>
          <div className="escena-pie">
            <Bocina clave={`escena.${escena.id}.${i}`} texto={tituloFinal ? `${tituloFinal}. ${textoCompleto}` : textoCompleto} />
            <div className="escena-indicador-avance">
              {estaCompleto ? (
                <span className="escena-flecha-avance" aria-hidden="true">▼ Continuar</span>
              ) : (
                <span className="escena-saltar-texto">Toca para acelerar</span>
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
  const cerrarFuera = (e: React.MouseEvent<HTMLElement>) => {
    if (e.target instanceof Element && e.target.closest(".escena-contenedor-dialogo, .escena-controles, .juego, .dibujo, .minijuego-barra-superior")) return;
    if (p.minijuego) {
      abortarMinijuego("click_fuera");
      return;
    }
    if (p.de === undefined && !p.opciones) return;
    const opciones = !!p.opciones && !respuesta;
    terminar(false, "pausada", {
      cierre_fuera: true,
      formato: opciones ? "opciones" : "dialogo",
      indice_paso: i,
      ...(opciones ? { opciones: orden.map((j) => p.opciones![j][0]) } : {}),
      ms_en_paso: Math.round(performance.now() - t0.current),
    });
  };
  return (
    <section className="escena" aria-label={escena.nombre} onClick={cerrarFuera}>
      {efecto && fuerza > 0 && <div className={`escena-efecto ${efecto}`} style={{ "--fuerza": fuerza } as CSSProperties} />}
      <div className="escena-controles">
        {escena.saltable && (
          <button className="boton" onClick={() => terminar(true, "saltada")}>
            {E.saltar}
          </button>
        )}
        {escena.delicada && (
          <button className="boton" onClick={() => terminar(false, "pausada")}>
            {E.pausar}
          </button>
        )}
      </div>

      {p.de !== undefined && linea(hablante(p.de), p.texto!, p.de, p.titulo)}

      {p.opciones && !respuesta && (
        <div className="escena-contenedor-dialogo con-opciones">
          <div className="respuestas-integradas" role="group">
            {orden.map((j, n) => (
              <button key={j} className="boton principal respuesta-btn" onClick={() => elegir(j)}>
                <span className="escena-numero">{n + 1}</span>
                <span>{conGenero(p.opciones![j][1])}</span>
              </button>
            ))}
          </div>
          {(() => {
            const pasoPrevio = [...pasos.slice(0, i)].reverse().find((x) => x.texto);
            const hablantePrevio = ultimoAntes(pasos, i);
            const tituloPregunta = p.titulo ? conGenero(p.titulo) : pasoPrevio?.titulo ? conGenero(pasoPrevio.titulo) : "¿Qué respondes?";
            const textoPregunta = pasoPrevio ? conGenero(pasoPrevio.texto!) : "¿Qué quieres responder?";
            return (
              <div className="escena-caja fija" role="status">
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
        </div>
      )}
      {p.opciones && respuesta && linea(hablante(ultimoAntes(pasos, i)), respuesta, ultimoAntes(pasos, i), "Respuesta")}

      {p.minijuego && (
        <div className="escena-contenedor-minijuego" onClick={(e) => e.stopPropagation()}>
          <div className="minijuego-barra-superior" role="toolbar" aria-label="Controles de actividad">
            <button
              type="button"
              className="boton suave boton-cerrar-minijuego"
              onClick={() => abortarMinijuego("boton_cerrar")}
              aria-label={esMain ? "Volver al mapa" : "Cerrar actividad"}
            >
              ✕ {esMain ? "Volver" : "Cerrar"}
            </button>
            <button
              type="button"
              className="boton principal boton-saltar-minijuego"
              onClick={saltarMinijuego}
              aria-label="Saltar actividad"
            >
              ⏭ Saltar actividad
            </button>
          </div>
          {JUEGOS[p.minijuego]({
            alTerminar: alJuego,
            alAbortar: () => abortarMinijuego("boton_cerrar"),
          })}
        </div>
      )}
    </section>
  );
}
