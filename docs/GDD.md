# GDD · Matices

> Documento de diseño del juego. Versión 0.2 · 2026-10-21.
> Lo clínico, lo legal y la investigación viven en `docs/clinico`, `docs/legal` e `docs/investigacion`; este documento solo los resume donde tocan el diseño.

## 1. En una frase

Un RPG de pixel art en una colonia de una ciudad mexicana. El niño crea a su personaje, arma su casa y anda libre por la casa, la escuela y la colonia. Ahí pasan cosas de todos los días: el perro lo sigue, un adulto le dice que no corra, tiene hambre, hay tarea. El niño hace lo que quiera, y el juego registra qué hizo, qué contestó y si después hizo lo que dijo, para que un psicólogo lo lea.

El juego **observa**, el psicólogo **interpreta**. El juego nunca diagnostica, puntúa, enseña ni muestra resultados al niño.

## 2. Pilares

| Pilar | Qué significa en el diseño |
| --- | --- |
| Se juega, no se lee | Casi todo pasa en el mundo, con dibujos y movimiento. El texto es corto: una línea de quien habla y respuestas de dos o tres palabras |
| Nada detiene el juego | Ninguna pregunta congela el mundo. Contestar es opcional: el niño puede irse caminando, y eso también es una respuesta |
| Mi colonia, mi casa | El mundo se parece al del niño: calles, tinacos en las azoteas, la tiendita, la primaria, el parque. La casa y quién vive en ella las pone él |
| Ninguna respuesta es la correcta | Sin puntos, insignias ni regaños del juego. Lo que pasa después no cambia según lo que contestó |
| Siempre puedo parar | "Quiero hablar con alguien" siempre visible |

## 3. Cambio de rumbo (2026-10-21)

La versión 0.1 convertía la técnica de los cuentos para completar en un examen de opción múltiple: al empezar, 4 pantallas de presentación y 5 preguntas, y en total unas 100 decisiones leídas. Se sentía intrusiva y detenía el juego. Se quita y se queda lo que sí es juego.

| Antes (0.1) | Ahora (0.2) | Por qué |
| --- | --- | --- |
| 15 sucesos en un libro que congela el mundo y pregunta quién llega, qué hace, qué pasa después y cómo se siente | Situaciones cotidianas dentro del mundo (§9) | Un niño que apenas lee no puede jugar un cuestionario; en el mundo actúa sin leer |
| El niño decide lo que hacen los adultos | Los adultos de la casa ponen las reglas de todos los días; lo que se observa es qué hace el niño con ellas | Es como se juega un videojuego: el mundo reacciona y el niño decide |
| Caritas, panel cuerpo / pensamiento / entorno, estados del cuerpo | **Se quitan** | Preguntar cómo se siente cada vez era lo más intrusivo |
| Sobre mí con los gemelos, escena para describir | **Se quitan** | Preguntaban por la vida real o pedían leer y elegir |
| Presentación de La Cuentera y aterrizaje de cada noche | **Se quitan** | Eran pantallas para leer antes y después de jugar |
| "Ahora no", "Otra cosa", "No sé" | **Se quitan**: irse caminando ya es no contestar | Nada pregunta, así que no hace falta salir de una pregunta |
| Dibujo libre en una hora fija | En Mi libro, cuando el niño quiera | Dibujar es juego, no tarea |
| Personaje, casa, mundo, exploración, Mi libro, "Quiero hablar con alguien" | **Se conservan** | Ya eran juego |

## 4. Estructura de una partida

Tres **días** en la colonia. Cada día tiene mañana, tarde y noche. El juego se pausa en cualquier momento y retoma donde se quedó (ver `PRD.md`, contexto de uso).

```
Día = Mañana (casa → calle → escuela) → Tarde (colonia) → Noche (casa) → a la cama
```

El tiempo no avanza solo: la mañana termina al salir de la escuela, la tarde al llegar a casa y la noche al acostarse. La escuela abre en la mañana; la biblioteca, en la tarde; la tiendita y el parque, mañana y tarde. De noche nadie sale de casa. Nadie pierde por lento.

## 5. Bucle de juego

```
Andar libre (caminar, correr, tocar cosas, jugar con el perro, saludar)
   → hace algo que toca una regla o una necesidad de todos los días
      → alguien del mundo reacciona (una línea corta, con voz)
         → si lo vuelve a hacer, le habla y le deja contestar: 3 respuestas o irse
            → el juego sigue; si lo repite después de contestar, se registra contra lo que dijo
```

## 6. Creación del personaje

Primera pantalla del juego. Unos 3 minutos.

Los pasos van en orden: abajo, un botón lleva al siguiente ("Sigue: Piel") y en el último dice "Listo". Las pestañas de arriba dejan saltar a cualquier paso. Cada paso tiene su color: su pestaña, la luz detrás del personaje y lo elegido. No hay contador de pasos (§13).

