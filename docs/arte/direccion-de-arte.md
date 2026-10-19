# Dirección de arte

Estilo propuesto por Dayana: pixel art cálido en vista de tres cuartos, ambientado en una colonia de una ciudad mexicana. Este documento fija el estilo, revisa las referencias, lista lo que falta producir y dice cómo entregarlo.

## Referencias

| Archivo | Qué muestra | Se usa para |
| --- | --- | --- |
| [escuela-plano.jpg](referencias/escuela-plano.jpg) | Plano de la primaria: entrada, patio, cancha, aulas 1 y 2, dirección, biblioteca, aula de cómputo, enfermería, baños, jardín, bodega | Distribución del mapa de la escuela |
| [escuela-exterior.jpg](referencias/escuela-exterior.jpg) | Fachada y patio de la primaria con asta, árbol y portón | Estilo de exteriores, paleta, nivel de detalle |
| [colonia.jpg](referencias/colonia.jpg) | Casas con teja, tinacos, papel picado, bugambilias, bardas de piedra, río y puente | Estilo de la colonia y la calle |
| [personaje-nino.jpg](referencias/personaje-nino.jpg) | Ilustración, retrato y sprites (4 direcciones, caminata) de un niño | Formato de la hoja de personaje |
| [personaje-nina.jpg](referencias/personaje-nina.jpg) | Lo mismo para una niña | Formato de la hoja de personaje |

## Lo que funciona y se mantiene

- Paleta cálida de tierra, teja, verde y rosa de bugambilia. Se siente segura y mexicana sin caer en estereotipo.
- Detalles cotidianos reconocibles: tinacos, papel picado, macetas, bardas de piedra, buzón, asta con bandera.
- Formato de hoja de personaje: ilustración completa, retrato y sprites de 4 direcciones con caminata. Es exactamente lo que el motor necesita.
- Escala de los sprites frente a los edificios.

## Ajustes necesarios (por el uso del juego)

| Ajuste | Por qué |
| --- | --- |
| **Personajes más jóvenes.** Las referencias se ven de 13 a 16 años (proporciones largas, rasgos de adolescente). El jugador tiene 8 a 12. Bajar a 3 o 4 cabezas de alto en la ilustración, cara más redonda. | El niño tiene que reconocerse en su personaje |
| **Uniforme mexicano genérico.** El suéter con cuello, mocasines y falda corta plisada se leen como uniforme japonés o inglés. Usar suéter liso (color a elegir), playera blanca tipo polo, pantalón o falda a la rodilla con short, tenis. | Identificación y ropa adecuada para la edad |
| **Personaje por capas.** Las referencias son personajes cerrados. La creación de personaje (GDD §6) necesita sprites armados por capas: cuerpo, tono de piel, cabello, ropa, extras. | Sin capas no hay creación de personaje |
| **8 tonos de piel.** Ambas referencias son de piel clara. | La mayoría de los niños mexicanos no se verían representados |
| **Composición horizontal.** Las referencias son verticales; el juego corre en tabletas y computadoras en horizontal. | Formato de pantalla |
| **Tiles, no pinturas.** Las referencias son imágenes completas. El juego necesita mosaicos repetibles (tilesets) con el mismo estilo. | Así se arman mapas y se ahorra memoria en tabletas baratas |
| **Consistencia.** Las referencias parecen generadas por IA (detalles que cambian entre imágenes, etiquetas repetidas en el plano). Sirven como guía; el arte final debe salir de un mismo tileset y una misma paleta. | Coherencia visual y derechos claros sobre el arte |

## Especificación técnica

| Elemento | Medida |
| --- | --- |
| Resolución base | 640 × 360, escalado en enteros (×2 = 1280 × 720, ×3 = 1920 × 1080) |
| Tile | 32 × 32 |
| Sprite de personaje | 32 × 48; 4 direcciones; quieto (1 cuadro) y caminata (4 cuadros) por dirección |
| Capas de sprite | cuerpo/piel, ropa inferior, ropa superior, calzado, cabello, extras; mismo lienzo y misma posición |
| Retrato | 96 × 96; expresiones: contento, neutral, triste, enojado, asustado |
| Tarjeta de opción | 128 × 160; ilustración arriba, icono de forma de responder abajo |
| Paleta | Un máximo de 48 colores para todo el juego, definidos en `paleta.png` (pendiente) |
| Noche | Capa multiplicada azul + luces cálidas en ventanas; nunca negro total |
| Exportación | PNG sin compresión con pérdida; hojas de sprites con rejilla fija |

## Lo que falta producir

