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
| `FIGURA:<id>` | Una figura de la casa, por su id (ej. `FIGURA:abuela`) |
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

Todos llevan: código del niño, sesión, versión del contenido, semilla de orden y milisegundos desde el inicio de la sesión.

| Evento | Datos | Para qué |
| --- | --- | --- |
| `personaje` | Cuerpo, tono, cabello, ropa, extras; cambios posteriores | Contexto; no se interpreta solo |
| `casa_figura` | Figura, cuarto, distancia al personaje, si la quitó | Quién forma el mundo del niño |
| `cuento_paso` | Suceso, paso, opciones en el orden mostrado, opción y código, toques previos, ms para decidir | El dato central |
| `carita` | Suceso, valor 1 a 5 | Cómo se siente el protagonista |
| `panel_cpe` | Suceso, íconos de cuerpo, pensamiento y entorno | Cuántas emociones distingue |
| `estado_cuerpo` | Suceso, estado elegido | Intensidad que el niño le da |
| `explora` | Objeto o lugar, ms de permanencia, visitas | Qué busca, evita, repite |
| `describe` | Escena, título, emoción por personaje | Lectura de una escena ambigua |
| `sobre_mi` | Frase, respuesta (`A`, `B`, `AMBOS`, `AHORA_NO`), ms | Lo que dice de su vida |
| `dibujo` | Trazos con color y orden, borrados, tiempo, imagen final | El dibujo y su proceso |
| `ahora_no` | Suceso y paso | Dónde no quiso entrar |
| `quiero_hablar` | Pantalla y hora | Dispara el aviso |
| `repetir_voz` | Pantalla | Separar duda de dificultad para leer |
| `inactividad` | Pantalla, duración | Pausas largas |

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
  "toques_previos": ["FIGURA:abuelo"],
  "ms_decidir": 9400
}
```

## Cómo leer el tiempo

El tiempo para decidir empieza cuando termina la voz. Incluye leer y pensar; solo se compara contra el propio niño (decisiones más lentas que su mediana), nunca contra otros.

## Lo que no se registra

Nombre (se queda en el aparato), foto, cámara, micrófono, ubicación, texto libre ni identificadores del aparato. El único contenido libre es el dibujo.
