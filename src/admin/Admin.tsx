// The board: one admin account sees every participant and all of them together.
import { useEffect, useState } from "react";
import { pedir, salir } from "./api";
import { Cabecera } from "./Cabecera";
import { Campana } from "./Campana";
import { Entrada } from "./Entrada";
import type { Evento } from "./calculos";
import { MenuCuenta } from "./MenuCuenta";
import { MiPerfil } from "./MiPerfil";
import { educadoraGuardada } from "./memoria";
import { Perfil } from "./Perfil";
import { Todos } from "./Todos";

export function Admin() {
  const [eventos, setEventos] = useState<Evento[] | "fuera" | null>(null);
  const [error, setError] = useState("");
  const [ruta, setRuta] = useState(location.hash);
  const [educadora, setEducadora] = useState(educadoraGuardada);
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

  const cerrarSesion = () => salir().then(() => { location.hash = ""; setEventos("fuera"); }, (e) => setError(String(e)));
  const cuenta = ruta === "#cuenta";
  const nino = ruta.startsWith("#p/") ? decodeURIComponent(ruta.slice(3)) : null;
  const titulo = cuenta ? "Mi perfil" : nino ? <>Participante <code>{nino}</code></> : "Matices · Participantes";
  const pagina = cuenta ? <MiPerfil educadora={educadora} alGuardar={setEducadora} /> : nino ? <Perfil nino={nino} todos={eventos} /> : <Todos eventos={eventos} />;

  return (
    <div className="tab">
      <Cabecera titulo={titulo} volver={cuenta || nino !== null}>
        <Campana eventos={eventos} />
        <MenuCuenta educadora={educadora} alSalir={() => void cerrarSesion()} />
      </Cabecera>
      {pagina}
    </div>
  );
}
