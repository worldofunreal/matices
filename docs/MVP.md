# MVP · Día 1 jugable

> El MVP es lo mínimo para la **fase 1 del piloto** (prueba de uso con niños, en el formato que apruebe la institución): ver si los niños entienden, cuánto tardan y si algo los altera. No produce reportes clínicos.

## Qué incluye

| Área | Incluye | No incluye |
| --- | --- | --- |
| Juego | Consentimiento del niño, creación de personaje (niña, niño, neutro; 8 tonos; 4 peinados; uniforme y ropa de casa), armar la casa, Día 1 completo (casa, calle, escuela, parque), sucesos E00, E03, E07, E09, dibujo libre, calma y aterrizaje, Mi libro, Ahora no, Quiero hablar con alguien | Días 2 y 3, tiendita, biblioteca de la colonia, Sobre mí, escena para describir, estados del cuerpo |
| Voz | La Cuentera y todas las tarjetas del Día 1 | Resto |
| Datos | Código del niño, eventos cifrados en el aparato, pausa y regreso, salida en archivo cifrado (modo A) | Estación en red, servidor, reportes, reglas de revisión |
| Contenido | YAML con esquema validado para los 4 sucesos | Resto de sucesos (ya escritos, sin integrar) |

## Hitos

| Hito | Listo cuando |
| --- | --- |
| M1. Mundo caminable | El personaje camina por la casa, la calle y la escuela en la tableta de referencia a 60 cuadros por segundo |
| M2. Personaje y casa | Se crea el personaje por capas y se arma la casa; todo queda en eventos |
| M3. Modo cuento | E00 se juega de punta a punta con voz, tarjetas, caritas y "Ahora no"; las opciones salen barajadas |
| M4. Datos | Los eventos se guardan cifrados sin red; se cierra la app a la mitad y se retoma sin perder nada; el archivo cifrado se abre en la computadora del psicólogo |
| M5. Día 1 completo | Tres pruebas internas (adultos del equipo) terminan el Día 1 sin ayuda; se mide cuánto tarda |
| M6. Revisión clínica | Los psicólogos aprueban textos, tarjetas y códigos del Día 1 (`docs/PENDIENTES.md`) |

## Criterios de aceptación para probarlo con niños

- [ ] Ninguna pantalla muestra puntos, resultados ni "bien hecho".
- [ ] "Quiero hablar con alguien" visible en todas las pantallas y probado sin red.
- [ ] Todas las opciones tienen voz y código.
- [ ] Ningún dato sale del aparato con nombre.
- [ ] Consentimiento del tutor y del niño aprobado por el abogado y el comité de ética.
- [ ] El psicólogo que lo use recibió una práctica con el juego y con la salida de datos.
