---
name: anti-sus-en-termometro
description: >-
  Rechaza contaminar Termómetro de Equipo con SUS/usabilidad. Usar en code
  review, PRs, port desde termometro-api/ui, o si aparecen tipo SUS, flujos,
  esPositivo o System Usability Scale.
---

# Anti-SUS en Termómetro

## Rechazar e informar

Si el cambio introduce cualquiera de esto, **no mergear / no implementar** en este monorepo:

- `tipo: 'SUS'` o enum de tipos que incluya SUS/NPS/CSAT como eje del índice
- Campos `flujos`, intentos por flujo, semáforo de flujos
- `esPositivo` ligado a enunciados SUS
- Componentes `SUSDisplay`, `SUSFlujos*`, enunciados fijos SUS
- Docs/contratos solo de System Usability Scale

## Respuesta al usuario

Una frase: pertenece a un **producto aparte de usabilidad**; este repo es solo clima de equipo. Ofrecer abrir trabajo en ese otro producto si existe.

## Excepción

Menciones históricas en `docs/ORIGEN_Y_TITULARIDAD.md` o comentarios “por qué se excluyó SUS” están permitidas.
