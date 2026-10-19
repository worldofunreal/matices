# Dirección de arte

Estilo: pixel art en vista de tres cuartos, ambientado en una colonia urbana de una ciudad mexicana, a partir del concept art de Dayana y Omar. Este documento fija el estilo, revisa las referencias, lista lo que falta producir y dice cómo entregarlo.

## Referencias

| Archivo | Qué muestra | Se usa para |
| --- | --- | --- |
| [escuela-exterior.jpg](referencias/escuela-exterior.jpg) | Escuela de dos pisos con explanada, jardineras, cancha techada al lado, portón y banqueta | Estilo de exteriores, paleta, nivel de detalle |
| [escuela-planos.jpg](referencias/escuela-planos.jpg) | Planta baja (entrada, dirección, aulas, gimnasio con cancha) y planta alta (aulas, sala de cómputo) | Distribución del mapa de la escuela |
| [parque-exterior.jpg](referencias/parque-exterior.jpg) | Parque con lago, isla, muelle, kiosko, fuente, juegos y andadores | Estilo del parque |
| [parque-plano.jpg](referencias/parque-plano.jpg) | Entrada principal, plaza central con fuente, lago, mirador, área infantil, área de ejercicio | Distribución del mapa del parque |
| [biblioteca-exterior.jpg](referencias/biblioteca-exterior.jpg) | Biblioteca moderna de ladrillo y vidrio, explanada con bancas, bicicletero | Estilo de la biblioteca |
| [biblioteca-planos.jpg](referencias/biblioteca-planos.jpg) | Planta baja (estantes, mostrador, mesas, baños) y planta alta (mesas de lectura, salas) | Distribución del mapa de la biblioteca |
| [conjunto-urbano.jpg](referencias/conjunto-urbano.jpg) | Escuela, parque y biblioteca juntos, con sus planos | Escala relativa entre lugares |
| [personaje-nino.jpg](referencias/personaje-nino.jpg) | Ilustración, retrato y sprites (4 direcciones, caminata) de un niño | Formato de la hoja de personaje |
| [personaje-nina.jpg](referencias/personaje-nina.jpg) | Lo mismo para una niña | Formato de la hoja de personaje |

## Lo que funciona y se mantiene

- Ciudad ordenada y tranquila: banquetas, árboles, bancas, luz de día suave. Se siente segura.
- Formato de hoja de personaje: ilustración completa, retrato y sprites de 4 direcciones con caminata. Es exactamente lo que el motor necesita.
- Escala de los sprites frente a los edificios.

## Ajustes necesarios (por el uso del juego)

| Ajuste | Por qué |
| --- | --- |
| **Personajes más jóvenes.** Las referencias se ven de 13 a 16 años (proporciones largas, rasgos de adolescente). El jugador tiene 8 a 12. Bajar a 3 o 4 cabezas de alto en la ilustración, cara más redonda. | El niño tiene que reconocerse en su personaje |
| **Uniforme mexicano genérico.** El suéter con cuello, mocasines y falda corta plisada se leen como uniforme japonés o inglés. Usar suéter liso (color a elegir), playera blanca tipo polo, pantalón o falda a la rodilla con short, tenis. | Identificación y ropa adecuada para la edad |
| **Personaje por capas.** Las referencias son personajes cerrados. La creación de personaje (GDD §6) necesita sprites armados por capas: cuerpo, tono de piel, cabello, ropa, extras. | Sin capas no hay creación de personaje |
| **Detalles mexicanos en lo urbano.** Las referencias urbanas se ven de cualquier país. Agregar: tinacos en las azoteas, asta con bandera en el patio de la escuela, tiendita en la esquina, letreros en español, puestos en la banqueta. | El niño tiene que reconocer su ciudad |
| **8 tonos de piel.** Ambas referencias son de piel clara. | La mayoría de los niños mexicanos no se verían representados |
| **Composición para cualquier pantalla.** El juego llena la pantalla en horizontal y en vertical; un lugar no puede depender de verse completo en un solo encuadre. | Se juega en teléfonos, tabletas y computadoras, en cualquier orientación |
| **Piezas separadas, no una pintura cerrada.** Las referencias son imágenes completas. El juego necesita el lugar vacío (piso y muros) y cada mueble u objeto aparte (ver "Cómo entregarlo"). | El personaje pasa detrás de los muebles y los choques salen de cada pieza |
| **Consistencia.** Las referencias parecen generadas por IA (detalles que cambian entre imágenes, etiquetas repetidas en el plano). Sirven como guía; el arte final debe salir de un mismo tileset y una misma paleta. | Coherencia visual y derechos claros sobre el arte |

