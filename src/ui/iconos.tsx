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
};
