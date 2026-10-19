import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import contenido from "virtual:contenido";
import { Personaje, Retrato } from "../lienzo/Personaje";
import { precargar, idsDe, queEs, colorMedio, cuantos } from "../lienzo/arte";
import { Bocina } from "../ui/Bocina";
import { Icono } from "../ui/iconos";
import { estado, cambiarEstado } from "../datos/guardado";
import { registrar } from "../datos/eventos";
import type { Apariencia, Extra } from "../personaje/apariencia";
import "./creacion.css";

const T = contenido.textos.creacion;
const CABELLOS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"];
const EXTRAS: Extra[] = ["lentes", "aretes", "gorra", "mochila"];
const PESTANAS = [
  { id: "cuerpo", icono: Icono.cuerpo, nombre: "Cuerpo", pregunta: T.pasos.cuerpo },
  { id: "piel", icono: Icono.piel, nombre: "Piel", pregunta: T.pasos.piel },
  { id: "cabello", icono: Icono.cabello, nombre: "Cabello", pregunta: T.pasos.cabello },
  { id: "ropa", icono: Icono.ropa, nombre: "Ropa", pregunta: T.pasos.ropa },
  { id: "extras", icono: Icono.extras, nombre: "Extras", pregunta: T.pasos.extras },
  { id: "nombre", icono: Icono.nombre, nombre: "Nombre", pregunta: T.pasos.nombre },
] as const;
type Pestana = (typeof PESTANAS)[number]["id"];

// Whole-number scale that fits the character in its box (pixel art stays sharp).
function useEscala(caja: React.RefObject<HTMLElement | null>) {
  const [escala, setEscala] = useState(4);
  useLayoutEffect(() => {
    const el = caja.current!;
    const medir = () => setEscala(Math.max(2, Math.floor(Math.min((el.clientHeight * 0.82) / 48, (el.clientWidth * 0.42) / 32))));
    medir();
    const o = new ResizeObserver(medir);
    o.observe(el);
    return () => o.disconnect();
  }, [caja]);
  return escala;
}

