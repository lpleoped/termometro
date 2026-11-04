---
name: ux-ui-adopcion
description: >-
  Diseña la UX/UI del Termómetro de Equipo para que sea fácil de usar, fácil
  de adoptar y sin fricción: un trabajo por pantalla, siguiente paso visible,
  lenguaje de la persona y primer uso sin capacitación. Usar cuando el
  usuario pida diseño de flujo, pantallas, copy, usabilidad, adopción,
  fricción o rediseño de interfaz. Aplicar después de qa-huecos-flujo.
---

# UX/UI fácil de usar y de adoptar

La facilidad se mide en el primer recorrido completo, no en la cantidad de controles. Fácil de usar, fácil de adoptar, sin fricción con la persona.

No codear el diseño en este skill salvo pedido explícito de implementar.

## Antes de dibujar

1. Si no hay un registro fresco de `qa-huecos-flujo`, hacerlo primero. No diseñar encima de un flujo que no cierra.
2. Leer `producto-termometro`. El trabajo es clima de equipo. No convertir la herramienta en un test de usabilidad.
3. Leer [principios.md](principios.md). Entregar con [plantilla.md](plantilla.md).

## Dos experiencias

- **Integrante:** una vez, pocos minutos, sin cuenta y sin capacitación. Una pregunta visible, progreso, enviar, gracias. No ve el panel ni la palabra "instancia".
- **Facilitador:** pocas veces y tiene que confiar en el número. Un trabajo por pantalla. La acción primaria es el siguiente paso del recorrido, no un menú de todo lo que el sistema sabe hacer.

## Orden

1. Recorrido y handoffs (qué dato pasa de una pantalla a la otra).
2. Una acción primaria por paso. El resto es secundario o se va.
3. Estados de primer uso vacío, carga, error con recuperación, éxito con siguiente paso.
4. Copy en español rioplatense, concreto, en segunda persona.
5. Layout al final.

No empezar por color, marca ni librería de componentes.

## Presupuesto de fricción

Cada campo, clic, término interno o decisión es fricción. Se admite solo si sin eso el índice, la participación o el histórico quedan mal.

- Default sensato antes que formulario vacío (cantidad esperada editable, ponderaciones que ya suman 100 %).
- No pedir un dato que el sistema ya tiene.
- Traducir en la misma línea: instancia → ronda abierta; evaluación → cuestionario; ponderación → peso de la sección; cantidad esperada → cuántas personas deberían responder.

## Criterios de la propuesta

- Un facilitador nuevo publica, comparte y ve un índice sin que le expliquen la herramienta.
- Un integrante termina el link sin crear cuenta ni ver el backoffice.
- En cada pantalla cabe una frase: qué hay que hacer ahora.
- Vacío, error y éxito tienen siguiente paso.
- Después de publicar, el link para responder está a la vista.
- El índice se lee como 0–100 y semáforo, sin otra fórmula en la superficie.

## Fuera de este diseño

- Más navegación para ordenar pantallas que la persona no necesita.
- Un asistente que repregunta datos ya elegidos.
- Dashboard antes de la primera respuesta, como si hubiera un resultado.
- Jerga de implementación en títulos, botones o vacíos.
- SUS, otro índice, o cuentas para quien solo responde.
