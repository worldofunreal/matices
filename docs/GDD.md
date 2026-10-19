# GDD · Matices

> Documento de diseño del juego. Versión 0.1 · 2026-10-19.
> Lo clínico, lo legal y la investigación viven en `docs/clinico`, `docs/legal` e `docs/investigacion`; este documento solo los resume donde tocan el diseño.

## 1. En una frase

Un RPG de pixel art ambientado en una colonia de una ciudad mexicana donde el niño crea a su personaje, arma su casa y recorre la escuela y la colonia; a lo largo del día ocurren pequeños sucesos sin final, y el niño decide cómo terminan, incluido lo que hacen los adultos de su casa. Lo que elige queda registrado para que un psicólogo lo lea.

El juego **recoge**, el psicólogo **interpreta**. El juego nunca diagnostica, puntúa ni muestra resultados al niño.

## 2. Pilares

| Pilar | Qué significa en el diseño |
| --- | --- |
| Mi colonia, mi casa | El mundo se parece al del niño: teja, tinacos, bugambilias, papel picado, la tiendita, la primaria. La casa y quién vive en ella las pone él. |
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
Día = Calma de entrada → Mañana (casa → camino → escuela) → Tarde (colonia) → Noche (casa) → Aterrizaje
         ↑ en cada tramo se dispara 1 o 2 sucesos sin final, según el plan del día
```

| Día | Qué pasa además de explorar | Sucesos (ver `contenido/cuentos`) |
| --- | --- | --- |
| 1 | Crear personaje, armar la casa, conocer a La Cuentera, primer dibujo | E00, E03, E07, E09 |
| 2 | Escena para describir en la biblioteca | E06, E02, E04, E13, E14, E10 |
| 3 | "Sobre mí" con los gemelos al final del día | E11, E01, E08, E12, E05 |

Reglas de orden: cada día abre y cierra sus sucesos con uno de intensidad baja; los de en medio se barajan por niño con una semilla guardada; tras cada suceso de intensidad media hay al menos un minuto de exploración libre. La hora del día en que ocurre cada suceso está fija por su contenido (la fiebre, de noche; el recreo, en la escuela).

## 5. Bucle de juego

```
Explorar (caminar, tocar objetos, hablar con vecinos)
   → la hora avanza al llegar a un punto del mapa
      → empieza un suceso: el mundo se congela y se abre el libro
         → el niño termina el cuento (¿quién llega? ¿qué hace? ¿y luego? ¿cómo se siente?)
            → "Así queda el cuento. Gracias." → la página entra a Mi libro
               → el mundo vuelve a moverse
