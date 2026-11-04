---
name: context-engineering
description: Construye contexto confiable, mínimo y trazable para analizar encuestas de clima de equipos con IA. Usar al preparar datasets, prompts, históricos, respuestas cualitativas o análisis cuantitativo-cualitativo.
---

# Context Engineering para Termómetro de Equipo

Preparar un contexto reproducible que no invente datos, mezcle períodos ni exponga identidades. Registrar `schemaVersion`, `promptVersion`, `datasetHash`, fuentes y exclusiones.

## Fuentes autorizadas

Usar índice 0–100, participación, secciones, indicadores, respuestas abiertas anonimizadas, histórico del mismo equipo y metadatos de la encuesta. Si falta una fuente, marcarla `missing`. No usar nombres, emails, texto identificable ni datos de otras encuestas.

## Pipeline

1. Delimitar equipo, instancia, evaluación y período.
2. Normalizar escalas, porcentajes, nulos y fechas, conservando originales.
3. Eliminar nombres, emails, teléfonos, URLs e identificadores.
4. Agrupar por pregunta/sección; no mostrar comentarios individuales cuando el grupo tenga menos de 3 respuestas.
5. Contrastar cuantitativos y cualitativos como convergencia, divergencia o evidencia insuficiente.
6. Empaquetar contexto estable y calcular un hash estable.

## Contrato mínimo

```json
{"schemaVersion":"team-climate-context.v1","scope":{"equipoId":"","instanciaId":"","evaluacionId":"","periodo":""},"sample":{"expected":0,"received":0,"participation":0},"quantitative":{"globalIndex":0,"sections":[],"indicators":[]},"qualitative":{"responsesAnalyzed":0,"themes":[],"redactions":0},"history":[],"limitations":[],"sources":[]}
```

## Reglas

- Diferenciar sentimiento de emoción: es una señal agregada, no un diagnóstico.
- No afirmar causas; usar lenguaje probabilístico y declarar límites.
- Reportar cobertura cualitativa y participación antes de interpretar.
- Una alerta requiere evidencia y debe indicar su origen.
- Si los datos son incompatibles, pedir revisión humana.

Entregar resumen, convergencias/divergencias, limitaciones, evidencia por IDs anónimos y hash. Nunca devolver el comentario original completo ni PII.