### Mapas
- [ ] Interior de la casa en corte: sala-comedor, cocina, 2 recámaras, baño, patio con tinaco y lavadero. **Es el lugar más importante del juego** y no tiene referencia.
- [ ] Parque con juegos, árbol grande y bancas.
- [ ] Tiendita (exterior e interior).
- [ ] Biblioteca de la colonia (casa de La Cuentera).
- [ ] Interiores de la escuela en tiles: aula, biblioteca escolar, patio, cancha.
- [ ] Versiones de noche de la casa y la calle.

### Personajes (hoja completa: ilustración, retrato con 5 expresiones, sprites)
- [ ] Protagonista por capas (cuerpo niña, niño y neutro; 8 tonos; 10 peinados; ropa).
- [ ] Familia para "armar la casa": abuela, abuelo, mamá, papá, tía, tío, madrastra, padrastro, hermano/a mayor, hermano/a menor, bebé, primo/a, otra persona adulta, perro, gato. Cada adulto en al menos 3 tonos de piel.
- [ ] La Cuentera.
- [ ] Gemelos Tito y Tita (dos gatitos idénticos salvo el color del moño).
- [ ] Lucía, Nico, Clara, Don Chuy, compañeros genéricos (4), vecinos genéricos (4).

### Interfaz
- [ ] Libro de La Cuentera (marco de los sucesos).
- [ ] Tarjetas de opción y los 7 iconos de forma de responder (cuida, no hace nada, regaña, lastima, se va, lo resuelve solo, otra cosa). El icono de "lastima" no muestra violencia: una nube oscura.
- [ ] Cinco caritas.
- [ ] Iconos del panel cuerpo / pensamiento / entorno (unos 12 por grupo).
- [ ] Botones: Mi libro, Quiero hablar con alguien, Ahora no, Volver a escuchar, opciones.
- [ ] Escena para describir: ilustración de una niña o niño en la ventana, de noche, con dos platos servidos en la mesa.

## Orden de entrega

Cada bloque desbloquea un hito de `../MVP.md`. Mientras no llega, el juego usa cuadros de colores en su lugar.

| # | Qué | Hito |
| --- | --- | --- |
| 1 | Paleta (`paleta.png`, cuadritos de 8 × 8) y hoja de escala: piso, puerta, mesa y el niño parado, juntos | Antes de todo |
| 2 | Cuerpo base del protagonista caminando en 4 direcciones | M1 |
| 3 | Interior de la casa | M1 |
| 4 | Calle y escuela por fuera | M1 |
| 5 | Capas del protagonista: tonos, peinados, ropa, calzado | M2 |
| 6 | Figuras para armar la casa | M2 |
| 7 | La Cuentera, libro, tarjetas, iconos, caritas, botones | M3 |
| 8 | Parque y versiones de noche | M5 |
| 9 | Lo demás de "Lo que falta producir" | Días 2 y 3 |

## Cómo entregarlo

Solo imágenes PNG con fondo transparente; recortes, hojas de sprites, mapas y zonas por donde no se camina los arma el desarrollo.

- **Lugares:** una imagen del cuarto o la calle vacíos (piso y muros) y, aparte, cada mueble u objeto en su propio PNG. Así el personaje puede pasar detrás de una mesa o un árbol.
- **Personajes:** cada cuadro de la caminata en su propio PNG, o todos en una sola imagen en fila; mismo tamaño de lienzo y los pies a la misma altura en todos.
- **Capas del protagonista:** cada pieza (cuerpo, cabello, ropa, calzado) en su PNG, dibujada sobre el mismo lienzo y en la misma posición que el cuerpo base.
- **Retratos:** un PNG por expresión.
- **Tarjetas:** solo la ilustración; el texto y el icono los pone el juego.
- **Nombres:** minúsculas, sin acentos ni espacios: `casa_cocina.png`, `mesa_comedor.png`, `cuentera_triste.png`.
- Si el arte sale de otra herramienta o de una IA a otro tamaño, se entrega así; el desarrollo lo ajusta a la rejilla y la paleta, y avisa si algo se pierde al ajustarlo.

## Qué se revisa en cada entrega

- Solo colores de la paleta.
- El niño se ve de 8 a 12 años y el uniforme se lee mexicano.
- Ningún tono de piel, casa o familia se ve más cuidado o descuidado que otro.
- Las reglas de contenido visual de abajo y las palabras de `../LENGUAJE.md` en letreros y nombres.

## Reglas de contenido visual

Ninguna imagen muestra golpes, sangre, armas, abuso ni muerte. "Lastima" y "regaña" se representan con símbolos (nube, rayo pequeño), nunca con la acción.
