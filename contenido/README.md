# Contenido

Texto de las situaciones y del resto del juego. El juego lee estos archivos tal cual; los psicólogos los revisan aquí. Versión del contenido: `0.2.0` (borrador, sin revisión clínica).

| Archivo | Qué es |
| --- | --- |
| `situaciones.yaml` | Las situaciones cotidianas (GDD §9): quién reacciona, qué dice y las respuestas con su código |
| `figuras.yaml` | Las figuras para armar la casa y si son adultos, menores o mascotas |
| `textos.yaml` | Textos fijos: creación de personaje, los 40 nombres, casa, mundo, letreros de las salidas |

## Forma de una situación

```yaml
- id: S01                    # único
  nombre: Correr en la casa
  lugar: casa                # un mapa de public/mapas/
  cuando: correr             # lo que hace el niño: correr
  quien: adulto_cerca        # quién reacciona: la persona adulta de la casa más cerca del niño
  areas: [conducta]
  aviso: "¡No corras dentro de la casa!"            # la primera vez
  pregunta: "Te dije que no corrieras dentro…"      # la segunda; después vuelve el aviso
  respuestas:                                       # [CÓDIGO, texto]
    - [DESAFIA, "Me vale pito"]
```

## Reglas

- Toda respuesta lleva un código de `docs/clinico/codigos-y-eventos.md`. Una respuesta sin código o con un código que no existe rompe la compilación.
- `IGNORA` (alejarse sin contestar) se agrega solo; no se escribe.
- Respuestas de dos o tres palabras; tres por situación como máximo, para que quepan abajo en una fila.
- Las áreas son las de `docs/clinico/marco-clinico.md`.
- Textos a nivel de 3.º de primaria, en español de México, sin violencia explícita y sin género (quien reacciona puede ser mamá o papá).
- Cambiar un texto sube la versión del contenido; los reportes guardan la versión que vio cada niño.
