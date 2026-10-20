import "./ui/estilos.css"; // first, so each screen's own styles win over the base ones
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { iniciarRegistro, descifrar } from "./datos/eventos";
import { cargarEstado, estado } from "./datos/guardado";
import { vigilar, pantalla } from "./datos/monitor";
import { aplicarLectura } from "./pantallas/Opciones";
import * as guardado from "./datos/guardado";
import * as cuentos from "./datos/cuentos";
import { todosLosEventos } from "./datos/almacen";

const partida = await iniciarRegistro();
await cargarEstado();
aplicarLectura(estado().opciones.lectura);
vigilar(partida.sesion);
pantalla("inicio");

// Debug mode exposes the saved state and the decrypted events so automated checks read the live ones.
if (new URLSearchParams(location.search).has("debug")) Object.assign(window, { matices: { guardado, cuentos, eventos: { descifrar, todos: todosLosEventos } } });

createRoot(document.getElementById("raiz")!).render(<App />);
