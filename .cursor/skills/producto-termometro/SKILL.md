---
name: producto-termometro
description: >-
  Visión y límites del producto Termómetro de Equipo (clima de equipo,
  índice ponderado, sin SUS). Usar en cualquier tarea de este monorepo,
  al portar código desde termometro-api/ui, o al dudar si algo entra en v1.
---

# Producto: Termómetro de Equipo

## Qué es

Diagnóstico de **clima / estado de equipo**: evaluaciones Likert por secciones con ponderación, publicación a equipos, participación, **índice 0–100**, histórico y plan de acción.

Nombre canónico: **Termómetro de Equipo**. Alternativas de marca → skill `product-manager`.

## Repos de referencia (solo lectura)

- `termometro-api` y `termometro-ui` (IBM / trabajo previo): **no modificar** en esta línea OSS.
- Portar ideas y código del **núcleo CUSTOM/clima** únicamente.

## Forma del repo (decisión arquitectura)

**Monorepo:** `apps/api`, `apps/web`, `packages/shared`, `docs/`.

## Entra

Auth, equipos, evaluaciones CUSTOM, instancias, respuestas, dashboard clima, histórico alineado, plan de acción, seed de clima.

## No entra

SUS, enunciados fijos de usabilidad, flujos/intentos, semáforo de flujos, NPS/CSAT como tipos que reemplazan el índice. Producto SUS = repo aparte.

## Titularidad

Leer `docs/ORIGEN_Y_TITULARIDAD.md` y skill `legal-open-source-ibm` antes de LICENSE, NOTICE o publicación.
