// The general view: who is there, what they chose by area, how far they got, and the numbers for all of them.
import { useMemo } from "react";
import * as K from "./calculos";
import type { Evento } from "./calculos";
import { CONTENIDO, etiqueta, fecha, lugar, numero } from "./palabras";
import { Barras, Cifras, Descargas, Plegable, Progreso, Rostro, Seccion } from "./piezas";

export function Todos({ eventos }: { eventos: Evento[] }) {
  const g = useMemo(() => K.porParticipante(eventos), [eventos]);
  // Who asked to talk comes first, then the most recent.
  const resumenes = useMemo(() => [...g].map(([n, evs]) => K.resumen(n, evs)).sort((a, b) => b.quiereHablar - a.quiereHablar || (b.ultima ?? 0) - (a.ultima ?? 0)), [g]);
  const aspecto = useMemo(() => new Map([...g].map(([n, evs]) => [n, K.aparienciaDe(evs)] as const)), [g]);
  const uso = useMemo(() => K.usoPorPantalla(g), [g]);
  const errores = useMemo(() => K.errores(g), [g]);
  const fps = useMemo(() => K.fpsPorAparato(g), [g]);
  const areas = useMemo(() => {
    const total = new Map<string, Map<string, number>>();
    for (const evs of g.values())
      for (const [area, codigos] of K.codigosPorArea(evs, CONTENIDO))
        for (const [codigo, f] of codigos) {
          const m = total.get(area) ?? (total.set(area, new Map()), total.get(area)!);
          m.set(codigo, (m.get(codigo) ?? 0) + f.n);
        }
    return total;
  }, [g]);
  const quieren = resumenes.filter((r) => r.quiereHablar);
  const dondeSeQuedaron = [...resumenes.reduce((m, r) => m.set(r.ultimaPantalla, (m.get(r.ultimaPantalla) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  const ir = (n: string) => (location.hash = `#p/${encodeURIComponent(n)}`);

  if (!resumenes.length) return <section><p>Todavía no llega ninguna partida. Juega en el juego y vuelve a cargar.</p></section>;
  return (
    <>
      <Seccion titulo="Participantes" nota="Primero, quienes pidieron hablar con alguien. Toca una fila para ver su perfil.">
        <table>
          <thead>
            <tr><th>Participante</th><th>Pidió hablar</th><th>Dispositivo</th><th>Progreso</th><th className="num ancho-amplio">Minutos</th><th className="num ancho-amplio">Decisiones</th><th className="ancho-amplio">Última vez</th></tr>
          </thead>
          <tbody>
            {resumenes.map((r) => (
              <tr key={r.nino} className={r.quiereHablar ? "fila-clic fila-aviso" : "fila-clic"} onClick={() => ir(r.nino)}>
                <td><div className="quien"><Rostro a={aspecto.get(r.nino) ?? null} /><a href={`#p/${encodeURIComponent(r.nino)}`}><code>{r.nino}</code></a></div></td>
                <td>{r.quiereHablar ? <span className="pastilla pastilla-aviso">{r.quiereHablar} {r.quiereHablar === 1 ? "vez" : "veces"}</span> : "—"}</td>
                <td><span className="pastilla">{r.dispositivo}</span></td>
                <td><Progreso dia={r.dia} termino={r.termino} /></td>
                <td className="num ancho-amplio">{r.minutos}</td>
                <td className="num ancho-amplio">{r.respuestas}</td>
                <td className="ancho-amplio">{fecha(r.ultima)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Seccion>

      <Seccion titulo="Lo que eligieron, por área" nota="Cuántas veces eligieron cada opción en las situaciones de cada área, entre todas las personas.">
        <div className="areas">
          {CONTENIDO.areas.filter((a) => areas.has(a.id)).map((a) => (
            <div key={a.id} className="area">
              <h3>{a.nombre}</h3>
              <Barras filas={[...areas.get(a.id)!].sort((x, y) => y[1] - x[1]).map(([codigo, n]) => ({ nombre: etiqueta(codigo), valor: n }))} />
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Hasta dónde llegaron">
        <Barras filas={K.avance(g).map((p) => ({ nombre: p.nombre, valor: p.n, texto: `${p.n} de ${p.de}` }))} />
      </Seccion>

      <Seccion titulo="Dónde se quedaron" nota="La última pantalla en la que estuvo cada persona.">
        <Barras filas={dondeSeQuedaron.map(([pantalla, valor]) => ({ nombre: lugar(pantalla), valor }))} />
      </Seccion>

      <Seccion titulo="En números">
        <Cifras
          filas={[
            { valor: resumenes.length, texto: "personas que jugaron" },
            { valor: quieren.length, texto: "pidieron hablar con alguien" },
            { valor: resumenes.filter((r) => r.termino).length, texto: "terminaron los 3 días" },
            { valor: numero(K.mediana(resumenes.map((r) => r.minutos))), texto: "minutos jugados, lo típico" },
            { valor: resumenes.reduce((a, r) => a + r.respuestas, 0), texto: "decisiones en las situaciones" },
          ]}
        />
      </Seccion>

      <Seccion titulo="Descargar todo">
        <Descargas base="matices-todos" eventos={eventos} />
      </Seccion>

      <Plegable titulo="Detalles técnicos">
        <h3>Uso por pantalla</h3>
        <p className="nota">Primero las pantallas con toques que no hicieron nada o pausas de 30 segundos o más.</p>
        <table>
          <thead><tr><th>Pantalla</th><th className="num">Segundos, lo típico</th><th className="num">Toques que no hicieron nada</th><th className="num">Pausas largas</th><th className="num">Pidió la voz</th></tr></thead>
          <tbody>{uso.map((u) => <tr key={u.pantalla}><td>{lugar(u.pantalla)}</td><td className="num">{u.segundos}</td><td className="num">{u.sinEfecto}</td><td className="num">{u.pausas}</td><td className="num">{u.voz}</td></tr>)}</tbody>
        </table>
        <h3>Errores del juego</h3>
        {errores.length ? (
          <table>
            <thead><tr><th>Mensaje</th><th className="num">Veces</th><th className="num">Participantes</th><th>Aparatos</th></tr></thead>
            <tbody>{errores.map((e) => <tr key={e.mensaje}><td>{e.mensaje}</td><td className="num">{e.n}</td><td className="num">{e.participantes}</td><td>{e.aparatos}</td></tr>)}</tbody>
          </table>
        ) : <p className="nota">Ninguno.</p>}
        <h3>Cuadros por segundo, por aparato</h3>
        <table>
          <thead><tr><th>Aparato</th><th className="num">Cuadros por segundo, lo típico</th><th className="num">Medidas</th></tr></thead>
          <tbody>{fps.map((f) => <tr key={f.aparato}><td>{f.aparato}</td><td className="num">{f.fps}</td><td className="num">{f.medidas}</td></tr>)}</tbody>
        </table>
      </Plegable>
    </>
  );
}
