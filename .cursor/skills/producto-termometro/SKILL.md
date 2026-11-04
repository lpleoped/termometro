---
name: producto-termometro
description: >-
  Visión y límites del producto Termómetro de Equipo (clima de equipo,
  índice ponderado). Usar en cualquier tarea de este monorepo o al dudar
  si algo entra en v1.
---

# Producto: Termómetro de Equipo

## Qué es

Diagnóstico de **clima / estado de equipo**: evaluaciones Likert por secciones con ponderación, publicación a equipos, participación, **índice 0–100**, histórico y plan de acción.

Nombre canónico: **Termómetro de Equipo**. Alternativas de marca → skill `product-manager`.

## Repos de referencia (solo lectura)

- `termometro-api` y `termometro-ui`: **no modificar** en esta línea.
- Tomar ideas y código del **núcleo clima** únicamente.

## Forma del repo (decisión arquitectura)

**Monorepo:** `apps/api`, `apps/web`, `packages/shared`, `docs/`.

## Entra

Auth, equipos, evaluaciones de clima, instancias, respuestas, dashboard, histórico alineado, plan de acción, seed.

## Titularidad

Leer `docs/ORIGEN_Y_TITULARIDAD.md` y skill `legal-open-source-ibm` antes de LICENSE, NOTICE o publicación.

El CTO de IBM Consulting ya autorizó por escrito el open source de este producto. Siguen las dos atribuciones (autor e IBM) y la condición: sin gente, sin clientes y sin material que comprometa a la empresa.
