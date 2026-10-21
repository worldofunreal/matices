// Activities outside the stories (GDD §10): La Cuentera's introduction, the scene to describe, and
// "Sobre mí" with the twins. They use the same book over the frozen world; one tap chooses, and the
// speaker is the only voice (GDD §12).
import { useEffect, useRef, useState } from "react";
import contenido from "virtual:contenido";
import { Imagen, Cara } from "../lienzo/Personaje";
import { Bocina } from "../ui/Bocina";
import { estado } from "../datos/guardado";
import { personasDeCasa, nombreDe, codigoDe } from "../datos/casa";
import { registrar, semilla } from "../datos/eventos";
import { terminar as terminarMomento } from "../datos/cuentos";
import { azar } from "../datos/azar";
import "./actividades.css";

const A = contenido.textos.actividades;
const T = contenido.textos.cuento;
const E = contenido.escena;
const S = contenido.sobreMi;
const PAUSA_ELEGIDA = 650; // the chosen card stays lit this long, then the activity goes on

export type TipoActividad = "cuentera" | "describir" | "sobre_mi";
type Como = "terminado" | "ahora_no";
interface Carta {
  codigo: string;
  etiqueta: string;
  imagen?: string;
  figura?: string; // a person of the house: the card shows the head of its figure
  piel?: number;
}

// The frame every activity shares: its start and end events, and the record of the day's story.
export function Actividad({ id, tipo, alCerrar }: { id: string; tipo: TipoActividad; alCerrar: () => void }) {
  const t0 = useRef(performance.now());
  const cerrandoRef = useRef(false);
  useEffect(() => {
    registrar("actividad", { actividad: id, que: "inicio" });
  }, [id]);

  const cerrar = (como: Como) => {
    if (cerrandoRef.current) return;
    cerrandoRef.current = true;
    terminarMomento(id, como);
    registrar("actividad", { actividad: id, que: como === "terminado" ? "fin" : "ahora_no", ms: Math.round(performance.now() - t0.current) });
    window.setTimeout(alCerrar, como === "terminado" ? 400 : 1600);
  };

  return (
    <>
      <div className="velo" />
      <section className={`marco-libro actividad ${tipo}`}>
        {tipo === "cuentera" && <Cuentera cerrar={cerrar} />}
        {tipo === "describir" && <Describir cerrar={cerrar} t0={t0} />}
        {tipo === "sobre_mi" && <SobreMi cerrar={cerrar} />}
      </section>
    </>
  );
}

// Day 1 in the library: La Cuentera introduces herself, her book and "Ahora no" (GDD §10).
function Cuentera({ cerrar }: { cerrar: (como: Como) => void }) {
  const lineas = A.cuentera.map((l) => l.replaceAll("{nombre}", estado().nombre));
  const [i, setI] = useState(0);
  const ultima = i >= lineas.length - 1;
  return (
    <>
      <div className="actividad-cuerpo">
        <Imagen id="personajes/retrato_cuentera_contento" tam={96} />
        <p className="actividad-texto">{lineas[i]}</p>
        <Bocina clave={`actividades.cuentera.${i}`} texto={lineas[i]} />
      </div>
      <footer className="actividad-pie">
        <button className="boton secundario" onClick={() => cerrar("ahora_no")}>
          {T.boton_ahora_no}
        </button>
        <button className="boton principal" onClick={() => (ultima ? cerrar("terminado") : setI(i + 1))}>
          {A.seguir}
        </button>
      </footer>
    </>
  );
}

