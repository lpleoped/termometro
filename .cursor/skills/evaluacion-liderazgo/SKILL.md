---
name: evaluacion-liderazgo
description: >-
  Diseña evaluaciones de liderazgo de equipo (rumbo, feedback, consideración,
  autonomía, liderazgo que habilita, liderazgo compartido, equidad y
  crecimiento) con criterio de evaluación, no de legajo individual. Genera
  plantillas reutilizables de encuestas prediseñadas, Likert 1–5, compatibles
  con el índice del Termómetro. Usar cuando pidan encuesta, cuestionario,
  pulso o plantilla sobre liderazgo, jefatura, feedback, autonomía, voz ante
  quien lidera o liderazgo compartido.
---

# Evaluación de liderazgo del equipo

Criterio de evaluación aplicado al liderazgo. El objeto es la **función de liderazgo que el equipo percibe**: quien lidera en forma formal y, cuando la plantilla lo dice, el liderazgo repartido entre pares. No es un legajo, una evaluación de desempeño de una persona, un 360 identificable ni un plan de coaching.

Si el objeto es el clima entre pares (seguridad, cohesión, carga, pertenencia, conflicto, justicia del trato), usar `evaluacion-psicologia`.

## Antes de redactar

1. Leer `producto-termometro` y `dominio-indicadores`.
2. Elegir **una** plantilla de [plantillas.md](plantillas.md), o componer una con las reglas de abajo.
3. Entregar la plantilla completa (guía de lectura + JSON). No implementar en seed ni API salvo pedido explícito.

## Contrato con el índice

El índice promedia Likert **1–5** y normaliza × 20. **No hay ítems invertidos.**

- **1 es bajo y 5 es alto** del aspecto nombrado. El 5 es siempre el polo favorable para el equipo.
- Ítem = rótulo del aspecto favorable (frase nominal), más una `descripcion` concreta para quien responde. No oraciones de acuerdo/desacuerdo.
- Un ítem, un aspecto. Sin doble cañón, sin doble negación, sin polo negativo (“ausencia de represalias” se redacta como posibilidad de hablar).
- Sin nombres. “Quien lidera” nombra la función, no una persona a identificar en el resultado. No pedir comparar a dos jefes.
- Secciones con `ponderacion` que **suman 100**. De 3 a 5 indicadores por sección (un pulso puede tener 4).
- `id` estable y único, prefijo de la plantilla. `tipo`: `CUSTOM`.
- Leer participación antes que el índice. Con pocas respuestas, la sección no se usa para juzgar a una persona.

## Qué no copiar ni concluir

No transcribir instrumentos ajenos (MLQ, LMX-7, escalas publicadas de liderazgo de servicio o liderazgo compartido). Citar el constructo y redactar ítems propios. Estas plantillas **no certifican** un estilo de liderazgo ni reemplazan un proceso de desempeño.

Una sección baja describe la experiencia del equipo con esa función. No autoriza una sanción, un ranking de jefes ni la frase “es mal líder”. El debrief es con el equipo, sobre la función.

## Cómo elegir

Una evaluación, un propósito, pocos constructos. Máximo 5 secciones. El índice global no alcanza: una sección alta puede tapar una baja.

| Si el propósito es… | Plantilla |
|---|---|
| Cómo se vive el liderazgo del día a día | Liderazgo cotidiano |
| Si se puede hablar, errar y pedir respaldo | Liderazgo que habilita |
| Cuánto liderazgo está en el equipo, no solo arriba | Liderazgo compartido |
| Reparto, crédito y crecimiento que viene de quien lidera | Equidad y crecimiento |
| Chequeo breve y repetible | Pulso de liderazgo |

Componer una nueva solo si ninguna cubre el propósito. Constructos permitidos: claridad de rumbo, feedback oportuno, consideración, autonomía, voz, error como aprendizaje, respaldo, influencia entre pares, decisión distribuida, respaldo lateral, equidad de carga, reconocimiento, crecimiento. Renormalizar pesos a 100. Declarar el propósito en una frase.

No mezclar en la misma sección “quien lidera” y “entre pares”. Si ambos importan, son dos secciones (o dos plantillas).

## Cómo ponderar

Pesa más el aspecto que, si falla, más impide el propósito de esta encuesta. Declarar en una línea por qué. Un pulso de dos secciones puede ir 50/50.

## Salida

1. Propósito (una frase), objeto (función formal, compartida, o las dos en secciones distintas) y para quién es el debrief.
2. Tabla sección → peso → constructo → qué no concluir.
3. JSON reusable:

```json
{
  "titulo": "",
  "descripcion": "",
  "version": "1.0",
  "tipo": "CUSTOM",
  "secciones": [
    {
      "titulo": "",
      "ponderacion": 0,
      "indicadores": [
        { "id": "", "texto": "", "descripcion": "" }
      ]
    }
  ]
}
```

4. Cómo leer: participación, cada sección, índice al final. Una pregunta de conversación por sección baja. Recordar que el número no es un dictamen sobre una persona.

Adaptar palabras al contexto manteniendo el constructo. Quitar una sección solo renormalizando a 100. No agregar ítems de polo negativo.

## Checklist

- [ ] Pesos suman 100 y cada ítem sube cuando la función de liderazgo se vive mejor
- [ ] Un aspecto por ítem; sin nombres; función separada de pares
- [ ] Ids únicos; 2 a 5 secciones; propósito explícito
- [ ] La guía impide usar el resultado como sanción o ranking
