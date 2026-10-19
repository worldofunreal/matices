# Arquitectura técnica

## Decisión

El juego es una aplicación que funciona completa dentro de cada aparato, sin red. Guarda los eventos cifrados en el propio aparato. Cómo salen los datos hacia el psicólogo se elige después, según lo que apruebe cada institución (`../PRD.md`, contexto de uso); el juego no cambia.

```
 Juego en el aparato (tableta Android, Chromebook o PC)
   ├─ Todo el contenido incluido; no necesita red para jugar
   ├─ Eventos guardados cifrados en el aparato
   └─ Salida de datos, una de estas:
        A. Archivo cifrado que el psicólogo descarga a su computadora (base, siempre disponible)
        B. Estación del psicólogo en la red local: avisos en vivo (opcional)
        C. Servidor de la institución por internet (opcional)
```

Por qué así: no sabemos todavía si habrá grupo, red, internet ni cuántas sesiones. Un juego que depende de la red falla en el lugar donde no la hay; uno que funciona solo sirve en todos.

## Componentes

| Componente | Tecnología | Por qué |
| --- | --- | --- |
| Interfaz | React + TypeScript + CSS, con Vite | Letras nítidas, botones de verdad, animaciones suaves y acomodo propio para vertical y horizontal |
| Mundo | TypeScript puro sobre un lienzo (canvas) | Dibuja fondo, objetos y personajes en pixel art ampliado en enteros; los botones del mundo van encima en HTML |
| Empaque | Web: aplicación instalable desde el navegador. Android e iOS: Capacitor. Windows, macOS y Linux: Tauri | El mismo juego en las seis plataformas; se instala una vez y luego no necesita red. iOS y macOS se compilan en una Mac con Xcode y cuenta de Apple |
| Contenido | Archivos YAML en `contenido/`, validados con un esquema al compilar | Los psicólogos pueden revisar texto legible; una opción sin código rompe la compilación |
| Guardado en el aparato | Base de datos del navegador, cifrada | Sobrevive a cerrar la app y a quedarse sin batería |
| Mapas | Tiled, armados por el desarrollo a partir de las imágenes de arte | El arte llega como PNG sueltos (`../arte/direccion-de-arte.md`); recortes, mapas y choques no los hace el equipo de arte |
| Estación (opcional, modo B) | Un ejecutable en Rust (axum + SQLite cifrado con SQLCipher) | Se instala copiando un archivo |
| Servidor (opcional, modo C) | El mismo ejecutable en modo servidor | Una sola base de código |

## Flujo de datos

1. Un adulto abre el juego y escribe el código del niño (nunca su nombre).
2. El juego guarda cada evento cifrado en el aparato. Se puede pausar y retomar en cualquier momento.
3. Al terminar, los datos salen por el modo que use la institución (A, B o C). Al confirmarse la entrega, el aparato borra su copia.
4. El programa del psicólogo abre los datos, arma el reporte y aplica las reglas de revisión.
5. Analítica del equipo (PRD F16): los eventos técnicos y de uso esperan en el aparato y se envían solos cuando hay internet.

## Eventos

Esquema en `docs/clinico/codigos-y-eventos.md`. Cada evento lleva la versión del contenido, así un reporte siempre sabe qué texto vio el niño.

## Seguridad

- La lista código–nombre nunca está en el aparato del niño; la guarda el psicólogo, cifrada.
- Los aparatos borran nombres de figuras y dibujos al entregar los datos.
- Bitácora de accesos en el programa del psicólogo.
- Sin publicidad.

## Código

| Carpeta | Qué hay |
| --- | --- |
| `src/` | El juego: `pantallas/` (cada pantalla en React), `ui/` (piezas de interfaz y estilos), `lienzo/` (pixel art: capas, colores y el mapa) |
| `herramientas/contenido.ts` | Lee `contenido/`, lo revisa contra los códigos de `docs/clinico/codigos-y-eventos.md` y las áreas de `docs/clinico/marco-clinico.md`, y detiene la compilación si algo no cuadra |
| `public/mapas/` | Mapas en formato Tiled: `muros` (choques) y `objetos` (puntos); el dibujo del lugar es su fondo en `public/assets/lugares/` |
| `public/assets/` | Todo el arte; `manifiesto.yaml` lista cada pieza con su medida. La compilación se detiene si falta una o no cuadra su medida |
| `herramientas/provisionales.ts` | Crea un provisional por cada pieza sin archivo (`npm run provisionales`); nunca toca el arte final |
| `src/datos/` | Guardado de la partida, registro de eventos cifrado y eventos de producto |

## Publicación de prueba

Cada cambio en `main` se publica solo en https://matices.online (`.github/workflows/deploy.yml`): GitHub compila el juego, lo sube al servidor de IONOS en una carpeta nueva, cambia el sitio a esa carpeta de golpe, conserva las 5 versiones anteriores y revisa el sitio en vivo. La configuración del servidor está en `infra/nginx/matices.online.conf`. Cloudflare va enfrente.

## Pendientes técnicos

- Probar el juego en la tableta de referencia (2 GB de RAM) antes de fijar efectos de ambiente.
- Cómo se entrega el archivo cifrado en el modo A (cable, memoria USB o código QR) según los aparatos que haya.
