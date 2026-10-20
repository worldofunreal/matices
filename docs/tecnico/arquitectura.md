# Arquitectura técnica

## Decisión

El juego funciona completo dentro de cada aparato, sin red. Guarda sus eventos cifrados en el aparato y los envía a un servidor propio en IONOS cuando hay red; sin red esperan. El tablero (`matices.online/admin`) los muestra con una cuenta de admin.

```
 Juego en el aparato (teléfono, tableta o computadora)
   ├─ Todo el contenido incluido; no necesita red para jugar
   ├─ Eventos guardados cifrados en el aparato
   └─ Cuando hay red, los envía a /api/eventos ──► Servidor en IONOS (Node + SQLite)
                                                     └─ Tablero /admin (cuenta de admin)
```

## Componentes

| Componente | Tecnología | Por qué |
| --- | --- | --- |
| Interfaz | React + TypeScript + CSS, con Vite | Letras nítidas, botones de verdad, animaciones suaves y acomodo propio para vertical y horizontal |
| Mundo | TypeScript puro sobre un lienzo (canvas) | Dibuja fondo, objetos y personajes en pixel art ampliado en enteros; los botones del mundo van encima en HTML |
| Empaque | Web: aplicación instalable desde el navegador. Android e iOS: Capacitor. Windows, macOS y Linux: Tauri | El mismo juego en las seis plataformas; se instala una vez y luego no necesita red. iOS y macOS se compilan en una Mac con Xcode y cuenta de Apple |
| Contenido | Archivos YAML en `contenido/`, validados con un esquema al compilar | Los psicólogos pueden revisar texto legible; una opción sin código rompe la compilación |
| Guardado en el aparato | Base de datos del navegador, cifrada | Sobrevive a cerrar la app y a quedarse sin batería |
| Mapas | Tiled, armados por el desarrollo a partir de las imágenes de arte | El arte llega como PNG sueltos (`../arte/direccion-de-arte.md`); recortes, mapas y choques no los hace el equipo de arte |
| Servidor | Un archivo, `servidor/servidor.ts`, en Node 24 con `node:http` y `node:sqlite`; sin librerías | Node ya está en IONOS y corre TypeScript directo; volver a enviar un evento no lo duplica |
| Tablero | Segunda página del mismo proyecto (`admin.html`, `src/admin/`) | Reusa el contenido, los estilos y el pixel art del juego |

## Flujo de datos

1. Cada aparato es un participante anónimo con un código al azar. `matices.online/?nuevo` empieza otro en el mismo aparato.
2. El juego guarda cada evento cifrado en el aparato. Se puede pausar y retomar en cualquier momento.
3. Cada 10 segundos, al volver la red y al salir, envía los eventos que faltan. El servidor confirma y el aparato recuerda hasta dónde envió.
4. El tablero arma el perfil de cada participante y la vista de todos.
5. Más adelante, un token liga la sesión con la identidad del niño.

## Eventos

Esquema en `docs/clinico/codigos-y-eventos.md`. Cada evento lleva la versión del contenido, así un reporte siempre sabe qué texto vio el niño.

## Seguridad

- Participantes anónimos; el nombre del personaje y los nombres que el niño pone a su familia nunca salen del aparato.
- HTTPS entre el aparato y el servidor.
- El tablero pide la clave de admin (guardada con scrypt en el servidor) y usa una cookie firmada.
- Sin publicidad.

## Código

| Carpeta | Qué hay |
| --- | --- |
| `src/` | El juego: `pantallas/` (cada pantalla en React), `ui/` (piezas de interfaz y estilos), `lienzo/` (pixel art: capas y colores), `mundo/` (el mapa: muros, puertas, personas, rutas y el personaje que camina) |
| `herramientas/contenido.ts` | Lee `contenido/`, lo revisa contra los códigos de `docs/clinico/codigos-y-eventos.md` y las áreas de `docs/clinico/marco-clinico.md`, y detiene la compilación si algo no cuadra |
| `public/mapas/` | Mapas en formato Tiled: `muros` (choques) y `objetos` (puntos); el dibujo del lugar es su fondo en `public/assets/lugares/` |
| `public/assets/` | Todo el arte; `manifiesto.yaml` lista cada pieza con su medida. La compilación se detiene si falta una o no cuadra su medida |
| `herramientas/provisionales.ts` | Crea un provisional por cada pieza sin archivo (`npm run provisionales`); nunca toca el arte final |
| `src/datos/` | Guardado de la partida, registro de eventos cifrado, envío al servidor y eventos de producto |
| `servidor/` | El servidor de eventos y del tablero |
| `src/admin/` | El tablero |

## Publicación de prueba

Cada cambio en `main` se publica solo en https://matices.online (`.github/workflows/deploy.yml`): GitHub compila el juego, lo sube al servidor de IONOS en una carpeta nueva, cambia el sitio a esa carpeta de golpe, conserva las 5 versiones anteriores, instala el servidor (`infra/rc.d/matices`, puerto local 3200, datos en `/var/db/matices/`) y revisa el sitio en vivo. La configuración del servidor está en `infra/nginx/matices.online.conf`. Cloudflare va enfrente.

## Pendientes técnicos

- Probar el juego en la tableta de referencia (2 GB de RAM) antes de fijar efectos de ambiente.
