# Indicadores — Termómetro de Equipo

Cómo se calcula el **índice de clima** (0–100) en dashboard e histórico.

Evaluaciones con secciones ponderadas y respuestas Likert **1–5**.

## Índice general

1. Promedio de respuestas por indicador.
2. Normalizar: promedio × 20 → escala 0–100.
3. Promedio de esos valores por sección.
4. Índice = Σ (promedio_sección × ponderación_sección / 100).
5. La suma de ponderaciones de las secciones debe ser **100%**.

**Ejemplo:** sección con ponderación 40% y promedio 80 aporta 32 puntos al índice (80 × 0.4).

## Participación

Porcentaje de respuestas recibidas respecto de `cantidadEsperada` de la instancia:

`recibidas / esperadas × 100`

## Semáforo de clima

Interpretación del índice:

| Índice | Estado |
|--------|--------|
| ≥ 80 | Excelente |
| ≥ 60 | Bueno |
| ≥ 40 | Regular |
| < 40 | Crítico |

Implementación compartida: `interpretarIndiceClima` en `@termometro/shared`.

## Histórico

Misma fórmula que el estado actual, una vez por cada instancia del par equipo + evaluación.