| Paso | Opciones | Nota |
| --- | --- | --- |
| Cuerpo | Niña o niño. Cada uno empieza con su look: niña con cabello largo y falda, niño con cabello corto y pantalón | Mismas situaciones para todos; cabello y ropa se eligen libres después |
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
- Se registra: quién, en qué orden, en qué cuarto, qué tan cerca del personaje, cambios (`clinico/codigos-y-eventos.md`, `casa_figura`). Si renombró una figura se registra que la renombró, nunca el nombre que escribió.

Esas figuras viven en la casa del mundo y son quienes reaccionan en las situaciones de la casa (§9). Si la casa queda sin adultos, nadie reacciona, y eso también se registra.

## 8. El mundo

Una colonia urbana de una ciudad mexicana, sin nombre de estado ni de colonia.

| Zona | Lugares | Situaciones (§9) | Personajes fijos |
| --- | --- | --- | --- |
| Casa | Cuartos del paso 7, espejo, refrigerador, mesa, cama, tinaco | S01 correr; después S02 hambre, S03 tarea, S04 se rompe algo, S05 alguien llora | Los que el niño puso |
| Calle | Banquetas, cruce peatonal, casas y edificios vecinos, árboles, postes | Exploración | Vecinos que saludan |
| Primaria | Entrada, explanada con asta, dirección, aulas, gimnasio con cancha, baños; planta alta con aulas y sala de cómputo | Después: S06 recreo, S07 la pelota | Lucía (maestra), Nico (compañero), compañeros genéricos, conserje |
| Parque | Entrada, plaza con fuente, lago con muelle, mirador, área infantil, área de ejercicio, bancas | Después: S08 se raspa | Niños jugando |
| Tiendita | Mostrador, refrigerador de refrescos | Exploración | Don Chuy (tendero) |
| Biblioteca de la colonia | Planta baja con estantes y mostrador, planta alta con mesas de lectura | Exploración | Clara (bibliotecaria), La Cuentera (vecina que lee ahí) |

Reglas de los personajes fijos: Lucía, Nico, Clara, Don Chuy y los vecinos **solo saludan y comentan cosas neutras** ("Qué calor hoy"). No preguntan "¿estás bien?" ni ofrecen ayuda por su cuenta. Así ninguno empuja una respuesta.

Cámara: sigue al personaje. Se acerca y se aleja con + y − o con la rueda, en pasos enteros para que el pixel art quede nítido. Se arrastra para mirar alrededor, y el botón de cuatro esquinas vuelve a centrar en el personaje; al tocar el suelo o moverse, la cámara vuelve a seguirlo.

### Salidas siempre a la vista

Cada puerta lleva un letrero con el nombre del lugar al que lleva ("Calle", "Escuela", "Planta alta"); así, al llegar a un lugar nuevo, el niño ve cómo regresar y a dónde más puede ir. Una puerta cerrada a esa hora se ve apagada con un candado. El anillo amarillo marca a dónde sigue el día y su letrero brilla; si queda fuera de la pantalla, una flecha en la orilla apunta hacia él con el mismo nombre al lado.

## 9. Situaciones cotidianas

Cada situación nace de algo que el niño hace o necesita en el mundo, nunca de un aviso. El juego no detiene nada: quien reacciona habla en un globo encima de su cabeza y, cuando toca contestar, aparecen botones grandes abajo. Si el niño se aleja, cuenta como ignorar.

Lo que se registra en cada una: qué hizo, quién reaccionó (o que no había nadie), qué contestó y en cuánto tiempo, y si después hizo lo mismo y cuántas veces, comparado con lo que contestó. Las líneas y los códigos están en `contenido/situaciones.yaml`.

| Situación | Qué pasa | Áreas (`clinico/marco-clinico.md`) | Estado |
| --- | --- | --- | --- |
| S01 Correr en la casa | El perro de la casa sigue al niño y a ratos sale corriendo; para alcanzarlo hay que correr. La primera vez, el adulto más cercano dice "¡No corras dentro de la casa!". La segunda, le habla ("Te dije que no corrieras dentro de la casa…") y el niño contesta "Me vale pito", "No lo vuelvo a hacer" o "Perdón", o se va | Conducta; a quién culpa (más adelante, con S04) | Hecha |
| S02 Hambre | En la mañana suena la panza. Puede ir al refri, ir con alguien de la casa o seguir jugando | Necesidades físicas; pedir ayuda | Por hacer |
| S03 La tarea | De noche la mochila tiene tarea. Puede hacerla en la mesa, pedir ayuda a alguien o dejarla | Escuela y aprendizaje; supervisión | Por hacer |
| S04 Se rompe algo | Si corre cerca de la mesa, se cae un vaso. Llega alguien: "¿Qué pasó?". "Fui yo", "Fue el perro", "No sé" o irse | A quién culpa; conducta | Por hacer |
| S05 Alguien llora | Si en la casa hay un bebé o un hermano menor, a ratos llora. Puede ir con él, avisar a un adulto o seguir en lo suyo | Cuidar de más; prosocial | Por hacer |
| S06 Recreo | Un compañero está solo en una banca. Puede ir con él, invitarlo a jugar o seguir | Compañeros; prosocial | Por hacer |
| S07 La pelota | Un compañero le quita la pelota. Puede pedirla, decirle a la maestra, quitársela o irse | Conducta; compañeros; pedir ayuda | Por hacer |
| S08 Se raspa | Si corre en el parque, se cae y se raspa. Puede ir a casa con alguien, decirle a un adulto o seguir jugando | Apoyo emocional; pedir ayuda | Por hacer |

