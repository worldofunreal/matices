# PRD · Matices

> Documento de requisitos del producto. Versión 0.1 · 2026-10-19.

## 1. Problema

Los psicólogos que atienden niños en México atienden a muchos niños con poco tiempo. Sus pruebas de detección (SDQ, CBCL) dependen de lo que reportan padres y maestros; justo en casos de negligencia, el adulto que llena el cuestionario puede ser parte del problema. Las técnicas que le dan voz al niño (cuentos para completar, dibujo, títeres) toman una sesión individual larga por niño.

## 2. Propuesta

Un videojuego que el niño juega solo o en grupo, en el lugar y las sesiones que defina la institución, y que registra sus elecciones en situaciones cotidianas. El psicólogo recibe un reporte descriptivo por niño, con marcas que él mismo define para decidir a quién atender primero.

El juego recoge. El psicólogo interpreta. El juego no diagnostica.

## 3. Usuarios

| Usuario | Necesita | No debe |
| --- | --- | --- |
| Niño de 8 a 12 años | Un juego que entienda sin leer bien, que no lo juzgue, que pueda parar y pedir ayuda | Ver resultados, sentirse evaluado, ser identificado por sus compañeros |
| Psicólogo de la institución o del conglomerado | Reportes claros, datos crudos, avisos en vivo, reglas de revisión propias | Recibir etiquetas o puntajes de riesgo no validados |
| Institución (por confirmar: escuela, DIF u otra) | Consentimientos, control de datos, protocolo de aviso | Acceder a datos de niños fuera del psicólogo asignado |
| Tutor | Saber qué se hace, aceptar o rechazar, ejercer sus derechos | Recibir datos que pongan en riesgo al niño (pendiente legal) |

### Contexto de uso: por confirmar

Qué institución lo usa (escuela, DIF u otra), quién revisa los reportes y cuándo, cuántas sesiones hay y de cuánto tiempo, si se juega en grupo o uno a uno, si hay audífonos, red o internet: nada está confirmado. Depende de la llamada con la directora (preguntas en `PENDIENTES.md`). El desarrollo no se basa en ninguna de estas suposiciones; el juego funciona igual en cualquier caso:

| Lo que no sabemos | Cómo lo cubre el juego |
| --- | --- |
| Número y duración de sesiones | Se pausa en cualquier momento y retoma donde se quedó; los días del juego son capítulos, no sesiones |
| En grupo o uno a uno | Nada depende de que haya otros niños ni de que el adulto mire la pantalla |
| Con o sin audífonos | Todo lo hablado aparece también escrito |
| Con o sin red o internet | Funciona completo en el aparato; la salida de datos es aparte (`tecnico/arquitectura.md`) |
| Quién lee los datos y cuándo | Archivo cifrado que solo abre el psicólogo asignado, el mismo día o después |
| Institución | Ningún texto del juego la nombra |

Sugerencias para la llamada, válidas solo si la institución las aprueba: tres sesiones de unos 33 minutos, una por día del juego; grupo completo con audífonos; laptop del psicólogo con avisos en vivo por la red del salón.

## 4. Objetivos

1. Que un psicólogo pueda observar a muchos niños sin una sesión individual larga por niño, en el formato que apruebe la institución.
2. Que cada reporte cubra las 13 áreas del marco clínico con al menos dos observaciones por área.
3. Que ningún niño quede sin forma de pedir ayuda durante el juego.
4. Que el piloto pueda medir qué tanto coincide el juego con el juicio clínico.

## 5. Requisitos funcionales

### Juego (niño)
- F1. El consentimiento del tutor y el sí del niño se obtienen antes de dar acceso, fuera del juego (`legal/consentimiento-y-datos.md`); el juego no los pide.
- F2. Creación de personaje y armar la casa (GDD §6 y §7).
- F3. Mundo explorable: casa, calle, escuela, parque, tiendita, biblioteca.
- F4. 15 sucesos según `contenido/cuentos`, con orden barajado por semilla y reglas de intensidad.
- F5. Escena para describir, Sobre mí, dibujo libre.
- F6. "Ahora no" en todo suceso; "Quiero hablar con alguien" en toda pantalla.
- F7. Voz en toda línea y tarjeta; opciones de accesibilidad.
- F8. Funciona completo sin red ni internet; se pausa y se retoma en cualquier punto.

