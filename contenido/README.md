# Contenido

Texto de los sucesos y de las actividades. El juego lee estos archivos tal cual; los psicólogos los revisan aquí. Versión del contenido: `0.1.0` (borrador, sin revisión clínica).

| Archivo | Qué es |
| --- | --- |
| `cuentos/E00.yaml` … `cuentos/E14.yaml` | Los 15 sucesos para completar |
| `sobre-mi.yaml` | Las 24 frases de los gemelos Tito y Tita |
| `escena-para-describir.yaml` | La escena ambigua del día 2 |
| `panel-cpe.yaml` | Opciones del panel cuerpo / pensamiento / entorno |
| `figuras.yaml` | Las figuras para armar la casa y si son adultos, menores o mascotas |
| `textos.yaml` | Textos fijos: el sí del niño, la creación de personaje, los 40 nombres |

## Forma de un suceso

```yaml
id: E01                      # único
titulo: La fiebre
dia: 3                       # 1, 2 o 3
intensidad: media            # baja | media (no existe alta)
lugar: casa.recamara
hora: noche                  # manana | tarde | noche
area_principal: necesidades_fisicas
areas: [apoyo_emocional, supervision]
inicio: "Es de noche. {nombre} tiene fiebre…"
pasos:
  - id: quien_llega
    pregunta: "¿Quién llega?"
    personas: [casa, vecino, nadie, solo]   # tarjetas de personas
  - id: que_hace
    pregunta: "¿Qué hace {quien}?"
    opciones:                               # [CÓDIGO, texto]
      - [PROTEGE, "Le toma la temperatura y se queda"]
    opciones_solo:                          # si eligió "nadie" o "solo"
      - [AUTOSUFICIENTE, "{nombre} busca la medicina solo"]
  - id: carita                              # cinco caritas + panel cuerpo/pensamiento/entorno
```

## Reglas

- Toda opción lleva un código de `docs/clinico/codigos-y-eventos.md`. Una opción sin código o con un código que no existe rompe la compilación.
- `OTRA` (dibujarla) y `NO_SE` se agregan solos a cada lista. "Ahora no" siempre está disponible.
- `{nombre}` es el nombre del personaje; `{quien}` es la persona elegida en el paso anterior.
- `personas`: `casa` (figuras que el niño puso), `casa_adultos` (solo adultos de la casa), `escuela`, `vecino`, `nadie`, `solo`.
- `solo_si`: el paso solo aparece si en el paso anterior se eligió uno de esos códigos.
- Textos a nivel de 3.º de primaria, en español de México, sin violencia explícita.
- Cambiar un texto sube la versión del contenido; los reportes guardan la versión que vio cada niño.
