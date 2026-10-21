import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as PE } from "react";
import contenido from "virtual:contenido";
import { Hoja, Cara, Personaje } from "../lienzo/Personaje";
import { precargar, idsDe, cuantos } from "../lienzo/arte";
import { Bocina } from "../ui/Bocina";
import { Icono } from "../ui/iconos";
import { estado, cambiarEstado, type FiguraPuesta } from "../datos/guardado";
import { nuevaInstancia, nombreDe, codigoDe, tipoDe, etiquetaDe } from "../datos/casa";
import { registrar } from "../datos/eventos";
import "./casa.css";

const T = contenido.textos.casa;
const TILE = 32;
const ARRASTRE = 8; // pixels a finger moves before a tap becomes a drag

type Cuarto = { nombre: string; x: number; y: number; w: number; h: number };
type Mapa = { ancho: number; alto: number; cuartos: Cuarto[] };
type Quien = string | "prota";
type Arrastre = { que: { figura: string } | { inst: Quien }; x: number; y: number; movio: boolean };

async function leerMapa(): Promise<Mapa> {
  const m = await (await fetch("mapas/casa.json")).json();
  const capa = m.layers.find((l: { name: string }) => l.name === "cuartos");
  return {
    ancho: m.width * m.tilewidth,
    alto: m.height * m.tileheight,
    cuartos: capa.objects.map((o: { name: string; x: number; y: number; width: number; height: number }) => ({ nombre: o.name, x: o.x, y: o.y, w: o.width, h: o.height })),
  };
}

