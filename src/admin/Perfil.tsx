// One participant's view: the character, what they chose by area next to everyone else, what they drew, the
// request to talk, the scenes and games as they went, and the files for this participant alone.
import { useEffect, useMemo, useRef, useState } from "react";
import { Personaje } from "../lienzo/Personaje";
import { HOJA, pintarHoja, type Trazo } from "../pantallas/Dibujo";
import { pedir } from "./api";
import * as K from "./calculos";
import type { Evento } from "./calculos";
import { avanceMinijuego, CONTENIDO, escena, etiqueta, fecha, legible, lugar, numero } from "./palabras";
import { Barras, Cifras, Descargas, Plegable, Progreso, Seccion } from "./piezas";

export function Perfil({ nino, todos }: { nino: string; todos: Evento[] }) {
  const [evs, setEvs] = useState<Evento[] | null>(null);
  useEffect(() => {
    void pedir(`api/admin/eventos?nino=${encodeURIComponent(nino)}`).then((r) => setEvs(r === "fuera" ? [] : r));
  }, [nino]);
  const referencias = useMemo(() => [...K.porParticipante(todos).values()].map((e) => K.codigosPorArea(e, CONTENIDO)), [todos]);
  if (!evs) return <p>Cargando…</p>;
  if (!evs.length) return <section><p>Sin datos de este participante.</p></section>;

  const quiere = evs.filter((e) => e.tipo === "quiero_hablar");
  const res = K.resumen(nino, evs);
  const cal = K.calidad(evs);
  const ap = K.aparienciaDe(evs);
  const areas = K.codigosPorArea(evs, CONTENIDO);
  const esc = K.escenas(evs);
  const juegos = K.minijuegos(evs);
  const dibujos = evs.filter((e) => e.tipo === "dibujo" && e.imagen);
  const explora = K.exploracion(evs, CONTENIDO);
  const recorrido = evs.filter((e) => e.tipo === "pantalla");

  return (
    <>
      <section className="ficha">
        <div className="ficha-figura">
          {ap ? <Personaje a={ap} escala={3} /> : <p className="nota">No terminó su personaje.</p>}
        </div>
        <div className="ficha-datos">
          <p><span className="pastilla">{res.dispositivo}</span></p>
          <Progreso dia={res.dia} termino={res.termino} />
          <p className="nota">Última vez: {fecha(res.ultima)} · Se quedó en: {lugar(res.ultimaPantalla)}</p>
        </div>
      </section>

      <Seccion titulo="Lo que eligió, por área" nota="Compara lo que eligió con lo que eligieron las demás personas. No es una medida clínica. Lo típico es el valor del medio: la mitad de las personas eligió eso igual o menos veces.">
        <div className="areas">
          {CONTENIDO.areas.filter((a) => areas.has(a.id)).map((a) => (
            <div key={a.id} className="area">
              <h3>{a.nombre}</h3>
              {[...areas.get(a.id)!].sort((x, y) => y[1].n - x[1].n).map(([codigo, f]) => {
                const r = K.referencia(referencias, a.id, codigo);
                return (
                  <div key={codigo} className="comparar">
                    <p>{etiqueta(codigo)} <span className="nota">en {[...f.escenas].map(escena).join(", ")}</span></p>
                    <Barras
                      filas={[
                        { nombre: "Esta persona", valor: f.n },
                        { nombre: "Las demás", valor: r.mediana, texto: `${numero(r.mediana)} (de ${r.min} a ${r.max})`, otra: true },
                      ]}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Seccion>

      {dibujos.length > 0 && (
        <Seccion titulo="Lo que dibujó">
          <div className="dibujos">{dibujos.map((d) => <DibujoVisto key={d.id} d={d} />)}</div>
        </Seccion>
      )}

      {quiere.length > 0 && (
        <Seccion className="alerta" titulo="Pidió hablar con alguien">
          <ul>{quiere.map((q) => <li key={q.id}>{fecha(q.cuando)} · {lugar(q.pantalla)}</li>)}</ul>
        </Seccion>
      )}

      <Seccion titulo="En números">
        <Cifras
          filas={[
            { valor: res.sesiones, texto: "veces que entró" },
            { valor: res.minutos, texto: "minutos jugados" },
            { valor: res.respuestas, texto: "decisiones en las situaciones" },
            { valor: res.minijuegos, texto: "juegos cortos" },
          ]}
        />
      </Seccion>

      <Seccion titulo="Situaciones" nota="Cuántas veces empezó cada una, si la saltó o la pausó, qué eligió y cuánto tardó en decidir.">
        {esc.size ? (
          <table>
            <thead><tr><th>Situación</th><th className="num">Veces</th><th className="num">Se saltó</th><th className="num">Se pausó</th><th>Qué eligió</th></tr></thead>
            <tbody>
              {[...esc].map(([id, f]) => (
                <tr key={id}><td>{escena(id)}</td><td className="num">{f.veces}</td><td className="num">{f.saltada || ""}</td><td className="num">{f.pausada || ""}</td><td>{f.elecciones.map((r) => `${etiqueta(r.codigo)} (${r.de}, ${numero(r.segundos)} s)`).join(" → ") || "—"}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <p className="nota">Todavía ninguna.</p>}
      </Seccion>

      <Seccion titulo="Juegos cortos">
        {juegos.length ? (
          <table>
            <thead><tr><th>Juego</th><th>Cómo terminó</th><th className="num">Segundos</th><th>Qué eligió</th><th>Avance</th></tr></thead>
            <tbody>
              {juegos.map((j, i) => <tr key={i}><td>{legible(j.minijuego)}</td><td>{legible(j.resultado)}</td><td className="num">{numero(j.segundos)}</td><td>{j.codigo ? etiqueta(j.codigo) : "—"}</td><td>{avanceMinijuego(j.progreso ?? null)}</td></tr>)}
            </tbody>
          </table>
        ) : <p className="nota">Todavía ninguno.</p>}
      </Seccion>

      <Seccion titulo="Por dónde anduvo">
        <table>
          <thead><tr><th>Lugar</th><th className="num">Minutos</th><th className="num">Veces que llegó</th><th>Tocó</th><th>No tocó</th></tr></thead>
          <tbody>{explora.map((l) => <tr key={l.lugar}><td>{legible(l.lugar)}</td><td className="num">{numero(l.minutos)}</td><td className="num">{l.visitas}</td><td>{l.tocados.map((t) => legible(t)).join(", ") || "—"}</td><td>{l.noTocados.map((t) => legible(t)).join(", ") || "—"}</td></tr>)}</tbody>
        </table>
      </Seccion>

      <Plegable titulo="Detalles técnicos">
        <Cifras
          filas={[
            { valor: cal.pausas, texto: `pausas largas (${numero(cal.minutosEnPausa)} min)` },
            { valor: cal.voz, texto: "veces que pidió la voz" },
            { valor: cal.sinEfecto, texto: "toques que no hicieron nada" },
            { valor: cal.errores, texto: "errores del juego" },
          ]}
        />
        <p>Navegador y sistema: {res.aparato}</p>
        <p>Recorrido por pantallas: {recorrido.map((p) => lugar(p.pantalla)).join(" → ") || "—"}</p>
      </Plegable>

      <Seccion titulo="Descargar">
        <Descargas base={`matices-${nino}`} eventos={evs} />
      </Seccion>
    </>
  );
}

// The final image, and the strokes replayed with their own timing, four times faster.
function DibujoVisto({ d }: { d: Evento }) {
  const hoja = useRef<HTMLCanvasElement>(null);
  const [repitiendo, setRepitiendo] = useState(false);
  const trazos = d.trazos as Trazo[];
  const repetir = () => {
    setRepitiendo(true);
    requestAnimationFrame(() => {
      const c = hoja.current!;
      c.width = HOJA.ancho;
      c.height = HOJA.alto;
      const fin = Math.max(0, ...trazos.flatMap((t) => t.puntos.map((p) => p[2])));
      const t0 = performance.now();
      const paso = () => {
        const t = (performance.now() - t0) * 4;
        pintarHoja(c.getContext("2d")!, trazos, t);
        if (t < fin) requestAnimationFrame(paso);
      };
      paso();
    });
  };
  const origen = "Dibujo libre";
  return (
    <figure>
      {repitiendo ? <canvas ref={hoja} /> : <img src={d.imagen} alt={origen} />}
      <figcaption>{origen} · {Math.round(d.ms / 1000)} s · deshizo {d.deshechos} {d.deshechos === 1 ? "vez" : "veces"}</figcaption>
      <button className="boton secundario" onClick={repetir}>Ver cómo lo dibujó</button>
    </figure>
  );
}
