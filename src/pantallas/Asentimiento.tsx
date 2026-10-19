import contenido from "virtual:contenido";
import { Bocina } from "../ui/Bocina";
import { fijarRegistro } from "../datos/eventos";
import "./asentimiento.css";

const T = contenido.textos.asentimiento;
// Capital letter wherever the name starts a sentence.
const mensaje = T.texto.replaceAll("{psicologo}", T.psicologo_prueba).replace(/(^|[.!?]\s+)(\p{Ll})/gu, (_, a: string, b: string) => a + b.toUpperCase());

// The child's own yes, before anything is recorded (docs/legal/consentimiento-y-datos.md, step 3).
// "Ahora no" plays the same game with nothing recorded, so nobody can tell the difference.
export function Asentimiento({ alResponder }: { alResponder: () => void }) {
  const responder = async (si: boolean) => {
    await fijarRegistro(si);
    alResponder();
  };
  return (
    <main className="pantalla asentimiento">
      <section className="panel">
        <div className="encabezado">
          <h1>Matices</h1>
          <Bocina clave="asentimiento.texto" texto={mensaje} />
        </div>
        <p>{mensaje}</p>
        <div className="acciones">
          <button className="boton principal" onClick={() => void responder(true)}>
            {T.si}
          </button>
          <button className="boton secundario" onClick={() => void responder(false)}>
            {T.no}
          </button>
        </div>
      </section>
    </main>
  );
}
