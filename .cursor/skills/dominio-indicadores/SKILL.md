---
name: dominio-indicadores
description: >-
  Reglas de negocio del índice de clima, ponderaciones, participación y
  semáforo del Termómetro de Equipo. Usar al implementar dashboard,
  histórico, seeds o docs de indicadores.
---

# Dominio: indicadores (clima)

## Índice general

1. Promedio de respuestas por indicador.
2. Normalizar: promedio × 20 → escala 0–100.
3. Promedio de indicadores por sección.
4. Índice = Σ (promedio_sección × ponderación_sección).
5. Suma de ponderaciones de secciones = **100%**.

## Participación

% de respuestas recibidas respecto de `cantidadEsperada` de la instancia.

## Semáforo de clima

Estados de interpretación del índice (Excelente / Bueno / Regular / Crítico).

## Histórico

Misma fórmula que el estado actual. No inventar otra escala.
