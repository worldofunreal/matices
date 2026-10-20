// La Cuentera's story (GDD §9): the world freezes and her book opens. The child says who arrives,
// what they do and what happens next; then how the character feels, and may say more. One tap
// chooses: the chosen card lights up for a moment and the story goes on by itself (GDD §12).
import { useEffect, useRef, useState } from "react";
import contenido, { type Paso, type Opcion } from "virtual:contenido";
import { Imagen } from "../lienzo/Personaje";
import { Bocina } from "../ui/Bocina";
import { estado, cambiarEstado, type Pagina } from "../datos/guardado";
import { personasDeCasa, nombreDe, codigoDe } from "../datos/casa";
import { registrar, semilla } from "../datos/eventos";
import { terminar } from "../datos/cuentos";
import { azar } from "../datos/azar";
import { Dibujo } from "./Dibujo";
import "./cuento.css";

const T = contenido.textos.cuento;
const PANEL = contenido.panel;
const ESCUELA = ["maestra", "companero", "conserje", "directora"] as const;
const ESTADOS = ["tranquilo", "inquieto", "alerta", "saturado"] as const;
const GRUPOS = ["cuerpo", "pensamiento", "entorno"] as const;
const PAUSA_ELEGIDA = 650; // the chosen card stays lit this long, then the story goes on
const PAUSA_CARITA = 2500; // after a face, the story closes unless the child opens "Contar más"
const PAUSA_CIERRE = 2200; // La Cuentera's closing line stays this long
const PAUSA_AHORA_NO = 1600;
// A tap this soon after the cards appear was meant for what was there before (walking in the world, the
// previous step): nobody reads a question that fast, so it does not count as an answer.
const A_CIEGAS = 700;

export type EstadoCuerpo = (typeof ESTADOS)[number];
export interface Carta {
  codigo: string;
  etiqueta: string;
  imagen?: string;
  piel?: number;
}
type Fase = { tipo: "paso"; i: number } | { tipo: "carita" } | { tipo: "panel" } | { tipo: "cierre" };
interface Ruta {
  fase: Fase;
  cartas: Carta[];
}
type Elegidos = Record<(typeof GRUPOS)[number], string[]>;

// A step is skipped when solo_si does not match, or when it asks about {quien} and nobody was chosen
// ("Nadie", "lo resuelve sin ayuda" or "No sé") and it has no options for that case (contenido/README.md).
function saltar(p: Paso, quien: Carta | null, anterior: string | null) {
  if (p.solo_si && !(anterior && p.solo_si.includes(anterior))) return true;
  if (p.personas || !p.pregunta?.includes("{quien}")) return false;
  const nadie = !quien || ["NADIE", "SOLO"].includes(quien.codigo);
  return nadie && !(quien && p.opciones_solo);
}

