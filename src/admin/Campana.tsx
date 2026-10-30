// The bell: the participants who arrived since the educator last opened it. On this browser's first visit
// everyone already here counts as seen, so nobody is announced as new by mistake.
import { useEffect, useMemo, useState } from "react";
import { Icono } from "../ui/iconos";
import * as K from "./calculos";
import type { Evento } from "./calculos";
import { Desplegable } from "./Desplegable";
import { fecha } from "./palabras";
import { guardarVistos, vistosGuardados } from "./memoria";

export function Campana({ eventos }: { eventos: Evento[] }) {
  const resumenes = useMemo(() => [...K.porParticipante(eventos)].map(([nino, evs]) => K.resumen(nino, evs)), [eventos]);
  const [nuevos, setNuevos] = useState<K.Resumen[]>([]);
  const [sinVer, setSinVer] = useState(0);

  useEffect(() => {
    const vistos = vistosGuardados();
    if (!vistos) guardarVistos(resumenes.map((r) => r.nino));
    const llegaron = K.nuevos(resumenes, vistos);
    setNuevos(llegaron);
    setSinVer(llegaron.length);
  }, [resumenes]);

  // Opening the bell is what marks them as seen.
  const abrir = () => {
    if (!sinVer) return;
    guardarVistos(resumenes.map((r) => r.nino));
    setSinVer(0);
  };

  return (
    <Desplegable etiqueta={sinVer ? `Alumnos nuevos: ${sinVer}` : "Alumnos nuevos"} alAbrir={abrir} disparador={<>{Icono.campana}{sinVer > 0 && <span className="insignia">{sinVer}</span>}</>}>
      <p className="panel-titulo">Alumnos nuevos</p>
      {nuevos.length ? (
        <ul className="lista-nuevos">
          {nuevos.map((r) => (
            <li key={r.nino}>
              <a href={`#p/${encodeURIComponent(r.nino)}`}><code>{r.nino}</code></a>
              <span className="nota">Se integró el {fecha(r.primera)} · <span className="pastilla">{r.dispositivo}</span></span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="nota">Todavía no llega nadie nuevo.</p>
      )}
    </Desplegable>
  );
}
