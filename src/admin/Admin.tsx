// The dashboard: one admin account sees every participant and all of them together.
import { useEffect, useMemo, useRef, useState } from "react";
import contenido from "virtual:contenido";
import { Personaje } from "../lienzo/Personaje";
import { pintarHoja, HOJA, type Trazo } from "../pantallas/Dibujo";
import * as K from "./calculos";
import type { Evento } from "./calculos";

const C: K.Contenido = { escenas: contenido.escenas, areas: contenido.areas, objetos: contenido.objetos };
const nombreArea = new Map(contenido.areas.map((a) => [a.id, a.nombre]));
const nombreDe = new Map(contenido.escenas.map((x) => [x.id, x.nombre]));
const figuraDe = new Map(contenido.figuras.map((f) => [f.id, f.nombre]));

// FIGURA:tia#2 → "Tía (2)"; other codes stay as written in contenido/codigos.md.
function etiqueta(codigo: string) {
  const [tipo, resto] = codigo.split(":");
  if (tipo === "FIGURA" && resto) {
    const [id, n] = resto.split("#");
    return `${figuraDe.get(id) ?? id}${n ? ` (${n})` : ""}`;
  }
  return resto ?? codigo;
}
const fecha = (ms: number | null | undefined) => (ms ? new Date(ms).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "—");
const escena = (id: string) => `${id} ${nombreDe.get(id) ?? ""}`.trim();

function descargar(nombre: string, texto: string, tipo: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([texto], { type: tipo }));
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function pedir(url: string): Promise<Evento[] | "fuera"> {
  const r = await fetch(url);
  if (r.status === 401) return "fuera";
  if (!r.ok) throw new Error(`El servidor respondió ${r.status}`);
  return r.json();
}

export function Admin() {
  const [eventos, setEventos] = useState<Evento[] | "fuera" | null>(null);
  const [error, setError] = useState("");
  const [ruta, setRuta] = useState(location.hash);
  const cargar = () => pedir("api/admin/eventos").then(setEventos, (e) => setError(String(e)));

  useEffect(() => {
    void cargar();
    const alCambiar = () => setRuta(location.hash);
    addEventListener("hashchange", alCambiar);
    return () => removeEventListener("hashchange", alCambiar);
  }, []);

  if (error) return <p className="tab">{error}</p>;
  if (eventos === null) return <p className="tab">Cargando…</p>;
  if (eventos === "fuera") return <Entrada alEntrar={cargar} />;

  const salir = async () => {
    await fetch("api/salir", { method: "POST" });
    setEventos("fuera");
  };
  const nino = ruta.startsWith("#p/") ? decodeURIComponent(ruta.slice(3)) : null;
  return (
    <div className="tab">
      <header className="tab-cabeza">
        <h1>{nino ? <>Participante <code>{nino}</code></> : "Matices · Todos los participantes"}</h1>
        {nino && <a className="boton secundario" href="#">Todos</a>}
        <button className="boton secundario" onClick={() => void cargar()}>Actualizar</button>
        <button className="boton secundario" onClick={() => void salir()}>Salir</button>
      </header>
      {nino ? <Perfil nino={nino} todos={eventos} /> : <Todos eventos={eventos} />}
    </div>
  );
}

function Entrada({ alEntrar }: { alEntrar: () => void }) {
  const [clave, setClave] = useState("");
  const [mal, setMal] = useState(false);
  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("api/entrar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clave }) });
    if (r.ok) alEntrar();
    else setMal(true);
  };
  return (
    <form className="entrada" onSubmit={(e) => void entrar(e)}>
      <h1>Matices · Tablero</h1>
      <input type="password" autoFocus placeholder="Clave de admin" value={clave} onChange={(e) => setClave(e.target.value)} />
      {mal && <p className="nota">Esa clave no es.</p>}
      <button className="boton principal">Entrar</button>
    </form>
  );
}

function Barras({ filas }: { filas: { nombre: string; valor: number; texto?: string }[] }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <div className="barras">
      {filas.map((f) => (
        <div key={f.nombre} style={{ display: "contents" }} title={`${f.nombre}: ${f.texto ?? f.valor}`}>
          <span>{f.nombre}</span>
          <div className="barra" style={{ "--v": f.valor / max } as React.CSSProperties} />
          <span className="num">{f.texto ?? f.valor}</span>
        </div>
      ))}
    </div>
  );
}

