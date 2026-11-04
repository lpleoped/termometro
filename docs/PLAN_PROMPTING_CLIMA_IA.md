# Diseño y plan de implementación: análisis cualitativo y plan de acción con IA

## Objetivo

Combinar índice, participación, secciones, histórico y respuestas abiertas para detectar señales emocionales agregadas y proponer un plan de acción verificable.

## Arquitectura

`respuestas → sanitización/anónimo → contexto versionado → prompt experto → JSON validado → revisión humana → plan persistido → seguimiento`

- `context-engineering`: dataset, redacción y trazabilidad.
- `prompting-engineering`: rol experto, método, contrato y tests.
- `ai-analysis.service`: proveedor, hash, versión y persistencia.
- `AIAnalysis` / `AccionPlan`: análisis, objetivos, acciones, responsables, métricas y estado.
- UI: señales, evidencia agregada, limitaciones, aprobación y seguimiento.

## Fases

1. **Contrato y contexto:** tipos compartidos, sanitización, agrupación mínima de 3 respuestas, hash estable y tests.
2. **Prompt experto:** prompts versionados, esquema runtime, un reintento por JSON inválido y métricas de tokens/latencia/proveedor.
3. **Persistencia y UX:** guardar como borrador, exigir aprobación ante baja muestra/divergencia/confianza baja, permitir edición y rechazo.
4. **Seguimiento:** check-ins a 7/30/90 días, comparación con la siguiente medición y regresión del prompt antes de cambiar versión.

## Aceptación

- Ningún hallazgo sin evidencia o limitación explícita.
- Ninguna respuesta expone PII o comentario individual.
- JSON validado y persistible en todos los casos de prueba.
- Máximo tres prioridades con responsable por rol y métrica observable.
- Una persona puede aprobar, editar o rechazar el plan.
- Mismo dataset y versión producen el mismo hash.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Emociones tratadas como hechos | intensidad/confianza separadas |
| Reidentificación | anonimización, mínimo de 3 y sin texto crudo |
| Sesgo del proveedor | evidencia, revisión humana y casos de evaluación |
| Plan genérico | objetivo, ownerRole, métrica y check-in obligatorios |
| Deriva del prompt | versiones, hashes y suite de regresión |
