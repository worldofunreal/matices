# Diseño del juego

Dirección creativa: la propuesta de Dayana (*Videojuego de salud mental: guiones, situaciones y diseño narrativo*, 27-oct-2026). Los objetivos de abajo mandan: si algo de la propuesta choca con uno de ellos, se ajusta. La medición y sus reglas están en `metodologia.md`; el juego las sigue en lo que no choque con la historia.

## Los tres objetivos

1. **Información útil para orientar el acompañamiento y la evaluación profesional.** Observaciones contextualizadas sobre decisiones, necesidades y búsqueda de apoyo. No es un diagnóstico.
2. **Reconocer necesidades, negligencia y abuso, con herramientas de manejo emocional y búsqueda de ayuda.** El jugador identifica señales, emociones, límites y vías seguras. Nunca se le atribuye responsabilidad por el daño que hace otra persona.
3. **Una experiencia divertida, sencilla, intuitiva e inmersiva.** Si no es interesante, nadie explora las escenas. Los efectos audiovisuales son graduales y regulables.

## La premisa

RPG narrativo 2D de vida cotidiana para estudiantes de secundaria (12 a 18 años; edad exacta y tono por definir con especialistas). El protagonista, con nombre y apariencia que elige, recorre escenarios, interactúa con personas, hace amistades, presenta exámenes, hace tareas, va de compras y juega minijuegos.

Algunas escenas reflejan negligencia y abuso emocional o sexual. La experiencia **no es una sucesión de escenas trágicas**: la vida diaria ocupa casi todo el tiempo.

## Tres experiencias que conviven

- **Vida cotidiana:** exámenes, tareas, compras, juegos, dibujo, actividades escolares, exploración y pequeñas aventuras.
- **Relaciones:** amistades con compañeros, cooperación, desacuerdos, redes de apoyo.
- **Experiencias emocionales:** momentos agradables, frustraciones ordinarias y situaciones familiares difíciles. No todas las misiones enseñan una lección explícita.

## Estructura

La historia tiene una línea central con secuencias obligatorias. Entre una y otra, el jugador explora libremente y decide cuándo seguir: puede visitar lugares, hablar con personas, aceptar misiones secundarias o no hacer nada.

Bucle: **evento principal → ventana de libertad → exploración, minijuego o persona → registro de decisiones → nueva misión principal.**

La propuesta organiza la historia en seis capítulos. Son una guía de escenas, no un reemplazo de capítulos ya desarrollados. Entre paréntesis, las horas aproximadas de la versión completa (borrador, por validar):

| Capítulo | Tema |
| --- | --- |
| 1 · Un día como cualquier otro (0–4 h) | Tutorial doméstico, llegada a la escuela, primeros compañeros; señales familiares discretas |
| 2 · Pequeñas cosas que cambian (4–10 h) | Examen, tarea, ir a la tienda, explorar; ver las rutinas sin convertirlas en tragedia |
| 3 · Palabras que pesan (10–18 h) | Crítica, humillación y chantaje emocional de la figura paterna, junto a la vida escolar normal |
| 4 · Personas en quienes confiar (18–24 h) | Profundizar amistades, cooperación, ferias o actividades; conocer adultos seguros |
| 5 · Un secreto que no debería existir (24–27 h) | Visita de un tío, transgresión de límites. Fase posterior, después de validar el storyboard |
| 6 · No resolverlo todo a solas (27–30 h) | Comunicar necesidades, alternativas de protección y acompañamiento |

## Protagonista

Nombre y apariencia los elige el jugador: cuerpo, piel, cabello, ropa, extras, tenis, y colores de cada prenda. El avatar se dibuja con las hojas de referencia del guion (pixel art juvenil, el mismo lenguaje visual del resto del juego). Se cambia en el espejo de la casa o en Opciones.

**Al abrir con una partida guardada** se elige: Seguir donde me quedé, Cambiar mi personaje o Empezar de nuevo. Las mismas opciones aparecen después de cambiar de personaje: el nuevo reemplaza al anterior. Cada cambio queda registrado con su momento, para poder separarlo en el análisis. En el espejo también se elige el color de la cama y del ropero del cuarto.