```

El tiempo no avanza solo: avanza cuando el niño llega a la puerta o lugar que marca el siguiente tramo. Nadie pierde por lento.

## 6. Creación del personaje

Primera pantalla después del consentimiento del niño. Unos 3 minutos.

| Paso | Opciones | Nota |
| --- | --- | --- |
| Cuerpo | Niña, niño, o "prefiero no elegir" (cuerpo neutro con ropa unisex) | Mismos sucesos y opciones para todos |
| Tono de piel | 8 tonos, del más claro al más oscuro, en orden aleatorio en pantalla | El orden aleatorio evita que el primero sea "el normal" |
| Cabello | 10 peinados × 6 colores | Incluye trenzas, chino, corto, rapado |
| Ropa | Uniforme escolar genérico (suéter, pantalón o falda con short, tenis) o ropa de casa | Pantalón disponible para todos |
| Lentes y extras | Lentes, aretes, gorra, mochila de 4 colores | |
| Nombre | Elegir de una lista de 40 nombres o escribir uno | El nombre se queda en el aparato; nunca sale en los datos |

Todo se puede cambiar después desde el espejo de la casa (se registra el cambio, no se juzga).

## 7. Armar la casa

Unos 5 minutos, después del personaje. Es a la vez mecánica de juego y de observación.

- Vista de la casa en corte (sin techo): sala-comedor, cocina, 2 recámaras, baño, patio con tinaco y lavadero.
- Repisa de figuras: abuela, abuelo, mamá, papá, tía (Elena), tío, madrastra, padrastro, hermano o hermana mayor, hermano o hermana menor, bebé, primo o prima, otra persona adulta, perro, gato.
- El niño arrastra figuras a los cuartos. Puede poner una, varias o ninguna. Cada figura puede renombrarse ("Mi abue").
- La Cuentera solo dice: "Esta es tu casa en el cuento".
- Se registra: quién, en qué orden, en qué cuarto, qué tan cerca del personaje, cambios.

Esas figuras son los adultos y hermanos de todos los sucesos. Si la casa queda sin adultos, los sucesos de casa ofrecen "un vecino o vecina" y "nadie".

## 8. El mundo

Una colonia de una ciudad mediana del centro de México, sin nombre de estado ni de colonia.

| Zona | Lugares | Sucesos que ocurren ahí | Personajes fijos |
| --- | --- | --- | --- |
| Casa | Cuartos del paso 7, espejo, refrigerador, mesa, cama, tinaco | E00, E01, E02, E04, E07, E08, E12, E13 (llegada), E14 | Los que el niño puso |
| Calle y río | Camino con bardas de piedra, puente de madera, buzón, casas vecinas | Transiciones, exploración | Vecinos que saludan |
| Primaria | Entrada, patio con asta, cancha, aulas 1 y 2, dirección, biblioteca escolar, aula de cómputo, enfermería, baños, jardín, bodega | E05, E06, E09, E10, E11 | Lucía (maestra), Nico (compañero), compañeros genéricos, conserje |
| Parque | Juegos, árbol grande, bancas | E03 | Niños jugando |
| Tiendita | Mostrador, refrigerador de refrescos | Exploración | Don Chuy (tendero) |
| Biblioteca de la colonia | Mesas, estantes, mural | Escena para describir; casa de La Cuentera | Clara (bibliotecaria), La Cuentera |

Reglas de los personajes fijos: Lucía, Nico, Clara, Don Chuy y los vecinos **solo saludan y comentan cosas neutras** ("Qué calor hoy"). No preguntan "¿estás bien?" ni ofrecen ayuda por su cuenta: dentro de un suceso, solo hacen lo que el niño elija para ellos. Así ninguno empuja una respuesta.

### La Cuentera

Narradora y anfitriona. Vive en la biblioteca de la colonia. Señora mayor, rebozo, lentes, un libro grande con páginas en blanco. Tono cálido y parejo. Nunca opina sobre un final, nunca pregunta por la vida real del niño (eso lo hacen solo los gemelos, avisando antes). Sus frases fijas:

- Inicio de suceso: "Aquí empieza un cuento que perdió su final…"
- Pregunta: "¿Y qué pasó después?"
- Cierre: "Así queda el cuento. Gracias."
- "Ahora no": "Está bien. Lo dejamos aquí."

### Los gemelos Tito y Tita

Dos gatitos idénticos que solo aparecen en "Sobre mí" (día 3). Cada uno dice una frase opuesta; el niño elige a cuál se parece. Antes, La Cuentera avisa: "Ahora no es un cuento. Es sobre ti."

## 9. Los sucesos (modo cuento)

Cuando el niño llega al punto de un suceso:

1. El mundo baja de volumen, la cámara encuadra la escena y aparece el libro en el borde inferior.
2. La Cuentera narra el inicio (voz + texto). Animación corta con los sprites del personaje y su familia.
3. **¿Quién llega?** Tarjetas con el retrato de cada figura de la casa (o de la escuela, si es ahí) + "Nadie" + "[Nombre] lo resuelve solo" + "No sé". Orden aleatorio.
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
| Dibujo libre | Día 1, en la recámara | Lienzo con 12 colores, 3 grosores, goma y deshacer. Consigna configurable por el psicólogo. |
| Escena para describir | Día 2, biblioteca | Ilustración fija ambigua; elegir qué pasa y qué siente cada personaje. |
| Sobre mí | Día 3, biblioteca | Los gemelos Tito y Tita. Unas 24 frases (ver `contenido/sobre-mi.yaml`). |
| Ahora no | En todo suceso | Cierra el suceso con la frase de La Cuentera. Se registra. |
| Quiero hablar con alguien | Siempre visible | Avisa en silencio al psicólogo. Ver `docs/legal/protocolo-de-aviso.md`. |
| Calma y aterrizaje | Inicio y fin de cada día | Calma: respiración con una vela que sube y baja (opcional). Aterrizaje: regar las plantas del patio y despedirse de La Cuentera. |

## 11. Dirección visual

Pixel art en vista de tres cuartos, paleta cálida, llena la pantalla en horizontal o vertical. Estilo, medidas y lista de arte en `docs/arte/direccion-de-arte.md`.

## 12. Controles

| Aparato | Moverse | Interactuar | Elegir en un suceso |
| --- | --- | --- | --- |
| Tableta | Tocar el suelo para caminar ahí | Tocar el objeto o persona | Tocar la tarjeta |
| Computadora | Flechas o WASD, o clic en el suelo | Clic o barra espaciadora | Clic o números 1 a 6 |

Ningún paso exige leer: toda tarjeta tiene voz al tocarla una vez y se confirma con un segundo toque.

## 13. Interfaz

- Esquina superior izquierda: Mi libro.
- Esquina superior derecha: "Quiero hablar con alguien" (icono de dos globos de diálogo con el mismo estilo que los demás botones).
- Esquina inferior derecha: opciones (volumen de voz, música, efectos, velocidad de texto, efectos de ambiente on/off, lectura sencilla).
- En sucesos: libro abajo, tarjetas en abanico, botón "Ahora no" a la izquierda, "Volver a escuchar" a la derecha.
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
