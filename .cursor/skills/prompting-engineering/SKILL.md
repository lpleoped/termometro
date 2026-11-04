---
name: prompting-engineering
description: Diseña prompts estructurados para interpretar encuestas de clima de equipos y generar planes de acción basados en indicadores cuantitativos, señales emocionales cualitativas y evidencia trazable.
---

# Prompting Engineering para clima de equipos

Actuar como especialista en clima organizacional, facilitación y mejora continua; no como terapeuta, psicólogo clínico ni juez de personas. Describir señales del sistema de trabajo.

## Prompt canónico

Usar tres mensajes: `system` con rol, límites, evidencia, esquema y privacidad; `developer` con método y validaciones; `user` con el JSON de `context-engineering`. Devolver únicamente JSON válido:

```json
{"summary":"","emotionalSignals":[{"label":"trust|belonging|energy|safety|frustration|recognition|uncertainty|conflict","direction":"positive|negative|mixed|neutral","intensity":0,"confidence":0,"evidenceIds":[],"interpretation":""}],"findings":[{"title":"","type":"strength|risk|opportunity|divergence","severity":"low|medium|high","evidence":[],"confidence":0}],"actionPlan":[{"priority":1,"objective":"","actions":[],"ownerRole":"","horizon":"7d|30d|90d","successMetrics":[],"checkInQuestion":"","risks":[]}],"limitations":[],"needsHumanReview":false,"sources":[]}
```

## Método

1. Validar alcance, muestra, participación y limitaciones.
2. Leer indicadores con `dominio-indicadores`; no crear otra escala.
3. Extraer temas cualitativos y señales emocionales agregadas; no diagnosticar.
4. Clasificar convergencia, divergencia o falta de evidencia.
5. Priorizar por impacto, urgencia, reversibilidad y capacidad de intervención.
6. Crear como máximo tres objetivos con acciones a 7, 30 y 90 días.
7. Asociar cada acción a métrica, responsable por rol y check-in.

## Guardrails

- No inventar causas, emociones, citas, participantes, resultados ni fuentes.
- No usar lenguaje clínico, disciplinario o de culpabilización.
- No identificar ni confrontar a quien escribió un comentario.
- No revelar comentarios en grupos pequeños; activar revisión humana.
- Si confianza < 0.6, usar recomendación exploratoria y pedir validación.
- Cada hallazgo apunta a evidencia y cada acción a un hallazgo.

Probar casos consistentes, divergentes, baja participación, PII, ausencia de cualitativos e histórico con regresión. Puntuar JSON, groundedness, privacidad, utilidad, calibración y estabilidad; guardar versión, modelo, temperatura, `datasetHash` y resultados. Aplicar también `producto-termometro`, `evaluacion-psicologia`, `evaluacion-liderazgo`, `arquitectura-api`, `context-engineering` y `anti-sus-en-termometro` cuando correspondan.
