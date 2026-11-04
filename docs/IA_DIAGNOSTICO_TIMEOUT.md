# Corrección del timeout de IA — 2026-11-02

## Evidencia

La captura corresponde al frontend actualizado. La API anterior abortaba la
generación a los 30 segundos. La prueba de conexión usaba un presupuesto de sólo
8 tokens y marcaba HTTP 200 como éxito sin verificar contenido ni finalización.
Un modelo de razonamiento podía consumir ese presupuesto sin producir texto.

## Corrección

- Prueba y análisis comparten transporte, formato JSON y validador del resultado.
- GPT-5 en OpenAI usa esfuerzo `low`, con límite de 4096 tokens para análisis
  (incluye razonamiento) y 1024 para la prueba sintética. Se conserva el modelo.
- Timeout acotado a 120 segundos, con mensaje de espera en la interfaz.
- Se rechazan respuestas truncadas, vacías, rechazadas o con esquema inválido.
- El estado activo requiere una generación válida de la versión actual de la
  prueba. Las verificaciones antiguas aparecen como pendientes.
- Los fallos actualizan el estado. No hay reintentos automáticos con costo.
- Editar con clave vacía conserva la credencial existente.
- Listado y creación devuelven el mismo DTO; el dashboard recupera el último
  análisis guardado al abrir la ronda, sin volver a llamar al proveedor.

## Reproducción automatizada

Desde `apps/api`: `node --test tests/ai-completion.test.cjs`.
Cinco pruebas cubren parámetros, respuesta incompleta, errores, estado de
verificación, conservación de clave y una respuesta HTTP sintética que tarda
31 segundos. Esta suite no usa credenciales ni consume saldo.

La verificación visual de navegador quedó pendiente porque el acceso fue
denegado. Las llamadas reales de diagnóstico usan la configuración ya guardada;
no imprimen claves ni el contenido del equipo.

Resultado de la verificación real: prueba sintética GPT-5 válida en 10,1 segundos;
análisis de la ronda indicada en la captura válido y persistido en 13,6 segundos,
con resumen y cinco recomendaciones. El build de shared, API y web finalizó
correctamente. Estos tiempos son observaciones de esta ejecución, no garantías
de latencia del proveedor.

Referencia: https://developers.openai.com/api/docs/guides/reasoning
