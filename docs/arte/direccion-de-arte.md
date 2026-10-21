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
| [ancla-nina.png](referencias/ancla-nina.png) | La niña aprobada, de frente, en el estilo del juego | Estilo, cara y proporciones de todos los personajes |
| [base-nina.png](referencias/base-nina.png) | La misma niña sin cabello, con playera y short gris claro, descalza, fondo magenta | Base de la que salen todas las capas del protagonista |

## Lo que funciona y se mantiene

- Ciudad ordenada y tranquila: banquetas, árboles, bancas, luz de día suave. Se siente segura.
- Formato de hoja de personaje: ilustración completa, retrato y sprites por dirección con caminata. El motor usa 3 (la derecha es la izquierda volteada).
- Escala de los sprites frente a los edificios.

## Ajustes necesarios (por el uso del juego)

| Ajuste | Por qué |
| --- | --- |
| **Personajes más jóvenes.** Las referencias se ven de 13 a 16 años (proporciones largas, rasgos de adolescente). El jugador tiene 8 a 12. Bajar a 3 o 4 cabezas de alto en la ilustración, cara más redonda. | El niño tiene que reconocerse en su personaje |
| **Uniforme mexicano genérico.** El suéter con cuello, mocasines y falda corta plisada se leen como uniforme japonés o inglés. Usar suéter liso oscuro, playera blanca tipo polo, pantalón o falda gris a la rodilla con short, tenis. | Identificación y ropa adecuada para la edad |
| **Personaje por capas.** Las referencias son personajes cerrados. La creación de personaje (GDD §6) necesita sprites armados por capas: cuerpo, tono de piel, cabello, ropa, extras. | Sin capas no hay creación de personaje |
| **Detalles mexicanos en lo urbano.** Las referencias urbanas se ven de cualquier país. Agregar: tinacos en las azoteas, asta con bandera en el patio de la escuela, tiendita en la esquina, letreros en español, puestos en la banqueta. | El niño tiene que reconocer su ciudad |
| **8 tonos de piel.** Ambas referencias son de piel clara. | La mayoría de los niños mexicanos no se verían representados |
| **Composición para cualquier pantalla.** El juego llena la pantalla en horizontal y en vertical; un lugar no puede depender de verse completo en un solo encuadre. | Se juega en teléfonos, tabletas y computadoras, en cualquier orientación |
| **Piezas separadas, no una pintura cerrada.** Las referencias son imágenes completas. El juego necesita el lugar vacío (piso y muros) y cada mueble u objeto aparte (ver "Cómo entregarlo"). | El personaje pasa detrás de los muebles y los choques salen de cada pieza |
| **Consistencia.** Las referencias parecen generadas por IA (detalles que cambian entre imágenes, etiquetas repetidas en el plano). Sirven como guía; el arte final debe salir de un mismo tileset y una misma paleta. | Coherencia visual y derechos claros sobre el arte |

## Especificación técnica

| Elemento | Medida |
| --- | --- |
| Pantalla | El mundo llena la pantalla en cualquier orientación, en pixel art ampliado en enteros. Menús, libro, letreros, globos y botones son interfaz en HTML y CSS, no pixel art: marcos, tarjetas y botones no se dibujan |
| Tile | 32 × 32 |
| Sprite de personaje | 48 × 64 (el cuerpo mide unos 27 × 60 por dentro; el resto del ancho es para cabellos abultados, como el afro o las coletas, que nunca deben tocar la orilla). El protagonista: 3 direcciones (abajo, izquierda, arriba; la derecha es la izquierda volteada), quieto (1 cuadro) y caminata (4 cuadros) por dirección. No hay diagonales: el personaje camina en 4 direcciones. Personajes fijos: un solo cuadro, de pie y de frente. Figuras de la casa: un solo cuadro de 48 × 80, de pie y de frente, con los pies abajo y la altura de su edad (un adulto es más alto que el niño); el perro, además, su caminata |
| Capas de sprite | cuerpo/piel, ropa inferior, ropa superior, calzado, cabello, extras; mismo lienzo y misma posición |
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
| 2 | Protagonista: cuerpos, cabellos, ropa y extras (carpeta `personaje/`) | H2 |
| 3 | Interior de la casa y sus muebles; figuras para armar la casa (`lugares/casa/`, `figuras/`) | H3 |
| 4 | Calle, escuela, parque, tiendita, biblioteca y sus objetos; vecinos y personajes fijos | H4 |
| 5 | Lo que pidan las situaciones de GDD §9 (la caminata del perro ya está) | M4 |

