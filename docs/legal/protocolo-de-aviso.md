# Protocolo de aviso

Toda señal del juego llega a un psicólogo, y él decide. El juego nunca acusa ni avisa por su cuenta a familias o autoridades.

```mermaid
flowchart TD
  A["El niño aprieta «Quiero hablar con alguien»<br/>aviso inmediato a la consola"] --> B["El psicólogo se acerca<br/>y habla con el niño en privado"]
  C["Una regla marca «revisar pronto»<br/>después de la sesión"] --> D["El psicólogo lee el reporte<br/>y lo cruza con sus pruebas y una entrevista"]
  B --> E{"¿Revelación o sospecha<br/>fundada de riesgo?"}
  D --> E
  E -- sí --> F["Protocolo de la institución<br/>aviso a la Procuraduría de Protección<br/>(art. 12 LGDNNA)"]
  E -- no --> G["Seguimiento del psicólogo<br/>el reporte queda como observación"]
```

## Reglas

- Una marca del juego, sola, no es una revelación: es un motivo para evaluar.
- Si el niño cuenta algo directamente, la ley obliga a avisar (art. 12 LGDNNA, que obliga a toda persona). El psicólogo sigue el protocolo de la institución sin esperar el reporte.
- Si un niño se altera, el psicólogo pausa ese aparato desde la consola y el juego pasa al aterrizaje.
- El juego nunca le muestra al niño que hubo un aviso, salvo la pantalla del botón que él apretó: "Ya le avisamos a [nombre]. Puedes seguir jugando o esperar aquí."
- Cada aviso y lo que se hizo queda en la bitácora de la consola, visible solo para psicólogos.

## "Quiero hablar con alguien" sin red

Si la red local se cae, el aparato muestra una señal discreta en una esquina que solo el psicólogo conoce, y el psicólogo recorre el salón. Al volver la red, el aviso se envía con su hora original.

## Lo que define cada institución

Quién avisa a la Procuraduría, en cuánto tiempo, con qué formato, y cómo se acompaña al niño mientras tanto. Ver `docs/PENDIENTES.md`.