**Empezar de nuevo**, al abrir, en Opciones y al terminar la historia, borra la partida y Mi libro, y cuenta como otro participante. Pide la clave de un adulto (`opciones.empezar_clave` en `contenido/textos.yaml`) y deja registrado el reinicio en el participante anterior.

**Historias:** por ahora hay una sola. El primer día y el tutorial serán iguales para todos; después la historia podrá seguir caminos distintos según las decisiones, respetando los objetivos de la historia base y sin sesgar lo que se mide. Esos objetivos están por definirse.

## Personas

- **Familia:** madre (trabaja, sale temprano), padre (minimiza, presiona y chantajea emocionalmente), tío (visita; fuera del demo). La familia es fija; el jugador no la arma.
- **Escuela:** profesora (revisa el uniforme; no castiga la falta de uniforme con exclusión), compañeros Valeria, Leo y Sam, con actividades distintas; orientadora (adulto seguro de la escuela).
- **Barrio:** vecinos diversos al azar, la encargada de la tienda, la bibliotecaria, transeúntes, perros y gatos.

Los personajes fijos solo saludan con líneas neutras. Quien tiene un papel en la historia habla por escenas. Tocar animales o vehículos cotidianos registra la iniciativa de exploración de forma natural.

Algunas personas y animales vigilan al niño: se voltean hacia él según de qué lado esté (ver `contenido/README.md`).

## Mundo

Casa (sala y comedor, cocina, recámaras, baño, patio), escuela (dos plantas: la baja con patio y cancha al centro, salones, oficina de la orientadora, baños y entrada; la alta con galería, salones, sala de cómputo y baños), biblioteca, parque, tienda del vecindario y calle. Los mapas viven en `public/mapas/`.

El tiempo del día sigue `src/datos/dia.ts`: mañana (escuela), tarde (casa, tienda, parque) y noche (a dormir). La historia del demo cubre seis días (`DIAS` en `src/datos/progreso.ts`). `npm run tiempo` estima cuánto dura cada día con los supuestos que dice el archivo; el tablero da los minutos reales de cada niño.

**Días libres.** Al dormir la noche del último día, un cartel dice que terminó la historia y deja seguir jugando o empezar de nuevo. Después siguen los días libres, todos iguales y sin historia nueva:

- Los objetivos solo nombran la rutina: la escuela en la mañana, volver a casa en la tarde y dormir en la noche.
- Cada día se repiten las tareas libres (`libre: true` en `contenido/escenas.yaml`): comer en casa, los compañeros en el recreo, el trabajo en la tiendita y un pensamiento antes de dormir.
- Lo que el niño hace con el tiempo sin nada que hacer también se mide (`metodologia.md`).

Así la sesión del piloto dura una hora sin alargar la historia (`validacion.md`).

## Arte y aparato

- Las Chromebooks escolares son de gama baja: el arte es **2D** (pixel art o ilustración plana), sin efectos pesados. 3D queda fuera.
- Corre en el navegador. Los datos se guardan en el aparato y se envían cuando hay red. Hoy el juego necesita conexión para abrirse; poder abrirlo sin red está pendiente.
- **Producción de arte.** Todo el arte es una pieza de `public/assets/manifiesto.yaml`, con su medida, su carpeta y qué es. `npm run provisionales` crea el provisional de cada pieza nueva y `npm run arte` lista lo que falta mandar a hacer. Mientras una pieza sea provisional, el juego muestra su respaldo: la cabeza de la figura en vez del retrato, el emoji en los minijuegos, la ropa de casa en vez de la de deporte. El arte final se pone reemplazando el PNG con el mismo nombre y la misma medida; no se toca código.
- Todo lo hablado aparece también escrito. El texto es mínimo: a los adolescentes no les gusta leer, y a los que traen problemas menos.

## Inmersión y efectos

| Momento | Efecto |
| --- | --- |
| Inquietud | Cambio breve en el ambiente y en la animación del personaje |
| Miedo | Respiración del personaje y acercamiento suave de cámara |
| Mayor intensidad | Efecto breve, con posibilidad de pausa |
| Acompañamiento | Recuperación gradual del ambiente, con el control en manos del jugador |
| Alegría | Luz cálida, animación de celebración, música amable |

