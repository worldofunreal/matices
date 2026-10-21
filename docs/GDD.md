# GDD · Matices

> Documento de diseño del juego. Versión 0.1 · 2026-10-19.
> Lo clínico, lo legal y la investigación viven en `docs/clinico`, `docs/legal` e `docs/investigacion`; este documento solo los resume donde tocan el diseño.

## 1. En una frase

Un RPG de pixel art ambientado en una colonia de una ciudad mexicana donde el niño crea a su personaje, arma su casa y recorre la escuela y la colonia; a lo largo del día ocurren pequeños sucesos sin final, y el niño decide cómo terminan, incluido lo que hacen los adultos de su casa. Lo que elige queda registrado para que un psicólogo lo lea.

El juego **recoge**, el psicólogo **interpreta**. El juego nunca diagnostica, puntúa ni muestra resultados al niño.

## 2. Pilares

| Pilar | Qué significa en el diseño |
| --- | --- |
| Mi colonia, mi casa | El mundo se parece al del niño: calles, tinacos en las azoteas, la tiendita de la esquina, la primaria, el parque. La casa y quién vive en ella las pone él. |
| Ningún final es el correcto | No hay puntos, insignias, finales buenos ni malos. La Cuentera agradece todos los finales igual. |
| Siempre puedo parar | "Ahora no" en todo momento sensible; "Quiero hablar con alguien" siempre visible. |
| Calma | Ritmo lento, música suave, sin temporizadores, sin castigos, sin sustos. |

## 3. Qué se conserva de la idea original y qué cambia

| Idea original | Ahora | Por qué |
| --- | --- | --- |
| RPG con personaje elegido niño o niña | **Se conserva y se amplía**: creación de personaje con tono de piel, cabello, ropa y nombre | El niño necesita verse en el personaje |
| Casa, escuela, parque, biblioteca | **Se conserva**: los mismos lugares, explorables | Contraste entre espacios y vida cotidiana |
| Lucía (maestra), Nico (compañero), Clara (bibliotecaria) | **Se conservan** como vecinos y personajes de la escuela | Continuidad con el trabajo creativo original |
| Elena (tía) como apoyo garantizado | **Pasa a ser una opción** de la casa: el niño puede ponerla o no | Si la red de apoyo ya está escrita, no vemos si el niño la trae |
| Historia lineal de 5 capítulos con un cuidador negligente escrito en el guion | **Cambia** a 15 sucesos cortos e independientes dentro de 3 días de juego | La negligencia escrita no dice nada de la casa real del niño |
| Solo decides lo que hace el protagonista | **Cambia**: también decides qué hacen los adultos | Ahí se proyecta lo que el niño vive (técnica de cuentos para completar) |
| Habilidades que se desbloquean (aguantar → pedir ayuda) | **Se quita** | Le enseña cuál es la respuesta "correcta" y contamina lo que elige después |
| Estados del cuerpo: tranquilo → inquieto → alerta → saturado | **Se conserva** como ambiente (sonido, color, encuadre), elegido por el niño, no impuesto | Es parte de la identidad del original y sirve para nombrar emociones |
| Panel cuerpo / pensamiento / entorno | **Se conserva** | Mide cuántas emociones distingue |
| Álbum de recuerdos | **Se conserva** como "Mi libro": guarda los finales y dibujos | Da cierre sin arco terapéutico |
| "Ahora no" | **Se conserva** | Seguridad y dato |
| Arco final de transformación ("mis necesidades importan") | **Se quita** | Un final que "cura" es intervención, no observación |

## 4. Estructura de una partida

Tres **días** en la colonia. Cada día tiene mañana, tarde y noche. Un día dura unos 33 minutos, pero no está atado a una sesión: el juego se pausa en cualquier momento y retoma donde se quedó (ver `PRD.md`, contexto de uso).

```
Día = Mañana (casa → camino → escuela) → Tarde (colonia) → Noche (casa) → Aterrizaje
         ↑ en cada tramo se dispara 1 o 2 sucesos sin final, según el plan del día
```

| Día | Qué pasa además de explorar | Sucesos (ver `contenido/cuentos`) |
| --- | --- | --- |
| 1 | Crear personaje, armar la casa, conocer a La Cuentera, primer dibujo | E00, E03, E07, E09 |
| 2 | Escena para describir en la biblioteca | E06, E02, E04, E13, E14, E10 |
| 3 | "Sobre mí" con los gemelos | E11, E01, E08, E12, E05 |

