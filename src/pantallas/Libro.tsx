// Mi libro (GDD §10): the pages of the finished stories and their drawings. Read only.
import { useState } from "react";
import { Imagen } from "../lienzo/Personaje";
import { Icono } from "../ui/iconos";
import { estado } from "../datos/guardado";
import "./libro.css";

export function Libro({ alCerrar }: { alCerrar: () => void }) {
  const paginas = estado().libro;
  const [abierta, setAbierta] = useState<number | null>(null);
  const p = abierta === null ? null : paginas[abierta];
  return (
    <section className="libro" aria-label="Mi libro">
      <header className="libro-cabecera">
        {p ? (
          <button className="boton redondo" aria-label="Volver" onClick={() => setAbierta(null)}>
            {Icono.volver}
          </button>
        ) : (
          <h2>Mi libro</h2>
        )}
        {p && <h2>{p.titulo}</h2>}
        <button className="boton redondo" aria-label="Cerrar" onClick={alCerrar}>
          {Icono.cerrar}
        </button>
      </header>

      {!p && (
        <div className="libro-paginas">
          {paginas.map((pagina, i) => (
            <button key={i} className="libro-pagina-tarjeta" onClick={() => setAbierta(i)}>
              {pagina.carita ? <Imagen id={`interfaz/carita_${pagina.carita}`} tam={64} /> : <span className="libro-sin-carita" />}
              <span>{pagina.titulo}</span>
            </button>
          ))}
        </div>
      )}

      {p && (
        <article className="libro-detalle">
          {p.lineas.map((linea, i) => (
            <p key={i}>{linea}</p>
          ))}
          {p.carita && (
            <div className="libro-carita">
              <Imagen id={`interfaz/carita_${p.carita}`} tam={64} />
            </div>
          )}
          {p.dibujos.map((src, i) => (
            <img key={i} className="libro-dibujo" src={src} alt="Dibujo del cuento" />
          ))}
        </article>
      )}
    </section>
  );
}