- Los efectos se pueden reducir o desactivar con **Efectos** en Opciones. Con 0, no salen.
- La historia se entiende sin efectos.
- No se usan movimientos bruscos ni repetitivos de cámara como recurso principal.

## Escenas, decisiones y registro

- Una escena tiene una línea de alguien, y a veces opciones. Las opciones aparecen en un orden distinto para cada niño.
- Tres voces, cada una con su aspecto, en escenas y en globos del mundo: diálogo (pergamino), pensamiento (lila y cursiva) y sistema (oscuro, con título). Sistema es solo para instrucciones del juego: la misión, las preguntas antes de elegir y lo que pide cada minijuego. La historia nunca va en esa voz.
- En una misión principal, tocar fuera o **Seguir después** cierra el panel y deja la escena pendiente; el jugador puede seguir por el mundo y reabrirla al interactuar con el objetivo. Al volver, el minijuego empieza de nuevo y el intento anterior queda en analíticas. Las escenas sugeridas conservan su omisión al tocar fuera. No hay un botón general para omitir objetivos. Se registra el último avance, incluidas respuestas vacías y la etapa alcanzada, sin inventar marcas o resultados que no ocurrieron.
- Tocar fuera de un diálogo no hace nada. Para dejar una escena a medias está Pausar, que aparece en todas las escenas: la escena guarda la línea donde iba y, al volver, sigue ahí.
- El orden es permisivo: una escena que llega antes no bloquea el juego; se juega su variante. Solo unas pocas escenas esperan a otra. `tras` lo anuncia con "Primero: …"; `si` espera una marca sin anunciarlo. Ninguna escena espera en la cama (`contenido/README.md`).
- Cada opción lleva un código que **describe** lo que hizo. El código no dice si fue bueno o malo.
- Una escena delicada siempre permite omitirla, pausarla y pedir ayuda con el botón de siempre. La ruta de protección no depende de elegir bien una opción ni de haber vivido otra escena.
- Elegir callar, obedecer o retirarse nunca se presenta como responsabilidad del protagonista.
- **Sin sesgo.** Ninguna situación llega calificada: ni el narrador ni los personajes dicen si algo está bien o mal, ni lo presentan como positivo o negativo antes de que el niño lo viva. Los adultos describen lo que pasa; no elogian ni regañan con juicios de valor.
- Las escenas de abuso sugieren la transgresión y cortan a negro. No se muestra violencia sexual. Lo que se nombra en lenguaje claro, según la edad, lo revisan los especialistas.
- Lo que el niño deja sin hacer, como apagar la estufa, lo retiene la puerta una vez: se le recuerda y, si insiste, puede salir. El juego no le pregunta si lo va a hacer: lee lo que hace.
- Al volver, la consecuencia llega como escena y como hecho (la comida quemada; mamá tuvo que apagar la estufa porque le avisaron). No es un juicio: el juego registra qué hace después, por ejemplo si limpia el sartén.

## Versión completa: cómo se arma (borrador)

Es el guion a grandes rasgos de las 30 horas, para validar con CESMA y Psicopedagogía. El piloto de una hora es el primer bloque de la versión completa (`validacion.md`).

- **Qué observa cada capítulo.** Se apoya en las áreas de `contenido/areas.md`. Las áreas se ven en lo que el niño hace; nunca se le muestran como prueba.
- **Responsabilidad.** Los pendientes son el único sistema para esto: el juego recuerda una vez lo que el niño dejó sin hacer y después lo deja salir. Lo que pasa después y lo que hace con ello se registra. La base es la Escala de Afrontamiento para Niños (EAN), que distingue el afrontamiento centrado en el problema del improductivo, y se usa para decidir qué se observa, no para calificar en pantalla.
- **Experiencias adversas, sin cuestionario.** El ACE-Q se hizo para adultos que recuerdan su infancia. Pregunta de frente por violencia, abuso sexual y cárcel en la casa, es detonante para quien lo vivió, y McLennan et al. (2020) cuestionan su uso. El juego observa esas situaciones en la conducta del niño en los capítulos 3 y 6.
- **Ánimo.** El PHQ-A pregunta por el ánimo de las dos últimas semanas. Todavía no hay escena que lo observe (`sintomas_emocionales` en `areas.md`). Por ahora la única señal son las emociones que el niño elige en las opciones. Es el hueco más grande del guion.
- **Un solo informante.** Kuhn et al. (2017) encuentran que combinar el reporte del adolescente con el de sus padres detecta mejor, y que si solo se puede uno, debe ser el de los padres. El juego tiene solo el del niño, así que el reporte de un adulto es indispensable (`areas.md`, `metodologia.md`).

