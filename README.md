# Matices

Videojuego de pixel art para niñas y niños de 8 a 12 años, pensado para México, que registra sus elecciones en situaciones cotidianas para que un psicólogo las lea.

**El juego recoge. El psicólogo interpreta. El juego no diagnostica.**

> Estado: esqueleto del juego (casa provisional caminable, sin arte). Repositorio privado. Versión en línea: https://matices.online

## Correr el juego

```bash
npm install
npm run dev
```

Abre la dirección que aparece. Si se agrega una pieza a `public/assets/manifiesto.yaml`, `npm run provisionales` le crea su provisional. Con `?debug` al final se ven los choques y los objetos del mapa. `npm run build` deja el juego listo en `dist/` y se detiene si algún contenido no es válido.

`npm run dev` levanta también el servidor de eventos en local. El tablero está en `/admin.html` (clave local: `admin`). `npm run simular` le manda 20 participantes inventados, `npm test` prueba sus cálculos y `?nuevo` empieza un participante nuevo en el mismo aparato. En línea, el tablero es `matices.online/admin`.

## Cómo se juega, en corto

El niño crea a su personaje, arma su casa con las personas que quiera y recorre su colonia, la escuela y el parque durante tres días del juego, que se pueden jugar en las sesiones que haga falta. Ahí pasan cosas de todos los días: el perro lo sigue, un adulto le dice que no corra, tiene hambre, hay tarea. El niño hace lo que quiera; el juego registra qué hizo, qué contestó y si después hizo lo que dijo. Nada detiene el juego para preguntar y ninguna respuesta es la correcta.

## Documentos

| Documento | Para qué |
| --- | --- |
| [docs/GDD.md](docs/GDD.md) | Diseño del juego: mundo, personajes, mecánicas, interfaz, audio |
| [docs/PRD.md](docs/PRD.md) | Requisitos del producto: usuarios, contexto de uso por confirmar, objetivos, requisitos, riesgos |
| [docs/MVP.md](docs/MVP.md) | Hitos para tener el juego completo con arte provisional y criterios para probarlo |
| [docs/arte/direccion-de-arte.md](docs/arte/direccion-de-arte.md) | Estilo visual, ajustes, especificaciones, lista de arte, orden y forma de entrega |
| [docs/tecnico/arquitectura.md](docs/tecnico/arquitectura.md) | Cómo funciona por dentro: el juego en el aparato, el servidor y el tablero |
| [docs/clinico/marco-clinico.md](docs/clinico/marco-clinico.md) | Áreas que observa y de qué herramienta clínica sale cada mecánica |
| [docs/clinico/codigos-y-eventos.md](docs/clinico/codigos-y-eventos.md) | Códigos de cada opción y lo que se registra |
| [docs/clinico/reporte.md](docs/clinico/reporte.md) | Reporte para el psicólogo y reglas de revisión |
| [Acuerdo de confidencialidad (Word)](docs/legal/acuerdo-de-confidencialidad.docx) | Plantilla editable para firmar antes de dar acceso; [texto fuente](docs/legal/acuerdo-de-confidencialidad.md) |
| [docs/investigacion/plan-piloto.md](docs/investigacion/plan-piloto.md) | Fases del piloto y qué se mide |
| [docs/LENGUAJE.md](docs/LENGUAJE.md) | Palabras que se usan y palabras que no, en el juego y en los documentos |
| [docs/DECISIONES.md](docs/DECISIONES.md) | Cambios frente al GDD original y por qué |
| [docs/PENDIENTES.md](docs/PENDIENTES.md) | Lo que falta decidir: clínico, creativo, técnico |
| [docs/REFERENCIAS.md](docs/REFERENCIAS.md) | Fuentes consultadas |
| [contenido/](contenido/) | Texto de las situaciones, las figuras y los textos fijos |

## Autoría y revisión

- Autores intelectuales: Dayana Analy Pacheco Bañuelos y Omar Hernández Salmerón.
- Apoyo de herramientas de IA: documentación y diseño.
- Revisión clínica: psicólogos del conglomerado (pendiente).

Licencia: [privativa provisional](LICENSE.md). No es una licencia de código abierto.
