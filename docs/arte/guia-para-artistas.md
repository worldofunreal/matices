# Guía para artistas

Qué necesita el desarrollo de Dayana y Omar, en qué orden y cómo entregarlo. Las medidas exactas están en `direccion-de-arte.md` (sección "Especificación técnica"); esta guía no las repite.

## Herramientas

| Para qué | Herramienta | Por qué |
| --- | --- | --- |
| Dibujar sprites, tiles, retratos | Aseprite (o LibreSprite, gratis) | Guarda capas y animaciones; exporta hojas de sprites con rejilla |
| Armar mapas | Tiled (gratis) | Ustedes arman y mueven los cuartos sin tocar código; el juego lee el mapa tal cual |

## Lo primero, antes de dibujar

1. **Paleta** `paleta.png`: máximo 48 colores, en cuadritos de 8 × 8. Todo el juego sale de aquí, incluidos los 8 tonos de piel.
2. **Hoja de escala**: un tile de piso, una puerta, una mesa y el personaje base parado, juntos. Con esto reviso que el niño se vea de 8 a 12 años frente a los muebles antes de que hagan todo lo demás.

## Orden de entrega

Cada bloque desbloquea un hito del prototipo (`../MVP.md`).

| # | Qué | Para qué hito |
| --- | --- | --- |
| 1 | Paleta y hoja de escala | Antes de todo |
| 2 | Cuerpo base del protagonista (un tono, sin ropa de color, caminando en 4 direcciones) | M1, mundo caminable |
| 3 | Tileset del interior de la casa y su mapa en Tiled | M1 |
| 4 | Tileset de la calle y de la escuela por fuera, con sus mapas | M1 |
| 5 | Capas del protagonista: 8 tonos, peinados, uniforme, ropa de casa, calzado | M2, personaje y casa |
| 6 | Figuras para armar la casa (retrato y sprite) | M2 |
| 7 | La Cuentera (retrato con 5 expresiones y sprite), libro, tarjetas, 7 iconos, 5 caritas, botones | M3, modo cuento |
| 8 | Parque y versiones de noche de la casa y la calle | M5, Día 1 completo |
| 9 | Lo demás de la lista de `direccion-de-arte.md` | Días 2 y 3 |

Mientras llega cada bloque, uso cuadros de colores en su lugar; el código no espera al arte.

## Cómo entregar cada cosa

**Sprites del personaje y figuras**
- Una hoja por pieza. Filas = dirección en este orden: abajo, izquierda, derecha, arriba. Columnas = cuadros: quieto, paso 1, 2, 3, 4.
- Capas del protagonista: cada capa en su propio PNG, mismo tamaño de lienzo y misma posición del cuerpo. Si se encima la ropa sobre el cuerpo, debe caer exacta sin moverla.
- El piso del personaje (los pies) siempre en la misma fila de píxeles en todos los cuadros.

**Tiles y mapas**
- Tileset en un solo PNG con rejilla de 32 × 32, sin espacios entre tiles.
- Mapa en Tiled con estas capas, con estos nombres: `piso`, `muros`, `muebles`, `encima` (lo que tapa al personaje, como el marco de la puerta), `choques` (dónde no se puede caminar), `objetos` (puntos que se pueden tocar, con un nombre cada uno, ej. `foto_escuela`).
- Puertas y entradas como objetos con el nombre del lugar al que llevan.

**Retratos y tarjetas**
- Un PNG por expresión, por ejemplo `cuentera_contento.png`.
- Tarjetas: solo la ilustración; el texto y el icono los pone el juego.

**Nombres de archivo**
- Minúsculas, sin acentos ni espacios, con guion bajo: `casa_interior.png`, `prota_cabello_03.png`, `abuela_sprite.png`.

**Dónde dejarlos**
- Archivos fuente (`.aseprite`, `.tmx`) en `arte/fuente/`; exportados (`.png`) en `arte/png/`. Si es más fácil, mándenlos por cualquier medio y yo los acomodo.

## Lo que reviso en cada entrega

- Que use solo colores de la paleta.
- Que el niño se vea de 8 a 12 años y el uniforme se lea mexicano.
- Que ningún tono de piel, casa o familia se vea más cuidado o más descuidado que otro.
- Que no haya golpes, sangre, armas, abuso ni muerte; "lastima" y "regaña" van con símbolos.
- Que ninguna palabra de `../LENGUAJE.md` aparezca en letreros o nombres.
- Que corra a 60 cuadros por segundo en la tableta de referencia.

Si algo no cuadra, les digo qué y por qué; la decisión creativa sigue siendo suya.