## Especificación técnica

| Elemento | Medida |
| --- | --- |
| Pantalla | El mundo llena la pantalla en cualquier orientación, en pixel art ampliado en enteros. Menús, libro, tarjetas y botones son interfaz en HTML y CSS, no pixel art: marcos, tarjetas y botones no se dibujan |
| Tile | 32 × 32 |
| Sprite de personaje | 32 × 48; 4 direcciones; quieto (1 cuadro) y caminata (4 cuadros) por dirección |
| Capas de sprite | cuerpo/piel, ropa inferior, ropa superior, calzado, cabello, extras; mismo lienzo y misma posición |
| Retrato | 96 × 96; expresiones: contento, neutral, triste, enojado, asustado |
| Paleta | Un máximo de 48 colores para todo el juego, definidos en `paleta.png` (pendiente) |
| Noche | Capa multiplicada azul + luces cálidas en ventanas; nunca negro total |
| Exportación | PNG sin compresión con pérdida; hojas de sprites con rejilla fija |

## Lo que falta producir

Toda pieza del juego está en `public/assets/manifiesto.yaml`, con su archivo, su medida y qué es. Hoy cada una tiene un provisional. El lugar más importante es el interior de la casa (`lugares/casa/fondo.png`).

## Orden de entrega

Cualquier pieza se puede entregar en cualquier momento: el juego ya funciona con provisionales. Este orden sigue los hitos de `../MVP.md`.

| # | Qué | Hito |
| --- | --- | --- |
| 1 | Paleta (`paleta.png`, cuadritos de 8 × 8) y hoja de escala: piso, puerta, mesa y el niño parado, juntos | Antes de todo |
| 2 | Protagonista: cuerpos, cabellos, ropa, extras y sus retratos (carpeta `personaje/`) | H2 |
| 3 | Interior de la casa y sus muebles; figuras para armar la casa (`lugares/casa/`, `figuras/`) | H3 |
| 4 | Calle, escuela, parque, tiendita, biblioteca y sus objetos; vecinos y personajes fijos | H4 |
| 5 | La Cuentera, marcos, tarjetas, botones, iconos de códigos, caritas, panel | H5 |
| 6 | Tito y Tita, escena para describir, vela | H6 |

## Cómo entregarlo

- **Se reemplaza el archivo provisional** en `public/assets/` por el arte final, con el mismo nombre y la misma medida. No se cambia nada más. Si la medida no cuadra, el juego no compila y dice cuál.
- PNG con fondo transparente. Recortes, mapas y zonas por donde no se camina los arma el desarrollo.
- **Lugares:** el fondo es el lugar vacío (piso y muros); cada mueble u objeto va en su propio PNG. Así el personaje puede pasar detrás de una mesa o un árbol.
- **Hojas de personaje:** 5 columnas (quieto, paso 1 a 4) por 4 filas (abajo, izquierda, derecha, arriba), cuadros de 32 × 48, pies a la misma altura en todos.
- **Capas del protagonista:** cada pieza (cuerpo, cabello, ropa, calzado, extras) en su hoja, dibujada en la misma posición que el cuerpo base.
- **Piel y cabello:** se dibujan con los tres colores clave de `manifiesto.yaml` (claro, medio, sombra). El juego los cambia por los 8 tonos de piel y los 6 colores de cabello; no se dibuja una versión por tono.
- **Retratos:** un PNG por expresión cuando la pieza las tiene (`_contento`, `_neutral`, `_triste`, `_enojado`, `_asustado`).
- **Marcos:** 48 × 48 con esquinas de 16 × 16; el juego estira el centro y los bordes.
- **Tarjetas:** solo el marco; el juego pone la ilustración, el icono y el texto.
- **Voz:** una grabación `public/assets/voz/<línea>.mp3` reemplaza a la voz del navegador para esa línea.
- Si el arte sale de otra herramienta o de una IA a otro tamaño, se entrega así y el desarrollo lo ajusta a la medida y la paleta, avisando si algo se pierde.

## Qué se revisa en cada entrega

- Solo colores de la paleta.
- El niño se ve de 8 a 12 años y el uniforme se lee mexicano.
- Ningún tono de piel, casa o familia se ve más cuidado o descuidado que otro.
- Las reglas de contenido visual de abajo y las palabras de `../LENGUAJE.md` en letreros y nombres.

## Reglas de contenido visual

Ninguna imagen muestra golpes, sangre, armas, abuso ni muerte. "Lastima" y "regaña" se representan con símbolos (nube, rayo pequeño), nunca con la acción.