// Day 2 in the library: an ambiguous picture. The child says what is happening, how the character
// feels and who the other plate is for (GDD §10). Each answer is one tap.
function Describir({ cerrar, t0 }: { cerrar: (como: Como) => void; t0: { current: number } }) {
  const [rng] = useState(() => azar(`${semilla()}-${E.id}`));
  const [cartas] = useState<Carta[][]>(() => {
    const noSe: Carta = { codigo: "NO_SE", etiqueta: T.no_se, imagen: "interfaz/no_se" };
    const casa: Carta[] = E.platos.includes("casa") ? personasDeCasa().map((f) => ({ codigo: codigoDe(f), etiqueta: nombreDe(f), figura: f.figura, piel: f.piel })) : [];
    return [
      [...rng.barajar(E.titulos.map(([codigo, t]) => ({ codigo, etiqueta: t, imagen: `iconos/${codigo.toLowerCase()}` }))), noSe],
      E.emociones.map((e) => ({ codigo: e.toUpperCase(), etiqueta: A.describir.emociones[e], imagen: e === "no_se" ? "interfaz/no_se" : undefined })),
      [...rng.barajar(casa), ...(E.platos.includes("nadie") ? [{ codigo: "NADIE", etiqueta: T.nadie, imagen: "interfaz/persona_nadie" }] : []), noSe],
    ];
  });
  const [paso, setPaso] = useState(0);
  const [elegida, setElegida] = useState<string | null>(null);
  const elegidas = useRef<string[]>([]);
  const bloqueo = useRef(false);
  const inicioPaso = useRef(performance.now());
  const preguntas = [E.pregunta_titulo, E.pregunta_emocion, E.pregunta_platos];
  const pasoNombre = ["titulo", "emocion", "plato"];

  const elegir = (c: Carta) => {
    if (bloqueo.current) return;
    bloqueo.current = true;
    registrar("describe_paso", { escena: E.id, paso: pasoNombre[paso], opciones: cartas[paso].map((x) => x.codigo), elegida: c.codigo, ms_decidir: Math.round(performance.now() - inicioPaso.current) });
    elegidas.current.push(c.codigo);
    setElegida(c.codigo);
    window.setTimeout(() => {
      // The last answer keeps the cards locked while the activity closes (no second record).
      if (paso < 2) {
        bloqueo.current = false;
        setElegida(null);
        inicioPaso.current = performance.now();
        return setPaso(paso + 1);
      }
      const [titulo, emocion, plato] = elegidas.current;
      registrar("describe", { escena: E.id, titulo, emocion, plato, ms: Math.round(performance.now() - t0.current) });
      cerrar("terminado");
    }, PAUSA_ELEGIDA);
  };

  return (
    <>
      <div className="actividad-cuerpo describir">
        <Imagen id="ilustraciones/escena_d01" tam={200} />
        <p className="actividad-inicio">{paso === 0 ? A.describir.inicio : ""}</p>
        <div className="actividad-pregunta">
          <h2>{preguntas[paso]}</h2>
          <Bocina clave={`escena.${E.id}.${paso}`} texto={preguntas[paso]} />
        </div>
        <div className="tarjetas">
          {cartas[paso].map((c) => (
            <div key={c.codigo} role="button" tabIndex={0} className={`tarjeta${elegida === c.codigo ? " elegida" : ""}`} onClick={() => elegir(c)}>
              {c.figura ? <Cara id={`figuras/${c.figura}`} piel={c.piel} tam={96} /> : c.imagen && <Imagen id={c.imagen} piel={c.piel} tam={c.imagen.startsWith("figuras/") ? 96 : 48} />}
              <span>{c.etiqueta}</span>
              <Bocina clave={`escena.carta.${c.codigo}`} texto={c.etiqueta} />
            </div>
          ))}
        </div>
      </div>
      <footer className="actividad-pie">
        <button className="boton secundario" onClick={() => cerrar("ahora_no")}>
          {T.boton_ahora_no}
        </button>
      </footer>
    </>
  );
}

