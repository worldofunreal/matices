# Reporte para el psicólogo

Por cada niño, el psicólogo recibe un reporte escrito con conteos que describe lo que pasó en el juego, más todos los datos crudos. El reporte cuenta y describe; interpretar le toca al psicólogo.

## Partes

1. **Calidad de los datos.** Sesiones completas, minutos de inactividad, veces que repitió la voz, respuestas dadas antes de que terminara la narración. Si la calidad es baja, el reporte lo dice primero.
2. **Su personaje y su casa.** Imagen del personaje y de la casa, quiénes viven ahí y dónde los puso.
3. **Por área.** Para cada una de las 13 áreas, una o dos frases con conteos y enlace a los sucesos de donde salen.
4. **Patrones que cruzan áreas.** Cuántas veces buscó ayuda y a quién, dónde usó "Ahora no", en qué sucesos dudó más o cambió de opinión.
5. **Sobre mí.** Respuestas a los gemelos, agrupadas por área.
6. **Dibujo.** Imagen final y reproductor trazo por trazo.
7. **Exploración.** Lugares y objetos más visitados y los que nunca tocó.
8. **Marcas de revisión.** Reglas del equipo clínico que se cumplieron, con autor y fecha.
9. **Datos crudos.** CSV y JSON.

## Ejemplo de fragmento

```markdown
**Necesidades físicas** (E01, E02, E03, E08)
En 3 de 4 sucesos, en su historia no llegó ningún adulto (AUSENTE: 2, AUTOSUFICIENTE: 1).
En E03 llegó la tía y lo curó (PROTEGE).
En E01 tocó primero "el abuelo" y cambió a "lo resuelve solo"; fue su decisión más lenta de la sesión.

**Pedir ayuda**
En 10 sucesos donde podía buscar a alguien, lo hizo en 2. Las dos veces buscó a la tía.
Usó "Ahora no" una vez, en E13 (promesa incumplida).
```

## Reglas de escritura

- Solo verbos de lo que pasó: "eligió", "en su historia", "tocó", "no abrió".
- Ninguna etiqueta clínica; nada de "presenta", "sugiere" ni "indica".
- Ningún puntaje de riesgo ni comparación con otros niños hasta que el piloto lo valide.
- Cada frase enlaza a los eventos que la generan.

## Marcas de revisión

Las escribe el equipo clínico en la consola; el juego solo las aplica.

- Forma: una condición sobre conteos y una marca ("revisar pronto" o "revisar"). Ejemplo: si en 3 o más sucesos de necesidades físicas el código es `AUSENTE`, marcar "revisar pronto".
- Cada regla queda firmada con nombre y fecha, con historial de cambios.
- El juego se entrega **sin reglas activas**; las de este documento son ejemplos.
- "Quiero hablar con alguien" no depende de ninguna regla.

## Consola del psicólogo

Lista de niños por código con el estado de sus sesiones, avisos en vivo, pausa por aparato, marcas de revisión, reporte y descarga. Solo entran cuentas de psicólogo con contraseña y segundo factor.
