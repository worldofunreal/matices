// Mi libro: the child's drawings, and a blank sheet to draw whenever they want.
import { useEffect, useState } from "react";
import contenido from "virtual:contenido";
import { Icono } from "../ui/iconos";
import { estado, cambiarEstado } from "../datos/guardado";
import { enDetalle } from "../datos/monitor";
import { Dibujo } from "./Dibujo";
import "./libro.css";

const L = contenido.textos.libro;

export function Libro({ alCerrar }: { alCerrar: () => void }) {
  const [paginas, setPaginas] = useState(estado().libro);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [dibujando, setDibujando] = useState(false);
  useEffect(() => () => enDetalle(null), []);

  if (dibujando)
    return (
      <Dibujo
        origen="libre"
        consigna={L.consigna}
        alTerminar={(imagen) => {
          enDetalle(null);
          setDibujando(false);
          if (!imagen) return;
          const libro = [...estado().libro, { dibujo: imagen, cuando: Date.now() }];
          cambiarEstado({ libro }, true);
          setPaginas(libro);
        }}
      />
    );

  const p = abierta === null ? null : paginas[abierta];
  return (
    <section className="libro" aria-label={L.titulo}>
      <header className="libro-cabecera">
        {p ? (
          <button className="boton redondo" aria-label="Volver" onClick={() => setAbierta(null)}>
            {Icono.volver}
          </button>
        ) : (
          <h2>{L.titulo}</h2>
        )}
        {p && <h2 />}
        <button className="boton redondo" aria-label="Cerrar" onClick={alCerrar}>
          {Icono.cerrar}
        </button>
      </header>

      {!p && (
        <div className="libro-paginas">
          <button
            className="libro-pagina-tarjeta libro-nueva"
            onClick={() => {
              enDetalle("dibujo");
              setDibujando(true);
            }}
          >
            <span className="libro-lapiz">{Icono.lapiz}</span>
            <span>{L.dibujar}</span>
          </button>
          {paginas.map((pagina, i) => (
            <button key={i} className="libro-pagina-tarjeta" aria-label={`Dibujo ${i + 1}`} onClick={() => setAbierta(i)}>
              <img className="libro-miniatura" src={pagina.dibujo} alt="" />
            </button>
          ))}
        </div>
      )}

      {p && (
        <article className="libro-detalle">
          <img className="libro-dibujo" src={p.dibujo} alt={`Dibujo ${abierta! + 1}`} />
        </article>
      )}
    </section>
  );
}
