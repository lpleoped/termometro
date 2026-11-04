# Integraciones Slack y monday.com

## Implementado en el primer corte

- Pantalla protegida en `/backoffice/configuracion/integraciones`.
- Conexiones por usuario para Slack y monday.com.
- Secretos no devueltos al frontend.
- Cifrado AES-256-GCM cuando existe `INTEGRATION_ENCRYPTION_KEY`.
- Prueba de conexión.
- Publicación idempotente de una acción mediante `POST /api/acciones/:actionId/publicar`.
- Registro de `externalId`, URL y estado en `AccionPlan`.

## Uso actual

- Slack: pegar la URL de Incoming Webhook de un canal.
- monday.com: pegar un token con `boards:write` y configurar el ID del board.

## Siguiente incremento

1. OAuth Slack y monday.com con scopes mínimos.
2. Selector de canales, workspaces, boards, grupos y columnas.
3. Botón “Publicar” directamente en cada acción del dashboard.
4. Cola/outbox para reintentos y observabilidad.
5. Reglas automáticas al cerrar una evaluación.

La API de monday.com usa GraphQL y los valores de columnas dependen del esquema de cada board; por eso el mapeo de columnas debe configurarse después de descubrir el board mediante OAuth.
