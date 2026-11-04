---
name: arquitectura-web
description: >-
  Convenciones del frontend React/Vite/TS del monorepo Termómetro de Equipo.
  Usar al crear pantallas o servicios HTTP.
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

Índice tipo termómetro, detalle por sección, gráficos de indicadores, histórico, plan.
