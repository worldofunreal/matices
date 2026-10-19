import "./ui/estilos.css"; // first, so each screen's own styles win over the base ones
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { iniciarRegistro } from "./datos/eventos";
import { cargarEstado } from "./datos/guardado";
import { vigilar, pantalla } from "./datos/monitor";
import * as guardado from "./datos/guardado";
import * as cuentos from "./datos/cuentos";

const partida = await iniciarRegistro();
await cargarEstado();
vigilar(partida.sesion);
pantalla("inicio");

// Debug mode exposes the saved state so automated checks read the live one.
if (new URLSearchParams(location.search).has("debug")) Object.assign(window, { matices: { guardado, cuentos } });

createRoot(document.getElementById("raiz")!).render(<App />);
