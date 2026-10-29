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
        alAbortar={() => setDibujando(false)}
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

  const descargar = (dibujo: string, i: number) => {
    const enlace = document.createElement("a");
    enlace.href = dibujo;
    enlace.download = `matices_dibujo_${i + 1}.png`;
    enlace.click();
  };

  const borrar = (i: number) => {
    const nuevo = paginas.filter((_, idx) => idx !== i);
    cambiarEstado({ libro: nuevo }, true);
    setPaginas(nuevo);
    setAbierta(null);
  };

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
        {p && <h2>Dibujo #{abierta! + 1}</h2>}
        <div className="libro-cabecera-acciones">
          {p && (
            <>
              <button
                className="boton redondo"
                aria-label="Descargar dibujo"
                title="Descargar dibujo"
                onClick={() => descargar(p.dibujo, abierta!)}
              >
                {Icono.descargar}
              </button>
              <button
                className="boton redondo"
                aria-label="Borrar dibujo"
                title="Borrar dibujo"
                onClick={() => borrar(abierta!)}
              >
                {Icono.quitar}
              </button>
            </>
          )}
          <button className="boton redondo" aria-label="Cerrar" onClick={alCerrar}>
            {Icono.cerrar}
          </button>
        </div>
      </header>

      {!p && (
        <div className="libro-contenido">
          <div className="libro-paginas">
            <button
              className="libro-pagina-tarjeta panel panel-compacto libro-nueva"
              onClick={() => {
                enDetalle("dibujo");
                setDibujando(true);
              }}
            >
              <span className="libro-lapiz">{Icono.lapiz}</span>
              <span>{L.dibujar}</span>
            </button>
            {paginas.map((pagina, i) => (
              <button
                key={i}
                className="libro-pagina-tarjeta panel panel-compacto"
                aria-label={`Dibujo ${i + 1}`}
                onClick={() => setAbierta(i)}
              >
                <img className="libro-miniatura" src={pagina.dibujo} alt="" />
                <span className="libro-tarjeta-etiqueta">Dibujo #{i + 1}</span>
              </button>
            ))}
          </div>

          {paginas.length === 0 && (
            <div className="libro-vacio panel panel-compacto">
              <span className="libro-vacio-icono" aria-hidden="true">🎨</span>
              <p className="libro-vacio-texto">
                Tu libro de recuerdos está listo para tus dibujos. ¡Toca "Dibujar" para empezar tu primera obra!
              </p>
            </div>
          )}
        </div>
      )}

      {p && (
        <article className="libro-detalle">
          <div className="libro-dibujo-marco">
            <img className="libro-dibujo" src={p.dibujo} alt={`Dibujo ${abierta! + 1}`} />
          </div>
        </article>
      )}
    </section>
  );
}
