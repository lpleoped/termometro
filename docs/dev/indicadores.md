# Indicadores — Termómetro de Equipo

El dashboard y el histórico usan la misma fórmula, en `getEstadoActualDashboard`. El semáforo es `interpretarIndiceClima` en `@termometro/shared`.

Las secciones tienen ponderación. Cada pregunta de escala es Likert 1–5 y tiene dirección `positiva` o `negativa`. Las preguntas abiertas (`cualitativo`) forman parte del instrumento y no entran en el índice. Una sección que solo tiene abiertas puede pesar 0.

## Índice general

Para cada pregunta con respuestas:

1. Promedio de los valores 1–5.
2. Si la dirección es negativa, invertir antes de normalizar: `5 − promedio`. Si es positiva, queda el promedio.
3. Normalizar a 0–100: ese valor × 20. Un 100 es la lectura favorable.

El valor de una sección es el promedio de sus preguntas que tienen respuesta. Una pregunta sin respuestas no aporta un cero.

El índice es la suma de `valor de la sección × ponderación de la sección / peso que sí aportó`. El peso que sí aportó es la suma de las ponderaciones de las secciones con al menos una respuesta. En un cuestionario completo, las ponderaciones de las secciones que cuentan suman 100.

Ejemplo: una sección con ponderación 40 y promedio favorable 80 aporta 32 puntos cuando el peso total es 100 (`80 × 40 / 100`).

## Participación

`respuestas recibidas / cantidadEsperada × 100`. Si no hay cantidad esperada, el porcentaje es 0.

## Semáforo

`interpretarIndiceClima` en `packages/shared/src/semaforo.ts`:

| Índice | Estado |
|--------|--------|
| ≥ 80 | Excelente |
| ≥ 60 | Bueno |
| ≥ 40 | Regular |
| < 40 | Crítico |

## Privacidad de la ronda

En una ronda anónima, si las respuestas recibidas están por debajo de `minimoAnonimato`, el estado actual no arma resultados ni incluye los textos. El mínimo por defecto al abrir una ronda de equipo es 3.

## Histórico

La misma fórmula, una vez por cada instancia del par equipo + evaluación.