El día, la hora y el lugar de cada actividad están en `contenido/actividades.yaml`; los de cada suceso, en su archivo.

Reglas de orden: cada día abre y cierra sus sucesos con uno de intensidad baja; los de en medio se barajan por niño con una semilla guardada; tras cada suceso de intensidad media hay al menos un minuto de exploración libre, y tras cualquier suceso, al menos diez segundos, para que dos nunca vayan seguidos. La hora del día en que ocurre cada suceso está fija por su contenido (la fiebre, de noche; el recreo, en la escuela).

## 5. Bucle de juego

```
Explorar (caminar, tocar objetos, hablar con vecinos)
   → la hora avanza al llegar a un punto del mapa
      → empieza un suceso: el mundo se congela y se abre el libro
         → el niño termina el cuento (¿quién llega? ¿qué hace? ¿y luego? ¿cómo se siente?)
            → "Así queda el cuento. Gracias." → la página entra a Mi libro
               → el mundo vuelve a moverse
```

El tiempo no avanza solo: avanza cuando el niño llega a la puerta o lugar que marca el siguiente tramo. La mañana termina al salir de la escuela, la tarde al llegar a casa y la noche al ir a la cama. La escuela abre en la mañana; la biblioteca, en la tarde; la tiendita y el parque, mañana y tarde. De noche nadie sale de casa. Nadie pierde por lento.

## 6. Creación del personaje

Primera pantalla del juego. Unos 3 minutos.

Los pasos van en orden: abajo, un botón lleva al siguiente ("Sigue: Piel") y en el último dice "Listo". Las pestañas de arriba dejan saltar a cualquier paso. Cada paso tiene su color: su pestaña, la luz detrás del personaje y lo elegido. No hay contador de pasos (§13).

| Paso | Opciones | Nota |
| --- | --- | --- |
| Cuerpo | Niña o niño. Cada uno empieza con su look: niña con cabello largo y falda, niño con cabello corto y pantalón | Mismos sucesos y opciones para todos; cabello y ropa se eligen libres después |
| Tono de piel | 8 tonos, del más claro al más oscuro, en orden aleatorio en pantalla | El orden aleatorio evita que el primero sea "el normal" |
| Cabello | 10 peinados × 6 colores | Incluye trenzas, chino, corto, rapado |
| Ropa | Uniforme escolar genérico (suéter, pantalón o falda con short, tenis) o ropa de casa (playera y pants). Cada prenda y los tenis con su fila de colores; el uniforme empieza oscuro con gris | Pantalón disponible para todos |
| Lentes y extras | Lentes, aretes, gorra y mochila, cada uno con su fila de colores | Se ven con la cabeza del personaje, en grande |
| Nombre | Elegir de una lista de 40 nombres o escribir uno | El nombre se queda en el aparato; nunca sale en los datos |

Todo se puede cambiar después desde el espejo de la casa (se registra el cambio, no se juzga).

## 7. Armar la casa

Unos 5 minutos, después del personaje. Es a la vez mecánica de juego y de observación.

- Vista de la casa en corte (sin techo): sala-comedor, cocina, 2 recámaras, baño, patio con tinaco y lavadero. Al abrirla se ve completa y centrada; se acerca con dos dedos, con la rueda o con + y −, y el botón de cuatro esquinas la vuelve a ver completa.
- Repisa de figuras: la lista está en `contenido/figuras.yaml` (abuelos, padres, tíos, madrastra, padrastro, hermanos mayores y menores, bebé, primos, otra persona adulta, perro, gato). La tía puede llamarse Elena si el niño la renombra.
- El niño toca una figura y luego un cuarto. Mientras está elegida, la figura se pega al dedo o al cursor, igual que al arrastrarla, hasta que toca un cuarto. Puede poner una, varias, la misma más de una vez (dos hermanos menores) o ninguna. Cada figura puede renombrarse ("Mi abue"), cambiar de color de piel, moverse o quitarse. El personaje también está en la casa y se puede mover. Cada persona de la casa lleva su nombre en una placa; si hay dos iguales, la segunda lleva un número (Hermano menor 2).
- La Cuentera solo dice: "Esta es tu casa en el cuento".
- Se registra: quién, en qué orden, en qué cuarto, qué tan cerca del personaje, cambios (`clinico/codigos-y-eventos.md`, `casa_figura`). Si renombró una figura se registra que la renombró, nunca el nombre que escribió.