## Cómo entregarlo

- **Se reemplaza el archivo provisional** en `public/assets/` por el arte final, con el mismo nombre y la misma medida. No se cambia nada más. Si la medida no cuadra, el juego no compila y dice cuál.
- PNG con fondo transparente. Recortes, mapas y zonas por donde no se camina los arma el desarrollo.
- **Lugares:** el fondo es el lugar vacío (piso y muros); cada mueble u objeto va en su propio PNG. Así el personaje puede pasar detrás de una mesa o un árbol.
- **Hojas del protagonista:** 5 columnas (quieto, paso 1 a 4) por 3 filas (abajo, izquierda, arriba), cuadros de 48 × 64, pies a la misma altura en todos. Los personajes fijos son un solo cuadro de 48 × 64; las figuras de la casa, uno de 48 × 80.
- **Capas del protagonista:** cada pieza (cuerpo, cabello, ropa, calzado, extras) en su hoja, dibujada en la misma posición que el cuerpo base.
- **Piel, cabello, ropa, tenis y extras:** se dibujan una sola vez. El juego los cambia a los colores de su rampa en `manifiesto.yaml` conservando las sombras; no se dibuja una versión por color. A mano se usan los colores clave de su rampa; con generador, la regla de color de abajo y `acomodar.ts` los pasa a la clave.
- **Fondos de lugares:** el provisional es el plano exacto (muros, puertas y dónde va cada mueble). El fondo final respeta ese plano, porque los choques y las puertas del juego salen de él.
- **Voz:** una grabación `public/assets/voz/<línea>.mp3` reemplaza a la voz del navegador para esa línea.
- Si el arte sale de otra herramienta o de una IA a otro tamaño, se entrega así y el desarrollo lo ajusta a la medida y la paleta, avisando si algo se pierde.

## Cómo pedirlo a un generador

El desarrollo recibe la imagen tal como sale del generador: la endereza a la rejilla de pixeles, quita el fondo, la ajusta a la medida y a la paleta, y la prueba en el juego. Los prompts van en inglés porque los generadores rinden mejor así.

Con el protagonista esto ya es automático: `herramientas/generar.ts` le pide cada capa a Codex (con la cuenta de ChatGPT del owner), revisa que el cuerpo no se haya movido y repite si falla; `herramientas/acomodar.ts` la convierte en la hoja del juego. Al owner solo le llega la animación final para revisarla.

**Regla de color.** Lo que el juego recolorea se pide en un color que no se confunda con nada:
- Fondo: magenta plano `#FF00FF`, en todas las piezas.
- Cabello del protagonista y mochila: verde brillante, con sus sombras y brillos en verdes. Solo eso es verde.
- Piel del protagonista y de las figuras de la casa: tono claro natural. En esas piezas, ninguna ropa ni calzado en beige, café, naranja o rosa, para no confundirse con la piel.
- Todo lo demás, en sus colores reales.

**Plantillas** (en `plantillas/`, se suben junto con el prompt):
- [figura-de-pie.png](plantillas/figura-de-pie.png): un solo cuadro, para personajes fijos.
- Lugares: el provisional de `public/assets/lugares/<lugar>/fondo.png` es el plano. Los bloques oscuros sueltos dentro de los cuartos marcan dónde va un mueble y en el fondo se pintan como piso.

**Bloque de estilo** (va al inicio de todos los prompts de personajes):

