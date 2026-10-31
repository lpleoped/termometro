---
name: arquitectura-web
description: >-
  Convenciones del frontend React/Vite/TS del monorepo Termómetro de Equipo.
  Usar al crear pantallas, servicios HTTP o al portar desde termometro-ui.
---

# Arquitectura Web

## Ubicación

`apps/web` — React + Vite + TypeScript.

## Organización

Features por dominio: `auth`, `equipos`, `evaluaciones`, `dashboard`, `responder`.

- Context: solo sesión/auth.
- Datos remotos: preferir TanStack Query al implementar fetch de dashboard/instancias.
- Tipos: `packages/shared`.

## UI del núcleo

Índice tipo termómetro, detalle por sección, gráficos de indicadores, histórico, plan. **Sin** componentes SUS.

## Al portar desde termometro-ui

Traer flujo backoffice clima + Responder Likert. No traer `SUS*`, enunciados SUS ni bloque de flujos. No editar el repo de referencia.
