# Códigos y eventos

El juego guarda eventos con hora exacta, no conclusiones. Cada respuesta de cada situación lleva un código asignado al escribir el contenido (`contenido/situaciones.yaml`) y revisado por los psicólogos. El reporte solo cuenta códigos.

## Códigos de las respuestas

| Código | Qué contesta el niño | Ejemplo en S01 (correr en la casa) |
| --- | --- | --- |
| `DESAFIA` | Rechaza el límite | "Me vale pito" |
| `PROMETE` | Promete no repetirlo | "No lo vuelvo a hacer" |
| `SE_DISCULPA` | Pide perdón | "Perdón" |
| `IGNORA` | Se aleja sin contestar | — |

`IGNORA` se agrega solo a toda situación que pide respuesta; no se escribe en los archivos de contenido.

## Quién reacciona

| Código | Significado |
| --- | --- |
| `FIGURA:<id>` | Una figura de la casa, por su id de `contenido/figuras.yaml` (ej. `FIGURA:abuela`). Si la puso más de una vez, la segunda es `FIGURA:hermano_menor#2` |
| `NADIE` | No había nadie que reaccionara (la casa sin adultos) |

## Eventos

Todos llevan: código del participante, sesión, versión del contenido y del juego, semilla de orden, milisegundos desde el inicio de la sesión (`t_ms`), hora (`cuando`) y su número en el aparato (`id`).

| Evento | Datos | Para qué |
| --- | --- | --- |
| `personaje` | Al crearlo (`inicio`) y en cada cambio en el espejo (`espejo`): cuerpo, tono, orden en que se mostraron los tonos, cabello y su color, ropa, extras, color de mochila, color de cada prenda, tenis y extra que lleva (`colores`), si el nombre salió de la lista, toques y tiempo. Nunca el nombre | Contexto; no se interpreta solo |
| `casa_figura` | Qué hizo (`poner`, `mover`, `quitar`, `renombrar`, `piel`), figura, si es adulto, menor o mascota, cuarto, distancia al personaje en cuadros, orden. Al terminar, `casa_lista` con todas las figuras y el tiempo | Quién forma el mundo del niño |
| `situacion` | Situación y paso: `aviso` (la primera vez, con quién reaccionó), `pregunta` (cuando le habla), `respuesta` (código, opciones en el orden mostrado y ms para decidir desde que aparecen), `repite` (lo hizo otra vez después de contestar: veces y la respuesta que había dado) | El dato central: qué hace, qué contesta y si cumple |
| `perro` | `sigue` (empieza a seguirlo), `escapa` (sale corriendo) y `alcanza` (el niño lo alcanza, con ms desde que escapó) | Cómo juega |
| `explora` | Al tocar un objeto o a una persona fija (lugar y cuál), y al salir de un lugar (lugar, ms de permanencia, visitas) | Qué busca, evita, repite |
| `tramo` | Día y parte del día que empieza (`manana`, `tarde`, `noche`, `fin`) | Ritmo de la partida |
| `corre` | Lugar y ms que corrió, al dejar de correr | Cuánto corre y dónde |
| `dibujo` | Trazos con color, grosor, goma y tiempo de cada punto, cuántos deshizo, tiempo, imagen final | El dibujo y su proceso |
| `quiero_hablar` | Pantalla y hora | Dispara el aviso |
| `repetir_voz` | Pantalla y línea que pidió oír | Separar duda de dificultad para leer |
| `inactividad` | Pantalla, duración (pausas de 30 s o más) | Pausas largas |

## Ejemplo

```json
{
  "nino": "K7-0412",
  "sesion": 3,
  "contenido": "0.2.0",
  "semilla": 51873,
  "t_ms": 418230,
  "tipo": "situacion",
  "situacion": "S01",
  "paso": "respuesta",
  "quien": "FIGURA:abuela",
  "opciones": ["SE_DISCULPA", "DESAFIA", "PROMETE"],
  "elegida": "PROMETE",
  "ms_decidir": 4100
}
```

## Cómo leer el tiempo

El tiempo para decidir empieza cuando aparecen las respuestas. Incluye leer y pensar; solo se compara contra el propio niño (decisiones más lentas que su mediana), nunca contra otros.

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