Reglas de todas:

- Los adultos reaccionan siempre igual, sin premiar ni castigar más fuerte. Lo que cambia es lo que hace el niño.
- Quien reacciona en la casa es la persona adulta que el niño puso más cerca; si no puso adultos, nadie reacciona.
- Las respuestas son de dos o tres palabras, con voz. No hay "correcta" y nada cambia después según la que eligió.
- Cada área del marco clínico debe quedar en al menos dos situaciones; los psicólogos revisan los códigos.

## 10. Otras mecánicas

| Mecánica | Dónde | Detalle |
| --- | --- | --- |
| Correr | Todo el mapa | Botón de tenis o tecla Mayúsculas. Correr es libre; en la casa es parte de S01 |
| Explorar y tocar objetos | Todo el mapa | Los objetos con algo que mirar brillan suave. Al tocarlos, el personaje dice una frase neutra ("La foto de la escuela") |
| El perro | Casa, si el niño lo puso | Al pasar junto a él, lo sigue; a ratos sale corriendo y espera a que lo alcancen |
| Mi libro | Botón fijo | Los dibujos del niño. Una hoja en blanco para dibujar cuando quiera: 12 colores, 3 grosores, goma y deshacer |
| Quiero hablar con alguien | Siempre visible | Avisa en silencio al adulto a cargo. Funciona sin red: el aparato muestra una señal discreta en una esquina y el aviso queda guardado con su hora; llega al tablero cuando hay red. Al niño solo se le muestra la frase fija "Ya le avisamos al adulto que te acompaña. Puedes seguir jugando o esperar aquí." |

## 11. Dirección visual

Pixel art en vista de tres cuartos, paleta cálida, llena la pantalla en horizontal o vertical. Estilo, medidas y lista de arte en `docs/arte/direccion-de-arte.md`.

## 12. Controles

| Aparato | Moverse | Correr | Interactuar | Contestar |
| --- | --- | --- | --- | --- |
| Tableta | Tocar el suelo para caminar ahí | Botón de tenis (se queda prendido) | Tocar el objeto o persona | Tocar la respuesta, o alejarse |
| Computadora | Flechas o WASD, o clic en el suelo | Mayúsculas, o el botón | Clic o barra espaciadora | Clic o números 1 a 3, o alejarse |

Reglas de experiencia:

- **Un toque elige.** Lo elegido se ilumina un momento y el juego sigue solo.
- **Nada congela el mundo.** Solo Mi libro, Opciones y "Quiero hablar con alguien" cubren la pantalla, y solo cuando el niño los abre.
- **La voz.** Cada línea tiene un botón de bocina. Las grabaciones reales suenan solas; la voz sintética, solo si el niño toca la bocina.
- **Dibujos en lugar de texto.** Colores como muestras, peinados y ropa como dibujos, personas como su dibujo. El texto se limita a la línea de quien habla, las respuestas y los letreros de las salidas.
- **Vertical y horizontal, cada uno diseñado.** Las respuestas quedan abajo, al alcance del pulgar.
- **Para dedos de niño.** Botones de al menos 48 píxeles de pantalla, separación generosa, nada que parpadee.

## 13. Interfaz

- Esquina superior izquierda: Mi libro.
- Esquina superior derecha: "Quiero hablar con alguien" (icono de dos globos de diálogo con el mismo estilo que los demás botones).
- Esquina inferior derecha: opciones (volumen de voz, música, efectos, velocidad de texto, lectura sencilla).
- Esquina inferior izquierda, en el mundo: acercar, alejar, centrar y correr.
- En el mundo: letreros en cada salida; globo encima de quien habla; respuestas abajo, en fila.
- Sin barras de progreso, contadores ni puntajes.

## 14. Audio

- Música acústica tranquila (guitarra, marimba suave), un tema por zona y una versión de noche.
- Voz grabada en español de México para cada línea y cada respuesta.
- Sonido ambiente por zona: pájaros, perros lejanos, el camión del gas, recreo.
- Nada de sonidos de susto, gritos ni golpes.

## 15. Accesibilidad

Voz siempre disponible, texto a nivel de 3.º de primaria, tamaño de letra ajustable, sin depender del color para información, efectos de ambiente apagables, sin movimientos de cámara bruscos, todo jugable con una mano.

## 16. Lo que el juego nunca hace

Mostrar golpes, abuso, armas o muerte; premiar o corregir lo que hace el niño; enseñarle qué es lo correcto; mostrar resultados; preguntar por su vida real; detener el juego para preguntar; bloquear la ayuda; poner personajes que pregunten "¿estás bien?" por su cuenta.

## 17. Pendientes de diseño

Ver `docs/PENDIENTES.md`.