Esas figuras son los adultos y hermanos de todos los sucesos. Si la casa queda sin adultos, los sucesos de casa ofrecen "un vecino o vecina" y "nadie".

## 8. El mundo

Una colonia urbana de una ciudad mexicana, sin nombre de estado ni de colonia.

| Zona | Lugares | Sucesos que ocurren ahí | Personajes fijos |
| --- | --- | --- | --- |
| Casa | Cuartos del paso 7, espejo, refrigerador, mesa, cama, tinaco | E00, E01, E02, E04, E07, E08, E12, E13 (llegada), E14 | Los que el niño puso |
| Calle | Banquetas, cruce peatonal, casas y edificios vecinos, árboles, postes | Transiciones, exploración | Vecinos que saludan |
| Primaria | Entrada, explanada con asta, dirección, aulas, gimnasio con cancha, baños; planta alta con aulas y sala de cómputo | E05, E06, E09, E10, E11 | Lucía (maestra), Nico (compañero), compañeros genéricos, conserje |
| Parque | Entrada, plaza con fuente, lago con muelle, mirador, área infantil, área de ejercicio, bancas | E03 | Niños jugando |
| Tiendita | Mostrador, refrigerador de refrescos | Exploración | Don Chuy (tendero) |
| Biblioteca de la colonia | Planta baja con estantes y mostrador, planta alta con mesas de lectura | Escena para describir; casa de La Cuentera | Clara (bibliotecaria), La Cuentera |

Reglas de los personajes fijos: Lucía, Nico, Clara, Don Chuy y los vecinos **solo saludan y comentan cosas neutras** ("Qué calor hoy"). No preguntan "¿estás bien?" ni ofrecen ayuda por su cuenta: dentro de un suceso, solo hacen lo que el niño elija para ellos. Así ninguno empuja una respuesta.

Cámara: sigue al personaje. Se acerca y se aleja con + y − o con la rueda, en pasos enteros para que el pixel art quede nítido. Se arrastra para mirar alrededor, y el botón de cuatro esquinas vuelve a centrar en el personaje; al tocar el suelo o moverse, la cámara vuelve a seguirlo.

### La Cuentera

Narradora y anfitriona. Vive en la biblioteca de la colonia. Señora mayor, rebozo, lentes, un libro grande con páginas en blanco. Tono cálido y parejo. Nunca opina sobre un final, nunca pregunta por la vida real del niño (eso lo hacen solo los gemelos, avisando antes). Sus frases fijas (inicio, pregunta, cierre y "Ahora no") están en `contenido/textos.yaml`, sección `cuento`.

### Los gemelos Tito y Tita

Dos gatitos idénticos que solo aparecen en "Sobre mí" (día 3). Cada uno dice una frase opuesta; el niño elige a cuál se parece. Antes, La Cuentera avisa: "Ahora no es un cuento. Es sobre ti."

## 9. Los sucesos (modo cuento)

Cuando el niño llega al punto de un suceso:

1. El mundo baja de volumen, la cámara encuadra la escena y aparece el libro en el borde inferior.
2. La Cuentera narra el inicio (voz + texto). Animación corta con los sprites del personaje y su familia.
3. **¿Quién llega?** Tarjetas con el retrato de cada figura de la casa (o de la escuela, si es ahí) + "Nadie" + "[Nombre] lo resuelve sin ayuda" + "No sé". Orden aleatorio.
4. **¿Qué hace?** Tarjetas ilustradas con icono y voz. Siempre las mismas formas de responder (cuida, se da cuenta pero no hace nada, regaña, lastima, se va) escritas para cada suceso, más "Otra cosa" (abre el lienzo para dibujarla).
5. **¿Y luego?** Un paso más.
6. **¿Cómo se siente [nombre]?** Cinco caritas en pixel art + panel opcional cuerpo / pensamiento / entorno.
7. Cierre de La Cuentera. La página entra a Mi libro con una ilustración del final elegido.

El contenido exacto de cada suceso está en `contenido/cuentos/E*.yaml`.

### Estados del cuerpo

En el paso 6, si el niño abre el panel y elige sensaciones intensas, el ambiente del final toma uno de cuatro estados: tranquilo, inquieto, alerta, saturado. Cambian paleta, sonido ambiente y encuadre durante unos segundos. Se pueden atenuar o apagar en opciones. El juego nunca pone ese estado por su cuenta.

## 10. Otras mecánicas

