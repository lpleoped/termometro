---
name: qa-huecos-flujo
description: >-
  Audita el flujo end to end y los huecos funcionales del Termómetro de
  Equipo: recorridos rotos, handoffs, callejones, botones muertos, estados
  invisibles, primer uso sin seed y riesgo sobre el índice o la
  participación. Usar cuando el usuario pida QA, huecos, gaps, flujo E2E,
  smoke, fricción de adopción, o antes de rediseñar la UX.
---

# QA de huecos de flujo

Encontrar dónde el recorrido no cierra. Una pantalla que funciona aislada no cuenta como flujo.

No implementar el arreglo en este skill. El diseño lo hace `ux-ui-adopcion`.

## Antes de opinar

1. Leer `producto-termometro` y `dominio-indicadores`.
2. Reconstruir el recorrido desde rutas, páginas, API y estados. La intención del diseño no es evidencia.
3. Caminar cada paso como estado: actor, entrada, precondición, acción, respuesta, siguiente paso visible, salida.
4. Clasificar con [taxonomia.md](taxonomia.md).
5. Entregar con [plantilla.md](plantilla.md).

## Actores

- **Facilitador** (cuenta): equipo → evaluación → publicar → compartir link → leer índice, participación e histórico → plan de acción.
- **Integrante** (sin cuenta): abre `/responder/:instanciaId`, responde Likert, ve confirmación.
- **Primer uso**: alguien sin seed ni equipos. Si el recorrido solo cierra con datos de demo, es un hueco de adopción.

## Recorrido que tiene que cerrar

Cualquier corte entre estos pasos es un hueco, aunque cada pantalla cargue:

1. Entender en una frase para qué sirve la herramienta.
2. Tener un equipo.
3. Tener una evaluación cuyas ponderaciones suman 100 %.
4. Publicar una instancia activa (equipo + cantidad esperada).
5. Copiar y compartir `/responder/:instanciaId`.
6. El integrante envía sin login y ve confirmación.
7. El facilitador ve participación e índice 0–100 coherentes con esas respuestas.
8. El histórico usa la misma fórmula que el estado actual.
9. Del resultado sale un siguiente paso (plan de acción).

## Dónde mirar

- Rutas en `apps/web/src/App.tsx` frente a páginas que existen y no están cableadas.
- Guardas: qué rutas exigen sesión y cuáles no, y si eso coincide con el actor.
- Controles sin acción, navegación que depende de `location.state` o de ids frágiles (`id` / `_id`).
- API: `equipos`, `evaluaciones`, `instancias`, `respuestas`, dashboard, histórico, `acciones`.
- Checklist vivo: `docs/SMOKE_CHECKLIST.md`. Si el smoke pasa y el primer uso no, el smoke está corto: decirlo.

## Orden de búsqueda

1. Handoff: la salida de un paso no es la entrada del siguiente.
2. Siguiente paso invisible o control que no hace nada.
3. Estado que la persona no puede nombrar (borrador, activa, cerrada, respondida).
4. Actor bloqueado o de más (pide cuenta a quien responde, o deja abierto lo que es del facilitador).
5. Precondición que falla en silencio (ponderación, cantidad esperada, equipo).
6. Cierre que no actualiza la pantalla que se mira después.
7. Doble verdad entre UI y API (índice, participación, ids).
8. Sin recuperación: vacío, error, doble envío, cancelar.
9. Primer uso sin seed.
10. Riesgo sobre índice, participación, histórico o semáforo.

## Severidad

- **Crítico**: corta el recorrido canónico o corrompe índice, participación o histórico.
- **Alto**: se completa solo si ya se conoce el sistema.
- **Medio**: hay un rodeo claro y el dato sigue siendo confiable.
- **Bajo**: pulido que no cambia si la persona termina el trabajo.

## Evidencia

Cada hueco cita archivo y comportamiento, o una reproducción en el browser si la app está levantada. Sin eso es **hipótesis** y se etiqueta así. No inventar pantallas ni endpoints. Re-verificar ejemplos viejos contra el código vigente.

## Fuera de este QA

- No proponer otro producto (SUS u otra métrica).
- No rediseñar visual ni copy: pasar el registro a `ux-ui-adopcion`.
- No listar deuda técnica que no cambie lo que la persona puede hacer.