// Day 3 in the library: "Sobre mí" (GDD §8, §10). Two identical kittens each say one of two
// opposite sentences; the child taps the one they are like, or "Los dos", or "Ahora no" for this one.
// Which kitten says which side is shuffled per sentence with the child's seed.
function SobreMi({ cerrar }: { cerrar: (como: Como) => void }) {
  const [rng] = useState(() => azar(`${semilla()}-sobre-mi`));
  const [frases] = useState(() => rng.barajar([...S.frases]).map((f) => ({ f, titoDice: rng.frac() < 0.5 ? ("a" as const) : ("b" as const) })));
  const [i, setI] = useState(-1); // -1: La Cuentera's warning that this is not a story
  const [elegido, setElegido] = useState<"tito" | "tita" | "AMBOS" | "AHORA_NO" | null>(null);
  const bloqueo = useRef(false);
  const inicioFrase = useRef(performance.now());
  const fin = useRef(false);

  const dice = (quien: "tito" | "tita") => {
    const { f, titoDice } = frases[i];
    const lado = quien === "tito" ? titoDice : titoDice === "a" ? "b" : "a";
    return { lado, texto: f[lado] };
  };

  const responder = (marca: "tito" | "tita" | "AMBOS" | "AHORA_NO") => {
    if (bloqueo.current) return;
    bloqueo.current = true;
    const { f, titoDice } = frases[i];
    const respuesta = marca === "AMBOS" || marca === "AHORA_NO" ? marca : dice(marca).lado.toUpperCase();
    registrar("sobre_mi", { frase: f.id, area: f.area, respuesta, tito_dice: titoDice.toUpperCase(), orden: i + 1, ms_decidir: Math.round(performance.now() - inicioFrase.current) });
    setElegido(marca);
    window.setTimeout(() => {
      bloqueo.current = false;
      setElegido(null);
      if (i + 1 < frases.length) {
        inicioFrase.current = performance.now();
        return setI(i + 1);
      }
      if (fin.current) return;
      fin.current = true;
      setI(frases.length);
      window.setTimeout(() => cerrar("terminado"), 1500);
    }, PAUSA_ELEGIDA);
  };

  if (i < 0)
    return (
      <>
        <div className="actividad-cuerpo">
          <Imagen id="personajes/retrato_cuentera_neutral" tam={96} />
          <p className="actividad-texto">{S.aviso}</p>
          <Bocina clave="sobre_mi.aviso" texto={S.aviso} />
        </div>
        <footer className="actividad-pie">
          <button className="boton secundario" onClick={() => cerrar("ahora_no")}>
            {T.boton_ahora_no}
          </button>
          <button className="boton principal" onClick={() => setI(0)}>
            {A.seguir}
          </button>
        </footer>
      </>
    );

  if (i >= frases.length)
    return (
      <div className="actividad-cuerpo">
        <Imagen id="personajes/retrato_cuentera_contento" tam={96} />
        <p className="actividad-texto">{A.sobre_mi.fin}</p>
      </div>
    );

  const frase = frases[i].f;
  return (
    <>
      <div className="actividad-cuerpo sobre-mi">
        <div className="gemelos">
          {(["tito", "tita"] as const).map((quien) => (
            <div key={quien} role="button" tabIndex={0} className={`gemelo${elegido === quien ? " elegida" : ""}`} onClick={() => responder(quien)}>
              <Imagen id={`personajes/retrato_${quien}_neutral`} tam={96} />
              <p>{dice(quien).texto}</p>
              <Bocina clave={`sobre_mi.${frase.id}.${quien}`} texto={dice(quien).texto} />
            </div>
          ))}
        </div>
      </div>
      <footer className="actividad-pie">
        <button className="boton secundario" onClick={() => responder("AHORA_NO")}>
          {T.boton_ahora_no}
        </button>
        <button className="boton principal" onClick={() => responder("AMBOS")}>
          {A.sobre_mi.los_dos}
        </button>
      </footer>
    </>
  );
}

// The landing at the end of each day (watering the plants of the patio, then La Cuentera's goodbye). GDD §10.
export function Aterrizaje({ final, alCerrar }: { final: boolean; alCerrar: () => void }) {
  const t0 = useRef(performance.now());
  const cerrandoRef = useRef(false);
  const [regadas, setRegadas] = useState<number[]>([]);
  const [adios, setAdios] = useState(false);

  const terminar = (riegos: number) => {
    if (cerrandoRef.current) return;
    cerrandoRef.current = true;
    const ms = Math.round(performance.now() - t0.current);
    registrar("aterrizaje", { dia: estado().dia, regadas: riegos, ms });
    setAdios(true);
    window.setTimeout(alCerrar, 2200);
  };

  const regar = (k: number) => {
    if (regadas.includes(k) || cerrandoRef.current) return;
    const nuevas = [...regadas, k];
    setRegadas(nuevas);
    if (nuevas.length === 3) terminar(3);
  };

  return (
    <>
      <div className="velo" />
      <section className="marco-libro aterrizaje">
        {adios ? (
          <div className="actividad-cuerpo">
            <Imagen id="personajes/retrato_cuentera_contento" tam={96} />
            <p className="actividad-texto">{(final ? A.aterrizaje.adios_final : A.aterrizaje.adios).replaceAll("{nombre}", estado().nombre)}</p>
          </div>
        ) : (
          <>
            <div className="actividad-cuerpo">
              <p className="actividad-texto">{A.aterrizaje.texto}</p>
              <div className="macetas">
                {[0, 1, 2].map((k) => (
                  <button key={k} className={`maceta${regadas.includes(k) ? " regada" : ""}`} aria-label="Regar" onClick={() => regar(k)}>
                    <Imagen id="lugares/casa/maceta" tam={96} />
                  </button>
                ))}
              </div>
            </div>
            <footer className="actividad-pie">
              <button className="boton principal" onClick={() => terminar(regadas.length)}>
                {A.seguir}
              </button>
            </footer>
          </>
        )}
      </section>
    </>
  );
}