function Todos({ eventos }: { eventos: Evento[] }) {
  const g = useMemo(() => K.porParticipante(eventos), [eventos]);
  const resumenes = useMemo(() => [...g].map(([n, evs]) => K.resumen(n, evs)).sort((a, b) => (b.ultima ?? 0) - (a.ultima ?? 0)), [g]);
  const uso = useMemo(() => K.usoPorPantalla(g), [g]);
  const errores = useMemo(() => K.errores(g), [g]);
  const fps = useMemo(() => K.fpsPorAparato(g), [g]);
  const areas = useMemo(() => {
    const total = new Map<string, Map<string, number>>();
    for (const evs of g.values())
      for (const [area, codigos] of K.codigosPorArea(evs, C))
        for (const [codigo, f] of codigos) {
          const m = total.get(area) ?? (total.set(area, new Map()), total.get(area)!);
          m.set(codigo, (m.get(codigo) ?? 0) + f.n);
        }
    return total;
  }, [g]);
  const quieren = resumenes.filter((r) => r.quiereHablar);
  const ir = (n: string) => (location.hash = `#p/${encodeURIComponent(n)}`);

  if (!resumenes.length) return <section><p>Todavía no llega ninguna partida. Juega en el juego y vuelve a cargar.</p></section>;
  return (
    <>
      {quieren.length > 0 && (
        <section className="alerta">
          <h2>Quiero hablar con alguien</h2>
          {quieren.map((r) => (
            <p key={r.nino}>
              <a href={`#p/${encodeURIComponent(r.nino)}`}><code>{r.nino}</code></a>: {r.quiereHablar} {r.quiereHablar === 1 ? "vez" : "veces"}
            </p>
          ))}
        </section>
      )}
      <section>
        <div className="cifras">
          <div className="cifra"><strong>{resumenes.length}</strong><span>participantes</span></div>
          <div className="cifra"><strong>{resumenes.filter((r) => r.termino).length}</strong><span>terminaron los 3 días</span></div>
          <div className="cifra"><strong>{K.mediana(resumenes.map((r) => r.minutos))}</strong><span>minutos jugados (del medio)</span></div>
          <div className="cifra"><strong>{resumenes.reduce((a, r) => a + r.respuestas, 0)}</strong><span>elecciones en escenas</span></div>
          <div className="cifra"><strong>{resumenes.reduce((a, r) => a + r.errores, 0)}</strong><span>errores</span></div>
        </div>
      </section>

      <section>
        <h2>Participantes</h2>
        <p className="nota">Toca una fila para ver su perfil.</p>
        <table>
          <thead>
            <tr><th>Código</th><th>Primera vez</th><th>Última vez</th><th className="num">Sesiones</th><th className="num">Min</th><th className="num">Día</th><th className="num">Respuestas</th><th className="num">Quiero hablar</th><th>Aparato</th><th className="num">Errores</th><th>Se quedó en</th></tr>
          </thead>
          <tbody>
            {resumenes.map((r) => (
              <tr key={r.nino} className="fila-clic" onClick={() => ir(r.nino)}>
                <td><code>{r.nino}</code></td><td>{fecha(r.primera)}</td><td>{fecha(r.ultima)}</td><td className="num">{r.sesiones}</td><td className="num">{r.minutos}</td>
                <td className="num">{r.termino ? "fin" : r.dia || "—"}</td><td className="num">{r.respuestas}</td><td className="num">{r.quiereHablar || ""}</td>
                <td>{r.aparato}</td><td className="num">{r.errores || ""}</td><td>{r.ultimaPantalla}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Hasta dónde llegan</h2>
        <Barras filas={K.avance(g).map((p) => ({ nombre: p.nombre, valor: p.n, texto: `${p.n} de ${p.de}` }))} />
      </section>

      <section>
        <h2>Dónde se quedan</h2>
        <p className="nota">La última pantalla de cada participante.</p>
        <Barras filas={[...resumenes.reduce((m, r) => m.set(r.ultimaPantalla, (m.get(r.ultimaPantalla) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]).map(([nombre, valor]) => ({ nombre, valor }))} />
      </section>

      <section>
        <h2>Uso por pantalla</h2>
        <p className="nota">Primero las pantallas con más señales de problema: toques que no hicieron nada y pausas de 30 s o más.</p>
        <table>
          <thead><tr><th>Pantalla</th><th className="num">Segundos (del medio)</th><th className="num">Toques sin efecto</th><th className="num">Pausas largas</th><th className="num">Voz pedida</th></tr></thead>
          <tbody>{uso.map((u) => <tr key={u.pantalla}><td>{u.pantalla}</td><td className="num">{u.segundos}</td><td className="num">{u.sinEfecto}</td><td className="num">{u.pausas}</td><td className="num">{u.voz}</td></tr>)}</tbody>
        </table>
      </section>

      <section>
        <h2>Errores</h2>
        {errores.length ? (
          <table>
            <thead><tr><th>Mensaje</th><th className="num">Veces</th><th className="num">Participantes</th><th>Aparatos</th></tr></thead>
            <tbody>{errores.map((e) => <tr key={e.mensaje}><td>{e.mensaje}</td><td className="num">{e.n}</td><td className="num">{e.participantes}</td><td>{e.aparatos}</td></tr>)}</tbody>
          </table>
        ) : <p className="nota">Ninguno.</p>}
        <h2>Cuadros por segundo</h2>
        <table>
          <thead><tr><th>Aparato</th><th className="num">Cuadros por segundo (del medio)</th><th className="num">Medidas</th></tr></thead>
          <tbody>{fps.map((f) => <tr key={f.aparato}><td>{f.aparato}</td><td className="num">{f.fps}</td><td className="num">{f.medidas}</td></tr>)}</tbody>
        </table>
      </section>

      <section>
        <h2>Por área, entre todos</h2>
        <p className="nota">Cuántas veces se eligió cada código en las escenas de cada área.</p>
        <table>
          <thead><tr><th>Área</th><th>Códigos</th></tr></thead>
          <tbody>
            {contenido.areas.filter((a) => areas.has(a.id)).map((a) => (
              <tr key={a.id}><td>{a.nombre}</td><td>{[...areas.get(a.id)!].sort((x, y) => y[1] - x[1]).map(([c, n]) => `${etiqueta(c)}: ${n}`).join(" · ")}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Perfil({ nino, todos }: { nino: string; todos: Evento[] }) {
  const [evs, setEvs] = useState<Evento[] | null>(null);
  useEffect(() => {
    void pedir(`api/admin/eventos?nino=${encodeURIComponent(nino)}`).then((r) => setEvs(r === "fuera" ? [] : r));
  }, [nino]);
  const referencias = useMemo(() => [...K.porParticipante(todos).values()].map((e) => K.codigosPorArea(e, C)), [todos]);
  if (!evs) return <p>Cargando…</p>;
  if (!evs.length) return <section><p>Sin datos de este participante.</p></section>;

  const quiere = evs.filter((e) => e.tipo === "quiero_hablar");
  const cal = K.calidad(evs);
  const ap = K.aparienciaDe(evs);
  const areas = K.codigosPorArea(evs, C);
  const esc = K.escenas(evs);
  const juegos = K.minijuegos(evs);
  const dibujos = evs.filter((e) => e.tipo === "dibujo" && e.imagen);
  const explora = K.exploracion(evs, C);
  const recorrido = evs.filter((e) => e.tipo === "pantalla");

  return (
    <>
      {quiere.length > 0 && (
        <section className="alerta">
          <h2>Quiero hablar con alguien</h2>
          {quiere.map((q) => <p key={q.id}>{fecha(q.cuando)} · en {q.pantalla}</p>)}
        </section>
      )}

      <section>
        <h2>Calidad de los datos</h2>
        <div className="cifras">
          <div className="cifra"><strong>{cal.sesiones}</strong><span>sesiones</span></div>
          <div className="cifra"><strong>{cal.minutos}</strong><span>minutos jugados</span></div>
          <div className="cifra"><strong>{cal.pausas}</strong><span>pausas largas ({cal.minutosEnPausa} min)</span></div>
          <div className="cifra"><strong>{cal.voz}</strong><span>veces que pidió la voz</span></div>
          <div className="cifra"><strong>{cal.sinEfecto}</strong><span>toques sin efecto</span></div>
          <div className="cifra"><strong>{cal.errores}</strong><span>errores</span></div>
        </div>
      </section>

      <section>
        <h2>Su personaje</h2>
        {ap ? <Personaje a={ap} escala={4} /> : <p className="nota">No terminó su personaje.</p>}
      </section>

      <section>
        <h2>Por área</h2>
        <p className="nota">Como un examen de laboratorio, pero sin rangos inventados: la referencia es el mismo conteo entre todos los participantes que eligieron en una escena de esa área. Sin colores de alto o bajo hasta tener 120 o más niños por grupo de edad.</p>
        <table>
          <thead><tr><th>Área</th><th>Resultado</th><th>De dónde sale</th><th>Referencia de todos</th></tr></thead>
          <tbody>
            {contenido.areas.filter((a) => areas.has(a.id)).flatMap((a) =>
              [...areas.get(a.id)!].sort((x, y) => y[1].n - x[1].n).map(([codigo, f], i) => {
                const r = K.referencia(referencias, a.id, codigo);
                return (
                  <tr key={a.id + codigo}>
                    <td>{i === 0 ? nombreArea.get(a.id) : ""}</td>
                    <td>{etiqueta(codigo)}: {f.n}</td>
                    <td>{[...f.escenas].map(escena).join(", ")}</td>
                    <td>N = {r.N} · del medio {r.mediana} · de {r.min} a {r.max}</td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Escenas</h2>
        <p className="nota">Qué pasó en cada escena: cuántas veces empezó, si la saltó o la pausó, qué eligió y cuándo cerró el diálogo antes de responder o continuar.</p>
        {esc.size ? (
          <table>
            <thead><tr><th>Escena</th><th className="num">Veces</th><th className="num">Saltada</th><th className="num">Pausada</th><th>Cerró fuera</th><th>Elecciones</th></tr></thead>
            <tbody>
              {[...esc].map(([id, f]) => (
                <tr key={id}><td>{escena(id)}</td><td className="num">{f.veces}</td><td className="num">{f.saltada || ""}</td><td className="num">{f.pausada || ""}</td><td>{f.cierres.map((r) => `${r.accion === "evitar_respuesta" ? "sin responder" : "sin continuar"} (${r.formato}, paso ${r.paso}, ${r.segundos} s)`).join(" · ") || "—"}</td><td>{f.elecciones.map((r) => `${r.codigo} (${r.de}, ${r.segundos} s)`).join(" → ") || "—"}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <p className="nota">Todavía ninguna.</p>}

        <h2>Minijuegos</h2>
        {juegos.length ? (
          <table>
            <thead><tr><th>Minijuego</th><th>Resultado</th><th className="num">Segundos</th><th>Elección</th></tr></thead>
            <tbody>
              {juegos.map((j, i) => <tr key={i}><td>{j.minijuego}</td><td>{j.resultado}</td><td className="num">{j.segundos}</td><td>{j.codigo || "—"}</td></tr>)}
            </tbody>
          </table>
        ) : <p className="nota">Todavía ninguno.</p>}
      </section>

      {dibujos.length > 0 && (
        <section>
          <h2>Dibujos</h2>
          <div className="dibujos">{dibujos.map((d) => <DibujoVisto key={d.id} d={d} />)}</div>
        </section>
      )}

      <section>
        <h2>Exploración</h2>
        <table>
          <thead><tr><th>Lugar</th><th className="num">Minutos</th><th className="num">Visitas</th><th className="num">Segundos corriendo</th><th>Tocó</th><th>No tocó</th></tr></thead>
          <tbody>{explora.map((l) => <tr key={l.lugar}><td>{l.lugar}</td><td className="num">{l.minutos}</td><td className="num">{l.visitas}</td><td className="num">{l.segundosCorriendo}</td><td>{l.tocados.join(", ")}</td><td>{l.noTocados.join(", ")}</td></tr>)}</tbody>
        </table>
      </section>

      <section>
        <h2>Su recorrido</h2>
        <p>{recorrido.map((p) => p.pantalla).join(" → ")}</p>
        <p className="nota">Se quedó en {recorrido.at(-1)?.pantalla ?? "—"}.</p>
        <button className="boton secundario" onClick={() => descargar(`matices-${nino}.json`, JSON.stringify(evs, null, 1), "application/json")}>Descargar JSON</button>{" "}
        <button className="boton secundario" onClick={() => descargar(`matices-${nino}.csv`, K.csv(evs), "text/csv")}>Descargar CSV</button>
      </section>
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
      {repitiendo ? <canvas ref={hoja} /> : <img src={d.imagen} alt={`Dibujo de ${origen}`} />}
      <figcaption>{origen} · {trazos.length} trazos · deshizo {d.deshechos} · {Math.round(d.ms / 1000)} s</figcaption>
      <button className="boton secundario" onClick={repetir}>Ver cómo lo dibujó</button>
    </figure>
  );
}