// Character creation (GDD §6): everything on one screen, one tap per choice, the character changes
// as the child chooses. Also opened from the mirror in the house (modo "espejo").
export function Creacion({ modo, alTerminar }: { modo: "inicio" | "espejo"; alTerminar: () => void }) {
  const [a, setA] = useState<Apariencia>(() => structuredClone(estado().apariencia));
  const [nombre, setNombre] = useState(estado().nombre);
  const [pestana, setPestana] = useState<Pestana>("cuerpo");
  const [listo, setListo] = useState(false);
  const [vacila, setVacila] = useState(false);
  const toques = useRef(0);
  const t0 = useRef(performance.now());
  // Skin tones in a new random order each time, so the first one is never "the normal one".
  const ordenPiel = useMemo(() => [...Array(cuantos("piel")).keys()].sort(() => Math.random() - 0.5), []);
  const escenario = useRef<HTMLDivElement>(null);
  const escala = useEscala(escenario);

  useEffect(() => {
    void precargar(idsDe("personaje/")).then(() => setListo(true));
  }, []);

  const cambiar = (c: Partial<Apariencia>) => {
    toques.current++;
    setA((x) => ({ ...x, ...c }));
  };

  const terminar = () => {
    if (!nombre) {
      setPestana("nombre");
      setVacila(true);
      setTimeout(() => setVacila(false), 400);
      return;
    }
    // The name never goes into an event (GDD §6).
    registrar("personaje", {
      momento: modo,
      cuerpo: a.cuerpo,
      tono: a.piel + 1,
      orden_tonos: ordenPiel.map((i) => i + 1),
      cabello: a.cabello,
      color_cabello: a.colorCabello + 1,
      ropa: a.ropa === "uniforme" ? `uniforme_${a.abajo}` : "casa",
      extras: a.extras,
      color_mochila: a.extras.includes("mochila") ? a.colorMochila + 1 : null,
      nombre_de_lista: T.nombres.includes(nombre),
      toques: toques.current,
      ms: Math.round(performance.now() - t0.current),
    });
    cambiarEstado({ apariencia: a, nombre, creado: true }, true);
    alTerminar();
  };

  const p = PESTANAS.find((x) => x.id === pestana)!;

  return (
    <main className="pantalla creacion">
      <div className="escenario" ref={escenario}>
        <div className="foco" />
        {listo && <Personaje a={a} escala={escala} camina />}
        {nombre && <div className="nombre-escenario">{nombre}</div>}
      </div>

      <section className="taller panel">
        <nav className="pestanas" role="tablist">
          {PESTANAS.map((x) => (
            <button key={x.id} role="tab" aria-selected={x.id === pestana} className="pestana" onClick={() => setPestana(x.id)}>
              {x.icono}
              <span>{x.nombre}</span>
            </button>
          ))}
        </nav>

        <header className="pregunta">
          <h2>{p.pregunta}</h2>
          <Bocina clave={`creacion.pasos.${p.id}`} texto={p.pregunta} />
        </header>

        <div className={`opciones ${pestana}`} key={pestana}>
          {listo && pestana === "cuerpo" &&
            (["nina", "nino", "neutro"] as const).map((c) => (
              <button key={c} className="opcion" aria-pressed={a.cuerpo === c} aria-label={T.cuerpo[c]} onClick={() => cambiar({ cuerpo: c })}>
                <Personaje a={{ ...a, cuerpo: c }} escala={2} />
                <span className="pie">{T.cuerpo[c]}</span>
              </button>
            ))}

          {pestana === "piel" &&
            ordenPiel.map((i) => <button key={i} className="muestra" aria-pressed={a.piel === i} aria-label={`Tono ${i + 1}`} style={{ background: colorMedio("piel", i) }} onClick={() => cambiar({ piel: i })} />)}

          {listo && pestana === "cabello" && (
            <>
              <div className="fila-colores">
                {[...Array(cuantos("cabello")).keys()].map((i) => (
                  <button key={i} className="muestra" aria-pressed={a.colorCabello === i} aria-label={`Color ${i + 1}`} style={{ background: colorMedio("cabello", i) }} onClick={() => cambiar({ colorCabello: i })} />
                ))}
              </div>
              {CABELLOS.map((c) => (
                <button key={c} className="opcion" aria-pressed={a.cabello === c} aria-label={queEs(`personaje/cabello_${c}`)} onClick={() => cambiar({ cabello: c })}>
                  <Retrato a={{ ...a, cabello: c, extras: [] }} tam={64} />
                </button>
              ))}
            </>
          )}

          {listo && pestana === "ropa" &&
            (["uniforme_pantalon", "uniforme_falda", "casa"] as const).map((r) => {
              const cambio: Partial<Apariencia> = r === "casa" ? { ropa: "casa" } : { ropa: "uniforme", abajo: r === "uniforme_falda" ? "falda" : "pantalon" };
              const elegida = r === "casa" ? a.ropa === "casa" : a.ropa === "uniforme" && a.abajo === cambio.abajo;
              return (
                <button key={r} className="opcion" aria-pressed={elegida} aria-label={T.ropa[r]} onClick={() => cambiar(cambio)}>
                  <Personaje a={{ ...a, ...cambio }} escala={2} />
                </button>
              );
            })}

          {listo && pestana === "extras" && (
            <>
              {EXTRAS.map((e) => {
                const tiene = a.extras.includes(e);
                return (
                  <button key={e} className="opcion" aria-pressed={tiene} aria-label={T.extras[e]} onClick={() => cambiar({ extras: tiene ? a.extras.filter((x) => x !== e) : [...a.extras, e] })}>
                    {e === "mochila" ? <Personaje a={{ ...a, extras: ["mochila"] }} escala={2} direccion="arriba" /> : <Retrato a={{ ...a, extras: [e] }} tam={64} />}
                  </button>
                );
              })}
              {a.extras.includes("mochila") && (
                <div className="fila-colores">
                  {[...Array(cuantos("mochila")).keys()].map((i) => (
                    <button key={i} className="muestra" aria-pressed={a.colorMochila === i} aria-label={`Mochila ${i + 1}`} style={{ background: colorMedio("mochila", i) }} onClick={() => cambiar({ colorMochila: i })} />
                  ))}
                </div>
              )}
            </>
          )}

          {pestana === "nombre" && (
            <>
              <label className={`escribir${vacila ? " vacilar" : ""}`}>
                {Icono.lapiz}
                <input
                  className="campo"
                  placeholder={T.escribir_nombre}
                  maxLength={14}
                  value={T.nombres.includes(nombre) ? "" : nombre}
                  onChange={(e) => setNombre(e.target.value.replace(/[^\p{L} ]/gu, "").replace(/^ +/, ""))}
                  onBlur={() => setNombre((n) => n.trim())}
                />
              </label>
              <div className="nombres">
                {T.nombres.map((n) => (
                  <button key={n} className="chip" aria-pressed={nombre === n} onClick={() => ((toques.current += 1), setNombre(n))}>
                    {n}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <footer className="pie-taller">
          <button className="boton principal" onClick={terminar}>
            {Icono.listo}
            {T.listo}
          </button>
        </footer>
      </section>
    </main>
  );
}
