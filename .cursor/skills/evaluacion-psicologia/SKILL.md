---
name: evaluacion-psicologia
description: >-
  Diseña evaluaciones de clima psicológico de equipo (seguridad, cohesión,
  confianza, pertenencia, carga, conflicto, justicia del trato) con criterio
  de magíster en Evaluación y psicología. Genera plantillas reutilizables de
  encuestas prediseñadas, Likert 1–5, compatibles con el índice del
  Termómetro. Usar cuando pidan encuesta, cuestionario, pulso o plantilla
  sobre clima psicológico, bienestar del equipo, seguridad psicológica,
  cohesión, confianza, carga, conflicto, pertenencia o trato. No es clínica
  ni selección de personas.
---

# Evaluación psicológica del equipo

Criterio de magíster en Evaluación, especializada en psicología de equipos. El entregable es una **evaluación**: qué aspecto se mide, con qué ítems, con qué peso y cómo se lee. No es terapia, diagnóstico clínico, selección ni intervención.

Si el objeto es el liderazgo (rumbo, feedback, autonomía, liderazgo compartido), usar `evaluacion-liderazgo`. Esta skill mide cómo está el equipo entre sí.

## Antes de redactar

1. Leer `producto-termometro` y `dominio-indicadores`.
2. Elegir **una** plantilla de [plantillas.md](plantillas.md), o componer una con las reglas de abajo.
3. Entregar la plantilla completa (guía de lectura + JSON). No implementar en seed ni API salvo pedido explícito.

## Contrato con el índice

El índice promedia Likert **1–5** y normaliza × 20. **No hay ítems invertidos.**

- **1 es bajo y 5 es alto** del aspecto nombrado. El 5 es siempre el polo sano del equipo.
- Ítem = rótulo del aspecto favorable (frase nominal), más una `descripcion` concreta para quien responde. No oraciones de acuerdo/desacuerdo: la ancla de pantalla no es “de acuerdo”.
- Un ítem, un aspecto. Sin doble cañón (“respeto y comunicación”), sin doble negación, sin “no tengo miedo”.
- Voz del equipo, no de una persona nombrada. Sin nombres, roles identificables ni “mi jefe”.
- Secciones con `ponderacion` que **suman 100**. De 3 a 5 indicadores por sección (un pulso puede tener 4).
- `id` estable y único, prefijo de la plantilla. `tipo`: `CUSTOM`.
- Unidad: el equipo, anónimo, agregable. Con poca participación, una sección puede ser la voz de una o dos personas: leer participación antes que el índice.

## Qué no copiar ni concluir

No transcribir instrumentos ajenos (MBI, UWES, Q12, escalas publicadas de Edmondson, Jehn, Colquitt u otras). Citar el constructo y redactar ítems propios. Estas plantillas **no están validadas** como escala psicométrica publicada.

No diagnosticar burnout, ansiedad, depresión ni “personas tóxicas”. Una sección baja es una percepción compartida de ese aspecto, no un caso clínico ni un culpable.

## Cómo elegir

Una evaluación, un propósito, pocos constructos separados. No armar un omnibus de más de 5 secciones: el índice esconde una sección fuerte que compensa una débil, y el debrief tiene que poder leer sección por sección.

| Si el propósito es… | Plantilla |
|---|---|
| Estado psicológico general del equipo | Clima psicológico del equipo |
| Ritmo, claridad, recuperación, apoyo | Carga y sostenibilidad |
| Si el roce ayuda o daña | Conflicto y reparación |
| Reparto, dignidad e información | Justicia y trato |
| Chequeo breve y repetible | Pulso psicológico |

Componer una nueva solo si ninguna cubre el propósito. Constructos permitidos: seguridad para hablar, cohesión de tarea, cohesión social, confianza de cumplimiento, confianza de integridad, pertenencia, carga sostenible, claridad de rol, recuperación, apoyo, desacuerdo de tarea, respeto en el roce, reparación, equidad, trato digno, información pareja. Renormalizar pesos a 100. Declarar el propósito en una frase.

No promediar “desacuerdo de tarea” con “respeto”. El primero puede estar alto y ser sano; el segundo bajo indica daño. Se leen aparte.

## Cómo ponderar

El peso es una decisión de evaluación, no un default decorativo. El aspecto que, si falla, más impide el propósito de esta encuesta pesa más. Declarar en una línea por qué. Dos secciones de pulso pueden ir 50/50.

## Salida

1. Propósito (una frase) y para quién es el debrief (facilitador del equipo).
2. Tabla sección → peso → constructo → qué no concluir.
3. JSON reusable, listo para guardar o sembrar, con esta forma:

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

4. Cómo leer: primero participación, después cada sección, al final el índice. Una pregunta de conversación por sección baja, no un veredicto.

Adaptar palabras al contexto (proyecto, squad, área) manteniendo el constructo. Quitar una sección solo renormalizando el resto a 100. No agregar ítems de polo negativo.

## Checklist

- [ ] Pesos suman 100 y cada ítem sube cuando el equipo está mejor
- [ ] Un aspecto por ítem; sin persona nombrada; sin lenguaje clínico
- [ ] Ids únicos; 2 a 5 secciones; propósito explícito
- [ ] Guía de lectura por sección, no solo el índice global
