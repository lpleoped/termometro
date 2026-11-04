# Taxonomía de huecos

Usar un solo tipo principal por hallazgo. Si hay dos, el principal es el que impide terminar el paso.

| Tipo | Qué es | Señal típica |
|------|--------|----------------|
| Recorrido cortado | No hay camino entre dos pasos canónicos | La URL existe pero nada lleva ahí, o el paso no existe |
| Callejón | Se entra y no hay salida ni siguiente paso | Éxito sin link, lista vacía sin alta, resultado sin plan |
| Control muerto | El control promete una acción y no la ejecuta | Botón sin navegación ni request |
| Handoff roto | El dato de salida no sirve de entrada | `id` vs `_id`, `state` de router que se pierde al refrescar, link mal formado |
| Estado invisible | El sistema tiene un estado que la UI no muestra o no deja cambiar | Activa en API, sin cierre ni etiqueta en pantalla |
| Actor equivocado | Quien debe actuar no puede, o quien no debe sí puede | Responder pide login; panel de resultados sin sesión |
| Precondición oculta | Falla porque falta un dato que nadie pidió | Ponderación ≠ 100 %, sin cantidad esperada, sin equipo |
| Cierre ciego | La acción ocurre y la vista siguiente sigue vieja o en otro lado | Publicar no muestra el link; responder no mueve la participación |
| Doble verdad | Dos lugares discrepan sobre el mismo hecho | Índice de dashboard ≠ histórico; título de la card ≠ payload |
| Sin recuperación | Vacío, error o reintento no tienen salida | Alert genérico, error de red sin reintentar, doble envío |
| Adopción | El primer éxito exige saber de antemano cómo está armado | Solo cierra con seed; términos internos sin traducción |
| Métrica en riesgo | El hueco vacía o cambia el significado del índice | Respuestas que no entran al cálculo; participación sin denominador |

## No es un hueco de este producto

- Pedir un cuestionario SUS o un índice de usabilidad.
- Preferencia visual sin efecto en terminar el recorrido.
- Refactor interno con el mismo comportamiento observable.
