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
  cerrar: svg(<path d="M6 6l12 12M18 6L6 18" />),
  borrar: svg(
    <>
      <path d="M5 15.5l8.2-8.7a1.8 1.8 0 0 1 2.6 0l2.7 2.8a1.8 1.8 0 0 1 0 2.6L12 20H8.2L5 16.8a1 1 0 0 1 0-1.3z" />
      <path d="M9 20h11" />
    </>,
  ),
  volver: svg(<path d="M15 5l-7 7 7 7" />),
  deshacer: svg(
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-4" />
    </>,
  ),
};
