// Interface icons as simple strokes, so they stay sharp at any size.
import type { ReactNode } from "react";

const svg = (hijos: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {hijos}
  </svg>
);

export const Icono = {
  bocina: svg(
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </>,
  ),
  cuerpo: svg(
    <>
      <circle cx="12" cy="6.5" r="3" />
      <path d="M6 21v-2.5a6 6 0 0 1 12 0V21" />
    </>,
  ),
  piel: svg(
    <>
      <path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z" />
    </>,
  ),
  cabello: svg(
    <>
      <path d="M5 13c0-5 3-8 7-8s7 3 7 8" />
      <path d="M5 13c1-2 3-3 5-3M19 13c-1-3-4-4-7-3" />
      <circle cx="12" cy="15" r="4" />
    </>,
  ),
  ropa: svg(
    <>
      <path d="M8 4l-4 3 2 4 2-1v10h8V10l2 1 2-4-4-3c-1 1.5-2.4 2-4 2s-3-.5-4-2z" />
    </>,
  ),
  extras: svg(
    <>
      <circle cx="7" cy="14" r="3.2" />
      <circle cx="17" cy="14" r="3.2" />
      <path d="M10.2 14h3.6M3.8 13 5 9M20.2 13 19 9" />
    </>,
  ),
  nombre: svg(
    <>
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <path d="M7 12h6M7 15h3" />
    </>,
  ),
  lapiz: svg(
    <>
      <path d="M4 20l1-4L16 5l3 3L8 19l-4 1z" />
    </>,
  ),
  listo: svg(<path d="M5 12.5l4.5 4.5L19 7.5" />),
  mas: svg(<path d="M12 5v14M5 12h14" />),
  menos: svg(<path d="M5 12h14" />),
  encuadrar: svg(<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />),
  quitar: svg(<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" />),
  libro: svg(
    <>
      <path d="M3 5.5c3-1.6 6-1.6 9 .9 3-2.5 6-2.5 9-.9V19c-3-1.4-6-1.4-9 .6-3-2-6-2-9-.6z" />
      <path d="M12 6.4V19" />
    </>,
  ),
  hablar: svg(
    <>
      <path fill="#fff" d="M9 3.5h8.5A2.5 2.5 0 0 1 20 6v4.5a2.5 2.5 0 0 1-2.5 2.5H17v3l-3-3H9a2.5 2.5 0 0 1-2.5-2.5V6A2.5 2.5 0 0 1 9 3.5z" />
      <path fill="#fff" d="M6.5 8h6A2.5 2.5 0 0 1 15 10.5v3a2.5 2.5 0 0 1-2.5 2.5H10l-3.5 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5v-3A2.5 2.5 0 0 1 6.5 8z" />
    </>,
  ),
  opciones: svg(
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2.2" fill="#fff" />
      <circle cx="15" cy="12" r="2.2" fill="#fff" />
      <circle cx="8" cy="17" r="2.2" fill="#fff" />
    </>,
  ),
  musica: svg(
    <>
      <path d="M9 17.5V5.5l10-2v12" />
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="16.5" cy="15.5" r="2.5" />
    </>,
  ),
  efectos: svg(<path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />),
  velocidad: svg(
    <>
      <path d="M4 6.5 12 12l-8 5.5z" />
      <path d="M12 6.5 20 12l-8 5.5z" />
    </>,
  ),

  lectura: svg(<path d="M4 19 12 5l8 14M7.5 14h9" />),
  cerrar: svg(<path d="M6 6l12 12M18 6L6 18" />),
  borrar: svg(
    <>
      <path d="M5 15.5l8.2-8.7a1.8 1.8 0 0 1 2.6 0l2.7 2.8a1.8 1.8 0 0 1 0 2.6L12 20H8.2L5 16.8a1 1 0 0 1 0-1.3z" />
      <path d="M9 20h11" />
    </>,
  ),
  volver: svg(<path d="M15 5l-7 7 7 7" />),
  // A sneaker with speed lines: the run button.
  correr: svg(
    <>
      <path d="M8 8h3l2 3 5 1.5c1.5.5 2.5 1.5 2.5 3V17H8z" />
      <path d="M8 17h12.5M2 10h4M3 13.5h3" />
    </>,
  ),
  candado: svg(
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>,
  ),
  siguiente: svg(<path d="M9 5l7 7-7 7" />),
  deshacer: svg(
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-4" />
    </>,
  ),
  descargar: svg(
    <>
      <path d="M12 3v13M7 11l5 5 5-5" />
      <path d="M5 21h14" />
    </>,
  ),
  // Acciones físicas del personaje:
  brincar: svg(
    <>
      <circle cx="12" cy="5" r="2.5" />
      <path d="M9 13l3-3 3 2 3-2" />
      <path d="M10 17l2-4 2 3 2 4" />
      <path d="M6 21c3-2 9-2 12 0" />
    </>,
  ),
  atacar: svg(
    <>
      <rect x="6" y="7" width="10" height="11" rx="2.5" />
      <path d="M16 10h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2" />
      <path d="M9 7v4M12 7v4" />
      <path d="M2 12l2-1v2zM3 6l2 2M3 18l2-2" />
    </>,
  ),
  golpear: svg(
    <>
      <rect x="5" y="7" width="11" height="12" rx="3" />
      <path d="M16 10h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2" />
      <path d="M8 7v4M11 7v4M14 7v4" />
      <path d="M2 13h2" />
    </>,
  ),
  patear: svg(
    <>
      <circle cx="9" cy="5" r="2" />
      <path d="M9 7v6l6-1 5 3" />
      <path d="M9 13l-2 7" />
      <path d="M17 19l2-1-1-2" />
      <path d="M21 13l2-1" />
    </>,
  ),
  puerta: svg(
    <>
      <path d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5V21M3 21h18" />
      <circle cx="15.5" cy="12.5" r="1.2" fill="currentColor" stroke="none" />
    </>,
  ),
  mano: svg(
    <>
      <path d="M7 12V6a1.5 1.5 0 0 1 3 0v5M10 11V4.5a1.5 1.5 0 0 1 3 0V11M13 11V6a1.5 1.5 0 0 1 3 0v5M16 11V8a1.5 1.5 0 0 1 3 0v6c0 3.3-2.7 6.5-6 6.5h-1c-1.8 0-3.1-.7-4.2-1.9L4.6 14.6a1.5 1.5 0 0 1 2.2-2L9 15" />
    </>,
  ),
};