### Programa del psicólogo
- F9. Códigos de niño; lista código–nombre cifrada y separada.
- F10. Abrir los datos cifrados de cada aparato (archivo; red local o servidor si la institución los usa).
- F11. "Quiero hablar con alguien": señal en el aparato siempre; aviso en vivo solo si hay estación en red.
- F12. Reporte por niño (`docs/clinico/reporte.md`) y descarga CSV/JSON.
- F13. Editor de reglas de revisión firmadas y versionadas.
- F14. Bitácora de accesos y de avisos.

### Analítica del juego
- F16. Todo se mide: además de los eventos clínicos, el juego registra eventos técnicos y de uso (`clinico/codigos-y-eventos.md`, sección "Eventos de producto") para que el equipo encuentre dónde se atoran, se aburren o abandonan los niños, errores y problemas de rendimiento.
- F17. Los datos llegan a un servidor propio (no a un servicio externo). Tablero del equipo con embudos por pantalla, abandono, tiempos, errores y rendimiento por aparato. Separado de la consola del psicólogo: el equipo ve uso y técnica, no reportes clínicos por niño.

### Contenido
- F15. Sucesos y frases como archivos de datos; cada opción con código obligatorio. El contenido sin código no compila.

## 6. Requisitos no funcionales

| Tema | Requisito |
| --- | --- |
| Aparatos | Web, Android, iOS, Windows, macOS y Linux; la referencia de rendimiento es una tableta Android de gama baja (2 GB de RAM) |
| Rendimiento | 60 cuadros por segundo en la tableta de referencia; abre en menos de 20 s |
| Sin red | El juego funciona completo en el aparato, sin red ni internet; la salida de datos es aparte (`tecnico/arquitectura.md`) |
| Sesiones | Pausa y regreso en cualquier punto; ninguna duración ni número de sesiones fijo |
| Privacidad | Código en lugar de nombre; cifrado en reposo y en tránsito |
| Analítica | Todo se mide (F16, F17); los eventos esperan en el aparato y se envían cuando hay red |
| Idioma | Español de México con voz grabada |
| Accesibilidad | Ver GDD §15 |

## 7. Métricas

| Métrica | Dónde se mide |
| --- | --- |
| Niños que completan los 3 días del juego | Piloto fase 1 |
| Niños que entienden las consignas sin ayuda | Piloto fase 1 |
| Coincidencia entre marcas del juego y juicio clínico | Piloto fase 2 (`docs/investigacion/plan-piloto.md`) |
| Tiempo del psicólogo por reporte | Piloto fase 2 |

## 8. Fuera de alcance

- Diagnóstico, puntajes de riesgo o comparaciones con normas.
- Uso en casa o en tiendas de aplicaciones.
- Reproducir reactivos del SDQ, CBCL, BPI, MNBS-CR o láminas del TAT/CAT.
- Contactar a familias o autoridades desde el juego.
- Otros idiomas y lenguas indígenas (fase posterior).

## 9. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Falsas alarmas que dañen a familias | Sin marcas por defecto; reglas solo del equipo clínico; piloto antes de uso amplio |
| Niños que contestan "lo correcto" | Sin respuestas correctas, sin premios, personajes neutros |
| Si se juega en grupo: compañeros que se copian o se ven | Orden barajado; audífonos y acomodo, si la institución los tiene |
| Un tutor pide el reporte y eso pone en riesgo al niño | Pendiente legal (`docs/PENDIENTES.md`) |
| Niños sin firma (los de más riesgo) | Pendiente institucional |
| Validez de técnicas para 4–8 años llevadas a 8–12 | Piloto fase 2 |
