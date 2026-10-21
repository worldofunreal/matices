import "./ui/estilos.css"; // first, so each screen's own styles win over the base ones
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { iniciarRegistro, descifrar, registrar } from "./datos/eventos";
import { cargarEstado, estado } from "./datos/guardado";
import { vigilar } from "./datos/monitor";
import { aplicarLectura } from "./pantallas/Opciones";
import * as guardado from "./datos/guardado";
import * as situaciones from "./datos/situaciones";
import { todosLosEventos, borrar } from "./datos/almacen";

// ?nuevo starts a new anonymous participant on this device; events not yet sent keep their own code.
if (new URLSearchParams(location.search).has("nuevo")) {
  await Promise.all([borrar("estado"), borrar("partida")]);
  history.replaceState(null, "", location.pathname);
}
const partida = await iniciarRegistro();
await cargarEstado();
aplicarLectura(estado().opciones.lectura);
vigilar(partida.sesion);

// Debug mode exposes the saved state and the decrypted events so automated checks read the live ones.
if (new URLSearchParams(location.search).has("debug")) Object.assign(window, { matices: { guardado, situaciones, eventos: { descifrar, todos: todosLosEventos } } });

createRoot(document.getElementById("raiz")!).render(<App />);
// How long until the first screen is on (MVP M0: under a second on a phone).
requestAnimationFrame(() => registrar("carga", { que: "inicio", ms: Math.round(performance.now()) }));