### Plan por jornada

Agrupa las jornadas del storyboard (`Ejemplo de secuencia de jornadas`, sección 4) en bloques de horas, con la lista de prioridades (sección 8). Las horas son un supuesto por validar: el piloto dirá cuánto tarda cada bloque.

| Jornada | Horas | Qué pasa | Estado en `escenas.yaml` |
| --- | --- | --- | --- |
| 1 · Tutorial, desayuno y escuela | 0–1 | Casa, uniforme, primer recreo, compras | Hecho (`T03`–`T09`, `U01`, `R01`–`R02`, `C03`) |
| 2 · Examen y amistad | 1–3 | Examen, recreo con Leo, noche con el padre | Hecho (`X01`, `R05`, `E2-01`, `E2-02`) |
| 3 · Proyecto y orientadora | 3–5 | Consecuencia, reconocimiento, orientadora, proyecto en parejas | Hecho en versión corta (`E2-04`, `E2-05`, `O01`, `C02`, `D3-biblio`, `D3-cena`). Falta la versión con las tres ramas |
| 4 · Deporte o feria | 5–8 | Competencia de Valeria, educación física, feria | Versión corta en el día 4 (`D4-ef`, `D4-competencia`, `D4-sam`), y libres `L-feria`, `L-desacuerdo` |
| 5 · Conflicto en casa | 8–14 | Varios días con el padre: crítica, chantaje, secuelas en la noche y en la escuela | Versión corta: `E2-02`, `E2-04`, `D4-papa`, `D5-firma-papa`, `D6-cena`. Falta la versión larga |
| 6 · Nueva jornada y redes | 14–20 | Amistades que crecen, exposición de Leo, calificación baja, cumpleaños | Versión corta en el día 5 (`D5-calif`, `D5-expo`, `D5-leo`) y el cumpleaños en el día 6 (`D6-parque`, `D6-permiso`) |
| 7 · Vida cotidiana | 20–24 | Lluvia, barrio, tiendita, recreos | Hecho en libres: `L-comer`, `L-lluvia`, `L-barrio`, `L-trabajo`, `L-noche` |
| 8 · Tío de visita | 24–27 | Storyboard `E1-01` a `E1-10` | Fuera del demo. Va después de validar el storyboard |
| 9 · No resolverlo solo | 27–30 | Comunicar necesidades, adulto seguro, ruta de protección | Versión corta en el día 6: `D6-leo`, `D6-orientadora` (adulto seguro). Falta la ruta completa |

Lo que falta para la versión completa, en orden:
1. La ruta de protección de la jornada 9, con un adulto seguro siempre disponible (storyboard, sección 8, prioridad 7).
2. El seguimiento de la jornada 5, con días que se conectan entre sí.
3. Los libres de la jornada 7 que ya tienen texto: revisión de los especialistas.

## Lo que el juego nunca hace

- Preguntarle al jugador algo sobre sí mismo. Los personajes de la historia sí hablan con su personaje.
- Mostrar un marcador, una calificación, un premio o un castigo por lo que se mide.
- Poner un reloj en pantalla.
- Decir que avisó a alguien: "Quiero hablar con alguien" muestra líneas de ayuda reales (075, Línea de la Vida y 911) y la orientación de su escuela, y queda en el registro. Los números están en `contenido/textos.yaml`.
- Poner en un objetivo a una persona o a una escena emocional.
- Decirle al jugador si lo que eligió estuvo bien o mal.
- Usar mecánicas adictivas para retenerlo.
- Matar a alguien o dejar que alguien muera.
- Usar groserías o palabras vulgares.
