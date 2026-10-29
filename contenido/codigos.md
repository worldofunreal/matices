# Códigos y eventos

El juego guarda eventos con hora exacta, no conclusiones. Cada opción de cada escena lleva un código asignado al escribir el contenido (`contenido/escenas.yaml`). El código describe lo que el niño contestó; nunca dice si fue bueno o malo, y el juego nunca se lo dice al niño.

## Códigos de las opciones

| Código | Qué contesta el niño | Ejemplo |
| --- | --- | --- |
| `ACEPTA` | Acepta la propuesta o la indicación | "Está bien, mamá. Que te vaya bien." |
| `PREGUNTA` | Pregunta por algo | "¿Mañana podemos desayunar juntos?" |
| `PROPONE` | Hace una propuesta propia | "¿Y si combinamos las dos?" |
| `PIDE_AYUDA` | Pide ayuda o algo que necesita | "¿Podrías ayudarme antes de irte?" |
| `CUENTA` | Cuenta algo de lo que le pasa | "Me pasa algo en mi casa." |
| `EXPRESA_AGRADO` | Dice lo que le gusta o lo que disfruta | "A mí me gusta dibujar." |
| `EXPRESA_MALESTAR` | Dice cómo se siente: nervioso, incómodo, cansado | "Me siento algo nervioso." |
| `COMPARTE` | Enseña algo o pide conversar | "Solo quería enseñártelo." |
| `DESACUERDO` | No está de acuerdo | "No estoy de acuerdo." |
| `POSPONE` | Deja algo para después | "Tal vez después." |
| `EVITA` | Cambia de tema o no responde de lleno | "No quiero discutir." |
| `CALLA` | Guarda silencio | "Guardar silencio." |
| `SE_RETIRA` | Se va sin contestar | "Retirarme sin contestar." |
| `ELIGE_UNIFORME` | Elige el uniforme del día (minijuego del ropero) | — |
| `ELIGE_DEPORTE` | Elige la ropa de educación física (minijuego del ropero) | — |
| `ELIGE_CASUAL` | Elige ropa casual (minijuego del ropero) | — |

Cuando una escena le presenta opciones, el juego espera hasta que elija una. No hay forma de salir de una opción sin contestarla, salvo en las escenas que el guion marca como saltables.

## Eventos

Todos llevan: código del participante, sesión, versión del contenido y del juego, semilla de orden, milisegundos desde el inicio de la sesión (`t_ms`), hora (`cuando`) y su número en el aparato (`id`).

| Evento | Datos | Para qué |
| --- | --- | --- |
| `personaje` | Al crearlo (`inicio`) y en cada cambio en el espejo (`espejo`): cuerpo, tono, orden en que se mostraron los tonos, cabello y su color, ropa, extras, color de mochila, color de cada prenda, tenis y extra que lleva (`colores`), si el nombre salió de la lista, toques y tiempo. Nunca el nombre | Contexto; no se interpreta solo |
| `escena` | Escena (`escena`), paso (`inicio`, `opcion`, `fin`), quién habla, opciones en el orden mostrado, la elegida (código) y ms para decidir desde que aparecen. En `fin`, si la escena se saltó (`saltada`) o se pausó (`pausada`) | Qué hace, qué contesta y cómo decide |
| `minijuego` | Minijuego, resultado (`completado`), ms que duró y, si lo tiene, el código de la elección | Cómo juega |
| `explora` | Al tocar un objeto o a una persona fija (lugar y cuál), y al salir de un lugar (lugar, ms de permanencia, visitas) | Qué busca, evita, repite |
| `tramo` | Día y parte del día que empieza (`manana`, `tarde`, `noche`, `fin`) | Ritmo de la partida |
| `corre` | Lugar y ms que corrió, al dejar de correr | Cuánto corre y dónde |
| `accion_personaje` | Acción realizada (`brincar`, `golpear`, `patear`), lugar, objetivo alcanzado (`objetivo`), tipo (`npc`, `fauna`, `objeto`, `muro`, `nada`), coordenadas `x`, `y` y `distancia` | Patrones de exploración física, motricidad, impulsividad o interacción hacia personas, animales u objetos |
| `dibujo` | Trazos con color, grosor, goma y tiempo de cada punto, cuántos deshizo, tiempo, imagen final | El dibujo y su proceso |
| `quiero_hablar` | Pantalla y hora | Dispara el aviso |
| `repetir_voz` | Pantalla y línea que pidió oír | Separar duda de dificultad para leer |
| `inactividad` | Pantalla, duración (pausas de 30 s o más) | Pausas largas |

## Ejemplo

```json
{
  "nino": "K7-0412",
  "sesion": 3,
  "contenido": "0.3.0",
  "semilla": 51873,
  "t_ms": 418230,
  "tipo": "escena",
  "escena": "T05",
  "paso": "opcion",
  "de": "madre",
  "opciones": ["PREGUNTA", "ACEPTA", "PIDE_AYUDA", "EXPRESA_MALESTAR"],
  "elegida": "PIDE_AYUDA",
  "ms_decidir": 4100
}
```

## Cómo leer el tiempo

El tiempo para decidir empieza cuando aparecen las opciones. Incluye leer y pensar; solo se compara contra el propio niño (decisiones más lentas que su mediana), nunca contra otros.

## Eventos de producto

Para el equipo (PRD F16): dónde se atoran, abandonan o fallan. Llevan los mismos datos comunes que los clínicos.

| Evento | Datos | Para qué |
| --- | --- | --- |
| `pantalla` | Pantalla que se abre y la anterior | Embudos y abandono |
| `sesion` | Inicio, pausa, regreso, cierre y por qué (cerró la app, se quedó sin batería, terminó) | Dónde se va el niño |
| `toque_sin_efecto` | Pantalla y lugar del toque | Botones que no se entienden |
| `carga` | Qué se cargó y cuánto tardó | Tiempos de espera |
| `rendimiento` | Cuadros por segundo y memoria, cada minuto | Aparatos lentos |
| `error` | Mensaje y pantalla | Fallas |
| `aparato` | Sistema, navegador, tamaño de pantalla, versión del juego | Cruzar fallas con aparatos |

## Lo que no se registra

Nombre (se queda en el aparato), foto, cámara, micrófono, ubicación, texto libre ni identificadores únicos del aparato (el evento `aparato` solo dice el tipo). El único contenido libre es el dibujo.