export function Cuento({ id, alCerrar }: { id: string; alCerrar: (estadoCuerpo: EstadoCuerpo | null) => void }) {
  const c = contenido.cuentos.find((x) => x.id === id)!;
  const pasos = c.pasos;
  const [rng] = useState(() => azar(`${semilla()}-${id}`));
  const quienRef = useRef<Carta | null>(null);
  const anteriorRef = useRef<string | null>(null);
  const lineasRef = useRef<string[]>([]);
  const dibujosRef = useRef<string[]>([]);
  const caritaRef = useRef<number | null>(null);
  const estadoRef = useRef<EstadoCuerpo | null>(null);
  const bloqueo = useRef(false);
  const cerrandoRef = useRef(false);
  const inicioPaso = useRef(performance.now());
  const pausa = useRef(0);

  const llenar = (t: string) => t.replaceAll("{nombre}", estado().nombre).replaceAll("{quien}", quienRef.current?.etiqueta ?? estado().nombre);

  // Cards for one step: people from the house and school, or the options for the case that applies.
  function cartasDe(p: Paso): Carta[] {
    if (p.personas) {
      const lista: Carta[] = [];
      const agregar = (t: string) => {
        if (t === "casa" || t === "casa_adultos") {
          const gente = personasDeCasa(t === "casa_adultos");
          // An empty house offers a neighbor and nobody instead (GDD §7).
          if (!gente.length) return ["vecino", "nadie"].forEach(agregar);
          for (const f of gente) lista.push({ codigo: codigoDe(f), etiqueta: nombreDe(f), imagen: `figuras/retrato_${f.figura}`, piel: f.piel });
        } else if (t === "escuela") ESCUELA.forEach((e) => lista.push({ codigo: `ESCUELA:${e}`, etiqueta: T.escuela[e], imagen: `figuras/retrato_${e}` }));
        else if (t === "vecino") lista.push({ codigo: "VECINO", etiqueta: T.vecino, imagen: "figuras/retrato_vecino" });
        else if (t === "nadie") lista.push({ codigo: "NADIE", etiqueta: T.nadie, imagen: "interfaz/persona_nadie" });
        else if (t === "solo") lista.push({ codigo: "SOLO", etiqueta: llenar(T.solo), imagen: "interfaz/persona_solo" });
      };
      p.personas.forEach(agregar);
      const unicas = lista.filter((x, i) => lista.findIndex((y) => y.codigo === x.codigo) === i);
      return [...rng.barajar(unicas), { codigo: "NO_SE", etiqueta: T.no_se, imagen: "interfaz/no_se" }];
    }
    const solo = quienRef.current && ["NADIE", "SOLO"].includes(quienRef.current.codigo) && p.opciones_solo;
    const opciones = (solo ? p.opciones_solo : p.opciones)!;
    const base = rng.barajar(opciones.map(([codigo, t]: Opcion) => ({ codigo, etiqueta: llenar(t), imagen: `iconos/${codigo.toLowerCase()}` })));
    return [...base, { codigo: "OTRA", etiqueta: T.otra, imagen: "iconos/otra" }, { codigo: "NO_SE", etiqueta: T.no_se, imagen: "interfaz/no_se" }];
  }

  // The next step that applies, from step `desde` on. The last step is always the face.
  function planear(desde: number): Ruta {
    for (let k = desde; k < pasos.length; k++) {
      const p = pasos[k];
      if (p.id === "carita") return { fase: { tipo: "carita" }, cartas: [] };
      if (saltar(p, quienRef.current, anteriorRef.current)) continue;
      return { fase: { tipo: "paso", i: k }, cartas: cartasDe(p) };
    }
    return { fase: { tipo: "cierre" }, cartas: [] };
  }

  const [ruta, setRuta] = useState<Ruta>(() => planear(0));
  const [elegida, setElegida] = useState<string | null>(null);
  const [caritaUI, setCaritaUI] = useState<number | null>(null);
  const [elegidos, setElegidos] = useState<Elegidos>({ cuerpo: [], pensamiento: [], entorno: [] });
  const [estadoUI, setEstadoUI] = useState<EstadoCuerpo | null>(null);
  const [dibujando, setDibujando] = useState(false);
  const [cerrando, setCerrando] = useState<"terminado" | "ahora_no" | null>(null);

  useEffect(() => {
    registrar("cuento", { cuento: id, que: "inicio" });
    return () => clearTimeout(pausa.current);
  }, [id]);

  useEffect(() => {
    if (ruta.fase.tipo !== "cierre") return;
    pausa.current = window.setTimeout(() => cerrar("terminado"), PAUSA_CIERRE);
    return () => clearTimeout(pausa.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta.fase.tipo]);

  const avanzar = (desde: number) => {
    inicioPaso.current = performance.now();
    setElegida(null);
    setRuta(planear(desde));
  };

  const elegirCarta = (carta: Carta) => {
    if (bloqueo.current || ruta.fase.tipo !== "paso" || performance.now() - inicioPaso.current < A_CIEGAS) return;
    const i = ruta.fase.i;
    const p = pasos[i];
    registrar("cuento_paso", { cuento: id, paso: p.id, opciones: ruta.cartas.map((x) => x.codigo), elegida: carta.codigo, ms_decidir: Math.round(performance.now() - inicioPaso.current) });
    if (p.personas) quienRef.current = carta.codigo === "NO_SE" ? null : carta;
    anteriorRef.current = carta.codigo;
    if (carta.codigo !== "NO_SE") lineasRef.current.push(`${p.personas ? llenar(p.pregunta!) + " " : ""}${carta.etiqueta}`);
    bloqueo.current = true;
    setElegida(carta.codigo);
    if (carta.codigo === "OTRA") return setDibujando(true);
    pausa.current = window.setTimeout(() => {
      bloqueo.current = false;
      avanzar(i + 1);
    }, PAUSA_ELEGIDA);
  };

  // "Otra cosa": the child draws it, then the story goes on with the next step.
  const alDibujar = (imagen: string | null) => {
    setDibujando(false);
    if (imagen) dibujosRef.current.push(imagen);
    bloqueo.current = false;
    if (ruta.fase.tipo === "paso") avanzar(ruta.fase.i + 1);
  };

  const elegirCarita = (valor: number) => {
    if (bloqueo.current || performance.now() - inicioPaso.current < A_CIEGAS) return;
    bloqueo.current = true;
    caritaRef.current = valor;
    setCaritaUI(valor);
    registrar("carita", { cuento: id, valor });
    pausa.current = window.setTimeout(() => setRuta({ fase: { tipo: "cierre" }, cartas: [] }), PAUSA_CARITA);
  };

  const contarMas = () => {
    clearTimeout(pausa.current);
    setRuta({ fase: { tipo: "panel" }, cartas: [] });
  };

  const alternar = (g: keyof Elegidos, valor: string) =>
    setElegidos((e) => ({ ...e, [g]: e[g].includes(valor) ? e[g].filter((x) => x !== valor) : [...e[g], valor] }));

  const terminarPanel = () => {
    registrar("panel_cpe", { cuento: id, ...elegidos });
    if (estadoUI) registrar("estado_cuerpo", { cuento: id, estado: estadoUI });
    estadoRef.current = estadoUI;
    setRuta({ fase: { tipo: "cierre" }, cartas: [] });
  };

  // Ends the story: "terminado" keeps it in Mi libro; "ahora_no" leaves no page (GDD §10).
  const cerrar = (como: "terminado" | "ahora_no") => {
    if (cerrandoRef.current) return;
    cerrandoRef.current = true;
    setCerrando(como);
    terminar(id, como);
    registrar("cuento", { cuento: id, que: como === "terminado" ? "fin" : "ahora_no" });
    const pagina: Pagina = { cuento: id, titulo: c.titulo, lineas: [llenar(c.inicio), ...lineasRef.current], carita: caritaRef.current, dibujos: dibujosRef.current };
    if (como === "terminado") cambiarEstado({ libro: [...estado().libro, pagina] }, true);
    const finalEstado = como === "terminado" ? estadoRef.current : null;
    pausa.current = window.setTimeout(() => alCerrar(finalEstado), como === "terminado" ? 400 : PAUSA_AHORA_NO);
  };

  const ahoraNo = () => {
    if (cerrandoRef.current || ruta.fase.tipo === "cierre") return;
    const f = ruta.fase;
    registrar("ahora_no", { cuento: id, paso: f.tipo === "paso" ? pasos[f.i].id : f.tipo });
    cerrar("ahora_no");
  };

  const f = ruta.fase;
  const pregunta =
    cerrando === "ahora_no"
      ? T.ahora_no
      : cerrando === "terminado" || f.tipo === "cierre"
        ? T.cierre
        : f.tipo === "paso"
          ? { clave: `cuentos.${id}.${pasos[f.i].id}`, texto: llenar(pasos[f.i].pregunta!) }
          : f.tipo === "carita"
            ? { clave: `cuentos.${id}.carita`, texto: llenar(pasos.find((x) => x.id === "carita")?.pregunta ?? T.carita) }
            : { clave: "cuento.estado", texto: T.estado };
  const textoPregunta = typeof pregunta === "string" ? pregunta : pregunta.texto;
  const claveVoz = typeof pregunta === "string" ? `cuento.cierre` : pregunta.clave;

  return (
    <>
      <div className="velo" />
      <section className="marco-libro cuento">
        <header className="cuento-cabecera">
          <Imagen id="personajes/retrato_cuentera_neutral" tam={48} />
          <div className="cuento-texto">
            {(f.tipo === "paso" || f.tipo === "carita") && <p className="cuento-inicio">{llenar(c.inicio)}</p>}
            <h2>{textoPregunta}</h2>
          </div>
          <Bocina clave={claveVoz} texto={textoPregunta} />
        </header>

        <div className="cuento-cuerpo">
          {!cerrando && f.tipo === "paso" && (
            <div className="cuento-tarjetas">
              {ruta.cartas.map((carta) => (
                <div
                  key={carta.codigo}
                  role="button"
                  tabIndex={0}
                  className={`tarjeta${elegida === carta.codigo ? " elegida" : ""}`}
                  onClick={() => elegirCarta(carta)}
                  onKeyDown={(e) => e.key === "Enter" && elegirCarta(carta)}
                >
                  {carta.imagen && <Imagen id={carta.imagen} piel={carta.piel} tam={carta.imagen.startsWith("figuras/") ? 96 : 48} />}
                  <span>{carta.etiqueta}</span>
                  <Bocina clave={`cuentos.${id}.${carta.codigo}`} texto={carta.etiqueta} />
                </div>
              ))}
            </div>
          )}

          {!cerrando && f.tipo === "carita" && (
            <div className="cuento-caritas">
              {T.caritas.map((etiqueta, i) => (
                <button key={etiqueta} className={`carita${caritaUI === i + 1 ? " elegida" : ""}`} onClick={() => elegirCarita(i + 1)}>
                  <Imagen id={`interfaz/carita_${i + 1}`} tam={64} />
                  <span>{etiqueta}</span>
                </button>
              ))}
              {caritaUI !== null && (
                <button className="boton secundario cuento-mas" onClick={contarMas}>
                  {T.contar_mas}
                </button>
              )}
            </div>
          )}

          {!cerrando && f.tipo === "panel" && (
            <div className="cuento-panel">
              {GRUPOS.map((g) => (
                <div key={g}>
                  <h3>{T.panel[g]}</h3>
                  <div className="cuento-chips">
                    {PANEL[g].map(([valor, etiqueta]) => (
                      <button key={valor} className="chip" aria-pressed={elegidos[g].includes(valor)} onClick={() => alternar(g, valor)}>
                        <Imagen id={`panel/${valor}`} tam={48} />
                        <span>{etiqueta}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <h3>{T.estado}</h3>
              <div className="cuento-estados">
                {ESTADOS.map((e) => (
                  <button key={e} className="chip" aria-pressed={estadoUI === e} onClick={() => setEstadoUI(estadoUI === e ? null : e)}>
                    {T.estados[e]}
                  </button>
                ))}
              </div>
              <div className="cuento-pie-panel">
                <button className="boton principal" onClick={terminarPanel}>
                  {T.listo}
                </button>
              </div>
            </div>
          )}
        </div>

        {!cerrando && f.tipo !== "cierre" && (
          <footer className="cuento-pie">
            <button className="boton secundario" onClick={ahoraNo}>
              {T.boton_ahora_no}
            </button>
          </footer>
        )}
      </section>

      {dibujando && <Dibujo origen={`${id}.${ruta.fase.tipo === "paso" ? pasos[ruta.fase.i].id : ""}`} consigna={T.dibujar} ahoraNo={ahoraNo} alTerminar={alDibujar} />}
    </>
  );
}
