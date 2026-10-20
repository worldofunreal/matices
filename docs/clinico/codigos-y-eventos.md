# Códigos y eventos

El juego guarda eventos con hora exacta, no conclusiones. Cada opción de cada suceso lleva un código asignado al escribir el contenido (`contenido/cuentos/*.yaml`) y revisado por los psicólogos. El reporte solo cuenta códigos.

## Códigos de "¿qué hace?"

| Código | Qué hace el personaje | Ejemplo en E01 (fiebre) |
| --- | --- | --- |
| `PROTEGE` | Atiende la necesidad y acompaña | Le toma la temperatura y se queda |
| `NOTA_SIN_ACTUAR` | Se da cuenta pero no hace nada | "Ya se te pasará" y sigue con lo suyo |
| `RECHAZA` | Regaña, se burla o lo aleja | "¡Otra vez tú! Déjame dormir" |
| `DANA` | Hace algo que lastima (siempre simbolizado) | Lo saca del cuarto de mal modo |
| `AUSENTE` | No llega o se va | No llega nadie |
| `AUTOSUFICIENTE` | El protagonista lo resuelve solo | Busca la medicina solo |
| `CUIDA_A_OTRO` | El protagonista cuida a un adulto o hermano | Le prepara algo de comer al adulto |
| `BUSCA_AYUDA` | El protagonista va a buscar a alguien | Va a despertar a alguien |
| `OTRA` | El niño dibuja otra cosa | El dibujo queda para el psicólogo |
| `NO_SE` | "No sé" | — |

`OTRA` y `NO_SE` se agregan solos a toda lista de opciones; no se escriben en los archivos de contenido.

## Códigos de lo que hace el protagonista (E08, E09, E10, E12)

| Código | Qué hace |
| --- | --- |
| `SE_ENOJA` | Se enoja, avienta o grita |
| `SE_VA` | Se aleja solo |
| `SE_QUEDA_QUIETO` | Se queda mirando o esperando sin actuar |
| `AYUDA_A_OTRO` | Ayuda a otro niño (prosocial) |
| `IGNORA_A_OTRO` | Sigue en lo suyo ante alguien que necesita ayuda |
| `SE_BURLA` | Se ríe de otro |

También usan `BUSCA_AYUDA`, `AUTOSUFICIENTE` y `CUIDA_A_OTRO`.

## Códigos de "¿quién llega?"

| Código | Significado |
| --- | --- |
| `FIGURA:<id>` | Una figura de la casa, por su id de `contenido/figuras.yaml` (ej. `FIGURA:abuela`). Si la puso más de una vez, la segunda es `FIGURA:hermano_menor#2` |
| `ESCUELA:<id>` | Una persona de la escuela (`maestra`, `companero`, `conserje`, `directora`) |
| `VECINO` | Un vecino o vecina |
| `NADIE` | No llega nadie (se suma a `AUSENTE`) |
| `SOLO` | El protagonista lo resuelve solo (se suma a `AUTOSUFICIENTE`) |
| `NO_SE` | "No sé" |

## Códigos de "¿a quién culpa?" (solo E07 y E13)

`SE_CULPA`, `CULPA_A_OTRO`, `MINIMIZA`, `NO_LO_NOMBRA`.

## Códigos de la escena para describir (D01)

| Código | Título que elige el niño |
| --- | --- |
| `ESPERA_A_ALGUIEN_QUE_LLEGA` | Espera a alguien que ya viene |
| `ESPERA_A_ALGUIEN_QUE_NO_LLEGA` | Espera a alguien que no va a llegar |
| `CASTIGO` | Lo castigaron y no puede salir |
| `MIRA_ALGO_BONITO` | Está viendo algo bonito afuera |
| `TIENE_MIEDO` | Tiene miedo de algo de afuera |

## Eventos

Todos llevan: código del participante, sesión, versión del contenido y del juego, semilla de orden, milisegundos desde el inicio de la sesión (`t_ms`), hora (`cuando`) y su número en el aparato (`id`).

| Evento | Datos | Para qué |
| --- | --- | --- |
| `personaje` | Al crearlo (`inicio`) y en cada cambio en el espejo (`espejo`): cuerpo, tono, orden en que se mostraron los tonos, cabello y su color, ropa, extras, color de mochila, si el nombre salió de la lista, toques y tiempo. Nunca el nombre | Contexto; no se interpreta solo |
| `casa_figura` | Qué hizo (`poner`, `mover`, `quitar`, `renombrar`, `piel`), figura, si es adulto, menor o mascota, cuarto, distancia al personaje en cuadros, orden. Al terminar, `casa_lista` con todas las figuras y el tiempo | Quién forma el mundo del niño |
| `cuento` | Suceso y si empezó, terminó o se dejó con "Ahora no" | Cuántos cuentos se completan |
| `cuento_paso` | Suceso, paso, opciones en el orden mostrado, opción y código, ms para decidir desde que aparece el paso | El dato central |
| `carita` | Suceso, valor 1 a 5 | Cómo se siente el protagonista |
| `panel_cpe` | Suceso, íconos de cuerpo, pensamiento y entorno | Cuántas emociones distingue |
| `estado_cuerpo` | Suceso, estado elegido | Intensidad que el niño le da |
| `explora` | Al tocar un objeto o a una persona fija (lugar y cuál), y al salir de un lugar (lugar, ms de permanencia, visitas) | Qué busca, evita, repite |
| `tramo` | Día y parte del día que empieza (`manana`, `tarde`, `noche`, `fin`) | Ritmo de la partida |
| `describe_paso` | Escena, paso (`titulo`, `emocion`, `plato`), opciones en el orden mostrado, opción y código, ms para decidir | Cada decisión de la escena ambigua |
| `describe` | Escena, título, emoción y plato (de quién es el otro plato), ms | Lectura de una escena ambigua |
| `sobre_mi` | Frase, área, respuesta (`A`, `B`, `AMBOS`, `AHORA_NO`), lado que dice Tito (`tito_dice`), orden, ms para decidir | Lo que dice de su vida |
| `actividad` | Actividad, `que` (`inicio`, `fin` o `ahora_no`) y ms al terminar | Cuánto dura cada actividad y dónde se detiene |
| `aterrizaje` | Día, plantas regadas y ms | Cómo cierra el día |
| `dibujo` | De dónde salió (suceso y paso de "Otra cosa", o dibujo libre), trazos con color, grosor, goma y tiempo de cada punto, cuántos deshizo, tiempo, imagen final | El dibujo y su proceso |
| `ahora_no` | Suceso y paso | Dónde no quiso entrar |
| `quiero_hablar` | Pantalla y hora | Dispara el aviso |
| `repetir_voz` | Pantalla y línea que pidió oír | Separar duda de dificultad para leer |
| `inactividad` | Pantalla, duración (pausas de 30 s o más) | Pausas largas |

## Ejemplo

```json
{
  "nino": "K7-0412",
  "sesion": 3,
  "contenido": "0.1.0",
  "semilla": 51873,
  "t_ms": 418230,
  "tipo": "cuento_paso",
  "cuento": "E01",
  "paso": "quien_llega",
  "opciones": ["FIGURA:tia", "NADIE", "SOLO", "FIGURA:abuelo", "NO_SE"],
  "elegida": "SOLO",
  "ms_decidir": 9400
}
```

## Cómo leer el tiempo

El tiempo para decidir empieza cuando aparece el paso o la carta. La voz solo suena si el niño toca la bocina, así que no cuenta como inicio. Incluye leer y pensar; solo se compara contra el propio niño (decisiones más lentas que su mediana), nunca contra otros.

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
