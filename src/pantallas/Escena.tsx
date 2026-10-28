// Runs one scene of the story over the world (contenido/escenas.yaml): lines to read, options to choose, minigames,
// marks and missions. Nothing runs by itself: the child goes on with "Seguir", and a scene never ends on its own.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import contenido, { type Escena, type Paso } from "virtual:contenido";
import { estado } from "../datos/guardado";
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
  if (de === "sistema") return null;
  if (de === "yo" || de === "pensamiento") {
    return (
      <div className="escena-retrato" aria-hidden="true">
        <Cabeza a={estado().apariencia} escala={1.5} />
      </div>
    );
  }
  const piel = estado().apariencia.colores.piel ?? 0;
  if (de === "madre" || de === "mama") {
    return (
      <div className="escena-retrato" aria-hidden="true">
        <Cara id="figuras/mama" piel={piel} tam={48} />
      </div>
    );
  }
  if (de === "papa" || de === "padre") {
    return (
      <div className="escena-retrato" aria-hidden="true">
        <Cara id="figuras/papa" piel={piel} tam={48} />
      </div>
    );
  }
  if (de === "tio") {
    return (
      <div className="escena-retrato" aria-hidden="true">
        <Cara id="figuras/tio" piel={piel} tam={48} />
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
      <Cara id={`personajes/${archivo}`} tam={48} />
    </div>
  );
}

// Who spoke last before step `i`: the answer to an option comes from them.
const ultimoAntes = (pasos: Paso[], i: number) => [...pasos.slice(0, i)].reverse().find((p) => p.de)?.de ?? "pensamiento";

// Steps that set something without waiting for the child: marks, missions and effects are applied as the scene reaches them.
const invisible = (p: Paso) => p.marca !== undefined || p.mision !== undefined || p.efecto !== undefined;

export function Escena({ escena, alTerminar }: { escena: Escena; alTerminar: () => void }) {
  const pasos = escena.pasos;
  const [i, setI] = useState(0);
  const [respuesta, setRespuesta] = useState<string | null>(null); // the answer to the option just chosen
  const [efecto, setEfecto] = useState<string | null>(null); // the effect on screen, until the next one or the scene ends
  const t0 = useRef(performance.now()); // when the options of this step appeared
  const p = pasos[i];
  const orden = useMemo(() => (p?.opciones ? azar(`${semilla()}:${escena.id}:${i}`).barajar(p.opciones.map((_, j) => j)) : []), [i]);

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

  // Over: finished (hecha), skipped (hecha, saltada) or paused (not hecha: it starts again next time).
  const terminar = (hecha: boolean, motivo?: "saltada" | "pausada") => {
    registrar("escena", { escena: escena.id, paso: "fin", ...(motivo ? { [motivo]: true } : {}) });
    terminarEscena(escena.id, hecha);
    alTerminar();
  };

  useEffect(() => {
    registrar("escena", { escena: escena.id, paso: "inicio" });
    avanzar(0);
  }, []);

  useEffect(() => {
    t0.current = performance.now();
  }, [i]);

  const elegir = (j: number) => {
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

  // Keys 1 to 4 choose an option on a computer.
  useEffect(() => {
    if (!p?.opciones || respuesta) return;
    const tecla = (e: KeyboardEvent) => {
      const k = Number(e.key) - 1;
      if (k >= 0 && k < orden.length) elegir(orden[k]);
    };
    addEventListener("keydown", tecla);
    return () => removeEventListener("keydown", tecla);
  });

  // A minigame reports its result: the mark it leaves, the code of the choice, and the log.
  const alJuego = (r?: Resultado) => {
    registrar("minijuego", { minijuego: p.minijuego, resultado: "completado", ms: Math.round(performance.now() - t0.current), ...(r?.codigo ? { codigo: r.codigo } : {}) });
    if (r?.marca) marcar(r.marca);
    avanzar(i + 1);
  };

  // Lines of a scene are read at the child's pace: they only go on with "Seguir".
  const linea = (quien: string, texto: string, de?: string) => (
    <div className="escena-caja" role="status">
      <div className="escena-hablante-fila">
        {de && <RetratoHablante de={de} />}
        <span className="globo-quien">{quien}</span>
      </div>
      <p>{conGenero(texto)}</p>
      <div className="escena-acciones">
        <Bocina clave={`escena.${escena.id}.${i}`} texto={conGenero(texto)} />
        <button className="boton principal" onClick={() => avanzar(i + 1)}>
          {E.seguir}
        </button>
      </div>
    </div>
  );

  // Efectos in Opciones, 0 to 5: the strength of the effect on screen; at 0 there is none.
  const fuerza = estado().opciones.efectos / 5;

  if (!p) return null;
  return (
    <section className="escena" aria-label={escena.nombre}>
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

      {p.de !== undefined && linea(hablante(p.de), p.texto!, p.de)}

      {p.opciones && !respuesta && (
        <div className="respuestas" role="group">
          {orden.map((j, n) => (
            <div key={j} className="respuesta">
              <button className="boton principal" onClick={() => elegir(j)}>
                <span className="escena-numero">{n + 1}</span> {conGenero(p.opciones![j][1])}
              </button>
            </div>
          ))}
        </div>
      )}
      {p.opciones && respuesta && linea(hablante(ultimoAntes(pasos, i)), respuesta, ultimoAntes(pasos, i))}

      {p.minijuego && JUEGOS[p.minijuego]({ alTerminar: alJuego })}
    </section>
  );
}