> Chibi pixel art for a cozy top-down 3/4 view RPG set in a Mexican city neighborhood. Chibi proportions, about 3 heads tall, round face, big dark eyes, soft warm shading, clean dark-brown 1-pixel outline, crisp hard-edged square pixels, no anti-aliasing, no blur, no noise. Each art pixel is an exact 8×8 block. Flat solid magenta background (#FF00FF), fully opaque, never transparent, no ground shadow, no text, no labels, no grid lines, no border.

**Protagonista.** Todo sale de editar la misma imagen, paso a paso, para que cabeza, cuerpo y pies queden siempre en el mismo lugar. Se pide una dirección por imagen: al generador le cuesta menos que una hoja completa. Los dos cuerpos comparten cabeza, silueta, estatura y pose, para que cabellos, ropa y extras sirvan en los dos.

1. Base de frente (hecha para la niña: `referencias/base-nina.png`).
2. Los pasos de cada dirección. Cada prompt pide **una sola figura en una sola imagen**, editando la figura quieta, y dice qué es lo que se sube, qué se conserva y qué cambia. El generador no conoce el proyecto: cada prompt se entiende solo. Cada dirección necesita la figura quieta y dos pasos; el desarrollo arma la caminata (paso, quieto, otro paso, quieto). De frente y de espalda el segundo paso es el primero volteado.
   - Quieta de perfil o de espalda, subiendo la base de frente:
     > The attached image is a pixel art game character standing still, facing the viewer, on a flat magenta background. Create ONE new image, the same size as the attached image, showing ONLY ONE character: this same character standing still, now [turned to face the left side of the image, seen in profile / seen from behind, facing away from the viewer]. Not a sprite sheet, not several frames, not several characters. Keep identical: the head size and its position on the canvas, the body proportions, the skin color, the clothes, the pixel size, the dark outline, and the flat magenta background (#FF00FF, fully opaque). Arms down at the sides, feet together at the bottom. No text, no floor shadow, no extra objects.
   - Un paso, subiendo la figura quieta de esa dirección:
     > The attached image is a pixel art game character standing still, [facing the viewer / facing left in profile / seen from behind], on a flat magenta background. Create ONE new image, the same size as the attached image, showing ONLY ONE character: this same character in a single walking pose. Not a sprite sheet, not several frames, not several characters. Keep identical: the head (shape, size and position on the canvas), the face, the skin color, the clothes, the pixel size, the dark outline, and the flat magenta background (#FF00FF, fully opaque). Change only the legs and arms, to this pose: [POSE]. The head does not move and the feet stay at the bottom of the figure. No text, no floor shadow, no extra objects.

     [POSE] de frente: *the character walks straight toward the viewer and is seen from the front. Its left leg (on the right side of the image) steps forward: the knee slightly bent and that foot a little lower in the image than the other foot. The other leg is straight. The arm on the other side swings slightly forward. The body and face keep facing the viewer; the legs do not stride sideways.* De espalda: lo mismo con *walks straight away from the viewer and is seen from behind*, y el pie que avanza queda *a little higher*. De perfil: *the character walks toward the left side of the image: the front leg steps forward, the back leg pushes off behind, the arms swing opposite to the legs*; el segundo paso, con *the other leg in front*.
3. Cada capa (cabello, ropa, calzado, extras de `manifiesto.yaml`), editando cada figura de la base. Los prompts exactos están en `herramientas/generar.ts`.
   - Ropa y calzado: se editan la figura quieta y los pasos de cada dirección, porque siguen a brazos y piernas.
   - Cabello, lentes, aretes, gorra y mochila: solo la figura quieta de cada dirección. Al caminar la cabeza y los hombros no se mueven, así que el cabello y la mochila tampoco: los pasos usan exactamente la capa de la figura quieta. Así nunca cambia ni se corta de un cuadro a otro.
   - La cabeza entera (cara, ojos, orejas) también es la de la figura quieta en todos los cuadros de una dirección; solo cambia lo que está debajo del cuello.
   - Una capa nunca lleva piel: la piel siempre es la del cuerpo. De cabellos y mochila solo se toma lo verde y su contorno.
   - El niño sale del cuerpo de la niña: solo cambian cara, orejas y cejas, con la misma silueta (`generar.ts cuerpo_nina cuerpo_nino`). Se piden solo sus dos figuras quietas, de frente y de perfil; los pasos y la espalda son los de la niña, porque la cabeza de cada paso sale de la figura quieta. `acomodar.ts personaje/cuerpo_nino … --igual-a …/cuerpo_nina` lo encuadra igual que a ella, y así todas las capas le quedan. Mientras no esté, su provisional es una copia del cuerpo de la niña.

   Para cabellos y mochila se agrega: *The [hair / backpack] is bright green with darker green shadows and lighter green highlights; nothing else is green.* La ropa es la de la tabla de ajustes, pero el uniforme se pide en azul (suéter azul rey, pantalón o falda azul marino) para que se distinga de la ropa gris del cuerpo al recortarlo; `acomodar.ts` deja cada prenda, tenis y extra en los colores clave de su rampa (`manifiesto.yaml`), sin importar en qué color se dibujó; el juego los cambia por el color que elige el niño. Por eso cada pieza se dibuja una sola vez.

   El protagonista no tiene retrato: la creación muestra su cabeza con las mismas capas del sprite.

**Figuras de la casa** (abuelos, padres, tíos, hermanos, bebé, primos, otra persona, perro y gato): cada una es un dibujo propio, hecho a partir de la figura de frente de la niña o del niño, para que tenga el mismo estilo. `generar.ts figuras` pide cada una y `generar.ts --lista figuras` da la imagen que se sube, el prompt y dónde se guarda. Quién es cada una, de qué cuerpo sale y cuánto mide en el juego está en `FIGURAS` (`herramientas/arte.ts`); el protagonista mide 60. `acomodar.ts figuras/<id> <carpeta>` la deja exactamente de esa altura, con los pies abajo, así que un adulto siempre queda más alto que el niño aunque el generador lo dibuje de otro tamaño. Las personas llevan piel clara natural, que el juego cambia; el cabello va en su color real; perro y gato no cambian de color.

No tienen retrato aparte: la repisa muestra la cabeza de su figura.

**El perro, caminando:** además de su figura quieta, su figura de perfil mirando a la izquierda y dos pasos de perfil (`perro_lado`, `perro_lado_paso_1`, `perro_lado_paso_2`), editando su figura; la derecha es la izquierda volteada. Las imágenes pueden ir en cualquier carpeta dentro de `figuras/`. `acomodar.ts figuras/perro_lado` las junta en `figuras/perro_lado.png` (tres cuadros de 48 × 48, el perro de 30 de alto con las patas abajo). Al caminar alterna quieto, paso, quieto, paso; parado usa su figura de frente. Si faltan, avanza con su figura de frente dando saltitos.

**Personajes fijos** (un cuadro de pie, con la plantilla de figura):
> [estilo] One single standing sprite, 384×512 px, following the attached template: head top and feet on the guide lines, centered, facing the viewer, standing still. SUBJECT: [quién es, de `manifiesto.yaml`], everyday Mexican clothes.

**Fondos de lugares** (con su plano):
> Pixel art, top-down 3/4 view RPG map, cozy Mexican city neighborhood, soft daylight, crisp square pixels, no anti-aliasing. Follow the attached floor plan EXACTLY: dark areas are walls, light areas are floor, gaps in the walls are doorways; keep every wall and doorway in the same place and size. 32-pixel tiles. Empty place: floor and walls only, no furniture, no people, no text. SUBJECT: [lo que dice `manifiesto.yaml` del fondo].

**Muebles y objetos:**
> [estilo, cambiando la primera frase por: Pixel art game object for a top-down 3/4 view RPG] One single object, centered, filling a [ancho × alto en pixeles ×8] area. SUBJECT: [el objeto, de `manifiesto.yaml`].

## Qué se revisa en cada entrega

- Solo colores de la paleta.
- El niño se ve de 8 a 12 años y el uniforme se lee mexicano.
- Ningún tono de piel, casa o familia se ve más cuidado o descuidado que otro.
- Las reglas de contenido visual de abajo y las palabras de `../LENGUAJE.md` en letreros y nombres.

## Reglas de contenido visual

Ninguna imagen muestra golpes, sangre, armas, abuso ni muerte.
