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

La propuesta organiza la historia en seis capítulos. Son una guía de escenas, no un reemplazo de capítulos ya desarrollados:

| Capítulo | Tema |
| --- | --- |
| 1 · Un día como cualquier otro | Tutorial doméstico, llegada a la escuela, primeros compañeros; señales familiares discretas |
| 2 · Pequeñas cosas que cambian | Examen, tarea, ir a la tienda, explorar; ver las rutinas sin convertirlas en tragedia |
| 3 · Palabras que pesan | Crítica, humillación y chantaje emocional de la figura paterna, junto a la vida escolar normal |
| 4 · Personas en quienes confiar | Profundizar amistades, cooperación, ferias o actividades; conocer adultos seguros |
| 5 · Un secreto que no debería existir | Visita de un tío, transgresión de límites. Fase posterior, después de validar el storyboard |
| 6 · No resolverlo todo a solas | Comunicar necesidades, alternativas de protección y acompañamiento |

## Protagonista

Nombre y apariencia los elige el jugador: cuerpo, piel, cabello, ropa, extras, tenis, y colores de cada prenda. El avatar se dibuja con las hojas de referencia del guion (pixel art juvenil, el mismo lenguaje visual del resto del juego).

## Personas

- **Familia:** madre (trabaja, sale temprano), padre (minimiza, presiona y chantajea emocionalmente), tío (visita; fuera del demo). La familia es fija; el jugador no la arma.
- **Escuela:** profesora (revisa el uniforme; no castiga la falta de uniforme con exclusión), compañeros Valeria, Leo y Sam, con actividades distintas; orientadora (adulto seguro de la escuela).
- **Barrio:** vecinos diversos al azar, la encargada de la tienda, la bibliotecaria, transeúntes, perros y gatos.

Los personajes fijos solo saludan con líneas neutras. Quien tiene un papel en la historia habla por escenas. Tocar animales o vehículos cotidianos registra la iniciativa de exploración de forma natural.

Algunas personas y animales vigilan al niño: se voltean hacia él según de qué lado esté (ver `contenido/README.md`).

## Mundo

Casa (sala y comedor, cocina, recámaras, baño, patio), escuela (dos plantas: la baja con patio y cancha al centro, salones, oficina de la orientadora, baños y entrada; la alta con galería, salones, sala de cómputo y baños), biblioteca, parque, tienda del vecindario y calle. Los mapas viven en `public/mapas/`.

El tiempo del día sigue `src/datos/dia.ts`: mañana (escuela), tarde (casa, tienda, parque) y noche (a dormir). El demo cubre tres días.

## Arte y aparato

- Las Chromebooks escolares son de gama baja: el arte es **2D** (pixel art o ilustración plana), sin efectos pesados. 3D queda fuera.
- Corre en el navegador y funciona sin conexión; los datos se envían cuando hay red.
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
- Todo minijuego se puede pausar para retomarlo u omitir como objetivo; tocar fuera también lo pausa. Se registra el último avance, incluidas respuestas vacías y la etapa alcanzada, sin inventar marcas o resultados que no ocurrieron.
- Tocar fuera de un diálogo no hace nada. Para dejar una escena a medias está Pausar, que aparece en todas las escenas: la escena guarda la línea donde iba y, al volver, sigue ahí.
- El orden es permisivo: una escena que llega antes no bloquea el juego; se juega su variante. Solo unas pocas escenas esperan a otra (`tras` en `contenido/README.md`).
- Cada opción lleva un código que **describe** lo que hizo. El código no dice si fue bueno o malo.
- Una escena delicada siempre permite saltar la secuencia sensible y pedir ayuda. La ruta de protección no depende de elegir bien una opción.
- Elegir callar, obedecer o retirarse nunca se presenta como responsabilidad del protagonista.
- Las escenas de abuso sugieren la transgresión y cortan a negro. No se muestra violencia sexual. Lo que se nombra en lenguaje claro, según la edad, lo revisan los especialistas.
- Lo que el niño deja sin hacer, como apagar la estufa, lo retiene la puerta una vez: se le recuerda y, si insiste, puede salir. El juego no le pregunta si lo va a hacer: lee lo que hace.
- Al volver, la consecuencia llega como escena y como hecho (la comida quemada; mamá tuvo que apagar la estufa porque le avisaron). No es un juicio: el juego registra qué hace después, por ejemplo si limpia el sartén.

## Lo que el juego nunca hace

- Preguntarle al jugador algo sobre sí mismo. Los personajes de la historia sí hablan con su personaje.
- Mostrar un marcador, una calificación, un premio o un castigo por lo que se mide.
- Poner un reloj en pantalla.
- Decirle al jugador si lo que eligió estuvo bien o mal.
- Usar mecánicas adictivas para retenerlo.
- Matar a alguien o dejar que alguien muera.
- Usar groserías o palabras vulgares.