| Mecánica | Dónde | Detalle |
| --- | --- | --- |
| Explorar y tocar objetos | Todo el mapa | Los objetos con algo que mirar brillan suave. Al tocarlos, el personaje dice una frase neutra ("La foto de la escuela"). |
| Mi libro | Botón fijo | Las páginas de los finales y los dibujos. Solo lectura. |
| Dibujo libre | Día 1, en la recámara | Lienzo con 12 colores, 3 grosores, goma y deshacer. Consigna en `contenido/textos.yaml`, configurable por el psicólogo. Entra a Mi libro. |
| Escena para describir | Día 2, biblioteca | Ilustración fija ambigua; elegir qué pasa y qué siente cada personaje. |
| Sobre mí | Día 3, biblioteca | Los gemelos Tito y Tita. Unas 24 frases (ver `contenido/sobre-mi.yaml`). |
| Ahora no | En todo suceso | Cierra el suceso con la frase de La Cuentera. Se registra. |
| Quiero hablar con alguien | Siempre visible | Avisa en silencio al adulto a cargo. Funciona sin red: el aparato muestra una señal discreta en una esquina y el aviso queda guardado con su hora; llega al tablero cuando hay red. Al niño solo se le muestra la frase fija "Ya le avisamos al adulto que te acompaña. Puedes seguir jugando o esperar aquí." |
| Conocer a La Cuentera | Día 1, en la recámara, antes del primer suceso | Se presenta, explica su libro y "Ahora no". Va primero para que el niño sepa qué es el libro antes de que se abra. |
| Aterrizaje | Fin de cada día | Al irse a la cama, regar las plantas del patio y despedirse de La Cuentera. |

## 11. Dirección visual

Pixel art en vista de tres cuartos, paleta cálida, llena la pantalla en horizontal o vertical. Estilo, medidas y lista de arte en `docs/arte/direccion-de-arte.md`.

## 12. Controles

| Aparato | Moverse | Interactuar | Elegir en un suceso |
| --- | --- | --- | --- |
| Tableta | Tocar el suelo para caminar ahí | Tocar el objeto o persona | Tocar la tarjeta |
| Computadora | Flechas o WASD, o clic en el suelo | Clic o barra espaciadora | Clic o números 1 a 6 |

Reglas de experiencia:

- **Un toque elige.** Lo elegido se ilumina un momento y el juego sigue solo; no hay segundo toque para confirmar ni flecha de "siguiente".
- **La voz, solo cuando el niño la pide.** Cada pregunta y cada tarjeta tienen un botón de bocina. Las grabaciones reales pueden sonar solas; la voz sintética nunca suena sola.
- **Dibujos en lugar de texto.** Colores como muestras, peinados y ropa como dibujos, personas como retratos. Hay texto solo donde es parte del cuento (la narración y las opciones).
- **Vertical y horizontal, cada uno diseñado.** En vertical el libro sube desde abajo y los botones quedan al alcance del pulgar; en horizontal el libro va a un lado.
- **Para dedos de niño.** Botones de al menos 48 píxeles de pantalla, separación generosa, nada que parpadee.

## 13. Interfaz

- Esquina superior izquierda: Mi libro.
- Esquina superior derecha: "Quiero hablar con alguien" (icono de dos globos de diálogo con el mismo estilo que los demás botones).
- Esquina inferior derecha: opciones (volumen de voz, música, efectos, velocidad de texto, efectos de ambiente on/off, lectura sencilla).
- En sucesos: libro abajo en vertical o a un lado en horizontal, tarjetas en rejilla, "Ahora no" siempre visible, bocina en la pregunta y en cada tarjeta.
- Sin barras de progreso, contadores ni puntajes.

## 14. Audio

- Música acústica tranquila (guitarra, marimba suave), un tema por zona y una versión de noche.
- Voz grabada en español de México para La Cuentera, los gemelos y todas las tarjetas.
- Sonido ambiente por zona: pájaros, perros lejanos, el camión del gas, recreo.
- Nada de sonidos de susto, gritos ni golpes.

## 15. Accesibilidad

Voz siempre disponible, texto a nivel de 3.º de primaria, tamaño de letra ajustable, sin depender del color para información, efectos de ambiente apagables, sin movimientos de cámara bruscos, todo jugable con una mano.

## 16. Lo que el juego nunca hace

Mostrar golpes, abuso, armas o muerte; premiar o corregir un final; mostrar resultados; preguntar por la vida real sin avisar; bloquear la ayuda; poner personajes que pregunten "¿estás bien?" por su cuenta.

## 17. Pendientes de diseño

Ver `docs/PENDIENTES.md`.