// Building the house (GDD §7): the child drags people from the shelf into the rooms, or taps a
// person and then a room. The house is drawn as large as the screen height allows and scrolls
// sideways when it does not fit.
export function ArmarCasa({ alTerminar }: { alTerminar: () => void }) {
  const [mapa, setMapa] = useState<Mapa | null>(null);
  const [listo, setListo] = useState(false);
  const [casa, setCasa] = useState<FiguraPuesta[]>(() => structuredClone(estado().casa));
  const [prota, setProta] = useState(estado().protaCasa);
  const [elegida, setElegida] = useState<{ figura: string } | { inst: Quien } | null>(null);
  const [menu, setMenu] = useState<Quien | null>(null);
  const [renombrando, setRenombrando] = useState(false);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const [puntero, setPuntero] = useState<{ x: number; y: number } | null>(null); // where the person chosen with a tap is
  const [escala, setEscala] = useState(0.6);
  const [cam, setCam] = useState({ x: 0, y: 0 }); // where the house sits inside the view, in screen pixels
  const escalaRef = useRef(escala); // the current zoom, for the resize handler
  escalaRef.current = escala;
  const lienzo = useRef<HTMLDivElement>(null);
  const vista = useRef<HTMLDivElement>(null);
  const orden = useRef(estado().casa.length);
  const toques = useRef(0);
  const t0 = useRef(performance.now());

  useEffect(() => {
    void Promise.all([leerMapa(), precargar([...idsDe("figuras/"), ...idsDe("personaje/"), "lugares/casa/fondo"])]).then(([m]) => {
      setMapa(m);
      if (!estado().protaCasa) {
        const r = m.cuartos.find((c) => c.nombre === "recamara")!;
        setProta({ x: r.x + r.w / 2, y: r.y + r.h / 2 + TILE });
      }
      setListo(true);
    });
  }, []);

  // ---- Looking around the house: drag the floor to move, pinch, wheel or +/- to zoom.
  const vistaMide = () => ({ w: vista.current?.clientWidth ?? 1, h: vista.current?.clientHeight ?? 1 });
  const todaLaCasa = () => (mapa ? Math.min(vistaMide().w / mapa.ancho, vistaMide().h / mapa.alto) : 1);
  const MAX_ZOOM = 2.5;

  // Keeps the house in view: centered on an axis where it fits, edge to edge where it does not.
  const acomodar = (x: number, y: number, z: number) => {
    const { w, h } = vistaMide();
    const cw = (mapa?.ancho ?? 0) * z;
    const ch = (mapa?.alto ?? 0) * z;
    const eje = (v: number, vista: number, casa: number) => (casa <= vista ? (vista - casa) / 2 : Math.min(0, Math.max(vista - casa, v)));
    return { x: eje(x, w, cw), y: eje(y, h, ch) };
  };

  // Zoom keeping the point under the finger (fx, fy, inside the view) where it is.
  const zoomEn = (z: number, fx: number, fy: number, desde = { s: escala, cam }) => {
    const nueva = Math.min(MAX_ZOOM, Math.max(todaLaCasa(), z));
    const k = nueva / desde.s;
    setEscala(nueva);
    setCam(acomodar(fx - (fx - desde.cam.x) * k, fy - (fy - desde.cam.y) * k, nueva));
  };

  const verToda = () => {
    const z = todaLaCasa();
    setEscala(z);
    setCam(acomodar(0, 0, z));
  };

  // First view: the whole house, centered, so the child sees all of it before zooming in (GDD §7).
  useLayoutEffect(() => {
    if (!mapa) return;
    verToda();
    // When the window changes size, the house stays inside the view at its current zoom.
    const o = new ResizeObserver(() => setCam((c) => acomodar(c.x, c.y, escalaRef.current)));
    o.observe(vista.current!);
    return () => o.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapa]);

  const dedos = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef<{ x: number; y: number; cam: { x: number; y: number }; s: number; dist: number; movio: boolean } | null>(null);

  const bajar = (e: PE) => {
    if ((e.target as HTMLElement).closest(".puesta")) return;
    // Keep receiving this finger even if it leaves the view; not every pointer can be captured.
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* the gesture still works while the finger stays inside */
    }
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const ps = [...dedos.current.values()];
    const medio = ps.length === 2 ? { x: (ps[0].x + ps[1].x) / 2, y: (ps[0].y + ps[1].y) / 2 } : ps[0];
    gesto.current = { ...medio, cam, s: escala, dist: ps.length === 2 ? Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) : 0, movio: gesto.current?.movio ?? false };
  };

  const moverDedo = (e: PE) => {
    const g = gesto.current;
    if (!g || !dedos.current.has(e.pointerId)) return;
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const ps = [...dedos.current.values()];
    const r = vista.current!.getBoundingClientRect();
    if (ps.length === 2) {
      g.movio = true;
      const medio = { x: (ps[0].x + ps[1].x) / 2, y: (ps[0].y + ps[1].y) / 2 };
      const dist = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
      zoomEn((g.s * dist) / g.dist, medio.x - r.left, medio.y - r.top, { s: g.s, cam: { x: g.cam.x + (medio.x - g.x), y: g.cam.y + (medio.y - g.y) } });
      return;
    }
    if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > ARRASTRE) g.movio = true;
    if (g.movio) setCam(acomodar(g.cam.x + e.clientX - g.x, g.cam.y + e.clientY - g.y, escala));
  };

  const subirDedo = (e: PE) => {
    const g = gesto.current;
    const eraUno = dedos.current.size === 1;
    dedos.current.delete(e.pointerId);
    if (!dedos.current.size) {
      gesto.current = null;
      if (g && !g.movio && eraUno) tocarCasa(e);
    } else {
      // From two fingers back to one: keep moving from where things are now.
      const [p] = [...dedos.current.values()];
      gesto.current = { x: p.x, y: p.y, cam, s: escala, dist: 0, movio: true };
    }
  };

  const rueda = (e: React.WheelEvent) => {
    const r = vista.current!.getBoundingClientRect();
    zoomEn(escala * Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  };

  const guardar = (c: FiguraPuesta[], p = prota) => cambiarEstado({ casa: structuredClone(c), protaCasa: p }, true);
  const cuartoEn = (x: number, y: number) => mapa?.cuartos.find((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
  const distancia = (x: number, y: number) => (prota ? Math.round(Math.hypot(x - prota.x, y - prota.y) / TILE) : null);
  const evento = (accion: string, f: FiguraPuesta, extra: Record<string, unknown> = {}) =>
    registrar("casa_figura", { accion, figura: codigoDe(f), clase: tipoDe(f.figura), cuarto: f.cuarto, distancia: distancia(f.x, f.y), orden: ++orden.current, ...extra });

  // Screen point → house point.
  const enCasa = (cx: number, cy: number) => {
    const r = lienzo.current!.getBoundingClientRect();
    return { x: (cx - r.left) / escala, y: (cy - r.top) / escala };
  };

  // Puts someone (new from the shelf, an existing figure, or the child) where the finger is.
  const poner = (que: { figura: string } | { inst: Quien }, cx: number, cy: number) => {
    const p = enCasa(cx, cy);
    const c = cuartoEn(p.x, p.y);
    if (!c) return false;
    toques.current++;
    const x = Math.min(Math.max(p.x, c.x + 14), c.x + c.w - 14);
    const y = Math.min(Math.max(p.y + 20, c.y + 44), c.y + c.h - 2); // feet a little below the finger
    if ("figura" in que) {
      const f: FiguraPuesta = { inst: nuevaInstancia(que.figura, casa), figura: que.figura, cuarto: c.nombre, x, y, nombre: null, piel: 0 };
      const nueva = [...casa, f];
      setCasa(nueva);
      guardar(nueva);
      evento("poner", f);
    } else if (que.inst === "prota") {
      setProta({ x, y });
      guardar(casa, { x, y });
      registrar("casa_figura", { accion: "mover", figura: "PROTAGONISTA", cuarto: c.nombre, orden: ++orden.current });
    } else {
      const nueva = casa.map((f) => (f.inst === (que as { inst: string }).inst ? { ...f, x, y, cuarto: c.nombre } : f));
      setCasa(nueva);
      guardar(nueva);
      evento("mover", nueva.find((f) => f.inst === (que as { inst: string }).inst)!);
    }
    setElegida(null);
    setPuntero(null);
    return true;
  };

  // One handler for shelf cards and placed figures: a short tap selects (or opens the menu),
  // a drag carries the person to wherever the finger is lifted.
  const empezar = (que: { figura: string } | { inst: Quien }) => (e: PE) => {
    e.preventDefault();
    const x0 = e.clientX;
    const y0 = e.clientY;
    let a: Arrastre = { que, x: x0, y: y0, movio: false };
    setArrastre(a);
    const mover = (ev: PointerEvent) => {
      a = { ...a, x: ev.clientX, y: ev.clientY, movio: a.movio || Math.hypot(ev.clientX - x0, ev.clientY - y0) > ARRASTRE };
      setArrastre(a);
    };
    const soltar = (ev: PointerEvent) => {
      removeEventListener("pointermove", mover);
      removeEventListener("pointerup", soltar, true);
      setArrastre(null);
      if (a.movio) return void poner(que, ev.clientX, ev.clientY);
      toques.current++;
      if ("figura" in que) {
        setMenu(null);
        setElegida(que);
        if (ev.pointerType === "mouse") setPuntero({ x: ev.clientX, y: ev.clientY });
      } else {
        setMenu(que.inst);
        // The menu opens under the finger; the click that follows the tap must not press its first button.
        addEventListener("click", (c) => c.stopPropagation(), { capture: true, once: true });
      }
    };
    addEventListener("pointermove", mover);
    // Capture: a placed person stops the event from bubbling, so the release is heard before that.
    addEventListener("pointerup", soltar, true);
  };

  const tocarCasa = (e: PE) => {
    if (elegida && poner(elegida, e.clientX, e.clientY)) return;
    setMenu(null);
  };

  // A person chosen with a tap follows the mouse until the next tap on a room. A finger leaves no
  // trail, so on touch screens the chosen card and the glowing rooms say what comes next.
  useEffect(() => {
    if (!elegida) return;
    const seguir = (ev: PointerEvent) => ev.pointerType === "mouse" && setPuntero({ x: ev.clientX, y: ev.clientY });
    addEventListener("pointermove", seguir);
    return () => removeEventListener("pointermove", seguir);
  }, [elegida]);

  const cambiarPiel = (inst: string) => {
    const nueva = casa.map((f) => (f.inst === inst ? { ...f, piel: (f.piel + 1) % cuantos("piel") } : f));
    setCasa(nueva);
    guardar(nueva);
    const f = nueva.find((x) => x.inst === inst)!;
    evento("piel", f, { tono: f.piel + 1 });
  };

  const quitar = (inst: string) => {
    const f = casa.find((x) => x.inst === inst)!;
    const nueva = casa.filter((x) => x.inst !== inst);
    setCasa(nueva);
    guardar(nueva);
    evento("quitar", f);
    setMenu(null);
  };

  const renombrar = (inst: string, nombre: string) => {
    const limpio = nombre.replace(/[^\p{L}\p{N} ]/gu, "").trim();
    const f = casa.find((x) => x.inst === inst)!;
    setRenombrando(false);
    if (!limpio || limpio === f.nombre) return;
    const nueva = casa.map((x) => (x.inst === inst ? { ...x, nombre: limpio } : x));
    setCasa(nueva);
    guardar(nueva);
    evento("renombrar", nueva.find((x) => x.inst === inst)!);
  };

  const terminar = () => {
    registrar("casa_lista", {
      figuras: casa.map((f) => ({ figura: codigoDe(f), clase: tipoDe(f.figura), cuarto: f.cuarto, distancia: distancia(f.x, f.y), renombrada: f.nombre !== null, tono: f.piel + 1 })),
      prota_cuarto: prota ? (cuartoEn(prota.x, prota.y)?.nombre ?? null) : null,
      toques: toques.current,
      ms: Math.round(performance.now() - t0.current),
    });
    cambiarEstado({ casa, protaCasa: prota, casaLista: true }, true);
    alTerminar();
  };

  const nombreElegida = elegida && "figura" in elegida ? contenido.figuras.find((f) => f.id === elegida.figura)!.nombre : null;
  const enMenu = menu && menu !== "prota" ? casa.find((f) => f.inst === menu) : null;
  const s = escala;
  // The person on the cursor: the one being dragged, or the one chosen with a tap until the next tap on a room.
  const llevaFigura = arrastre?.movio && "figura" in arrastre.que ? { figura: arrastre.que.figura, x: arrastre.x, y: arrastre.y } : elegida && "figura" in elegida && puntero ? { figura: elegida.figura, x: puntero.x, y: puntero.y } : null;

  return (
    <main className="pantalla armar-casa">
      <div className="vista">
        <div className="aviso">
          <span>{nombreElegida ? T.elegida.replace("{figura}", nombreElegida) : T.inicio}</span>
          <Bocina clave="casa.instruccion" texto={nombreElegida ? T.elegida.replace("{figura}", nombreElegida) : `${T.inicio} ${T.instruccion}`} />
        </div>
        {listo && mapa && (
          <>
            <div className="controles">
              <button className="boton redondo" aria-label="Acercar" onClick={() => zoomEn(escala * 1.4, vistaMide().w / 2, vistaMide().h / 2)}>
                {Icono.mas}
              </button>
              <button className="boton redondo" aria-label="Alejar" onClick={() => zoomEn(escala / 1.4, vistaMide().w / 2, vistaMide().h / 2)}>
                {Icono.menos}
              </button>
              <button className="boton redondo" aria-label="Ver toda la casa" onClick={verToda}>
                {Icono.encuadrar}
              </button>
            </div>
            <div className="desliza" data-toque ref={vista} onPointerDown={bajar} onPointerMove={moverDedo} onPointerUp={subirDedo} onPointerCancel={subirDedo} onWheel={rueda}>
              <div className={`casa${elegida ? " eligiendo" : ""}`} ref={lienzo} style={{ width: mapa.ancho * s, height: mapa.alto * s, transform: `translate(${cam.x}px, ${cam.y}px)` }}>
                <img className="pixel" src="assets/lugares/casa/fondo.png" alt="" draggable={false} style={{ width: mapa.ancho * s, height: mapa.alto * s }} />
                {mapa.cuartos.map((c) => (
                  <div key={c.nombre} className="cuarto" style={{ left: c.x * s, top: c.y * s, width: c.w * s, height: c.h * s }}>
                    <span>{T.cuartos[c.nombre].replace(/^(el|la) /, "")}</span>
                  </div>
                ))}
                {[...casa, ...(prota ? [{ inst: "prota" as const, ...prota }] : [])]
                  .sort((a, b) => a.y - b.y)
                  .map((f) => {
                    // A placed person being dragged follows the finger.
                    const llevando = arrastre?.movio && "inst" in arrastre.que && arrastre.que.inst === f.inst;
                    const p = llevando ? enCasa(arrastre.x, arrastre.y + 20) : f;
                    return (
                    <div
                      key={f.inst}
                      data-toque
                      className={`puesta${menu === f.inst ? " abierta" : ""}${llevando ? " llevando" : ""}`}
                      style={{ left: p.x * s, top: p.y * s }}
                      onPointerDown={empezar({ inst: f.inst })}
                      onPointerUp={(e) => e.stopPropagation()}
                    >
                      {f.inst === "prota" ? <Personaje a={estado().apariencia} escala={s} /> : <Hoja id={`figuras/${(f as FiguraPuesta).figura}`} piel={(f as FiguraPuesta).piel} escala={s} />}
                      <span className="placa">{f.inst === "prota" ? estado().nombre : etiquetaDe(f as FiguraPuesta)}</span>
                    </div>
                    );
                  })}
              </div>
            </div>
          </>
        )}

        {menu && (
          <div className="menu panel" data-toque onPointerUp={(e) => e.stopPropagation()}>
            <strong>{enMenu ? nombreDe(enMenu) : estado().nombre}</strong>
            {renombrando && enMenu ? (
              <input className="campo" autoFocus maxLength={16} defaultValue={enMenu.nombre ?? ""} placeholder={nombreDe(enMenu)} onBlur={(e) => renombrar(enMenu.inst, e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
            ) : (
              <div className="acciones-menu">
                {enMenu && (
                  <>
                    <button className="boton" onClick={() => setRenombrando(true)}>
                      {Icono.lapiz}
                      {T.renombrar}
                    </button>
                    {tipoDe(enMenu.figura) !== "mascota" && (
                      <button className="boton" onClick={() => cambiarPiel(enMenu.inst)}>
                        {Icono.piel}
                        {T.piel}
                      </button>
                    )}
                    <button className="boton" onClick={() => quitar(enMenu.inst)}>
                      {Icono.quitar}
                      {T.quitar}
                    </button>
                  </>
                )}
                <button className="boton secundario" onClick={() => setMenu(null)}>
                  {T.cerrar}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <section className="repisa panel">
        <div className="figuras">
          {listo &&
            contenido.figuras.map((f) => (
              <button key={f.id} className="opcion figura" aria-pressed={!!elegida && "figura" in elegida && elegida.figura === f.id} aria-label={f.nombre} onPointerDown={empezar({ figura: f.id })}>
                <Cara id={`figuras/${f.id}`} tam={52} />
                <span className="pie">{f.nombre}</span>
              </button>
            ))}
        </div>
        <footer className="pie-repisa">
          <button className="boton principal" onClick={terminar}>
            {Icono.listo}
            {T.listo}
          </button>
        </footer>
      </section>

      {llevaFigura && (
        <div className="fantasma" style={{ left: llevaFigura.x, top: llevaFigura.y }}>
          <Hoja id={`figuras/${llevaFigura.figura}`} escala={Math.max(1, s * 1.2)} />
        </div>
      )}
    </main>
  );
}
