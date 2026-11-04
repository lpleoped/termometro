# Plan de implementación — IA multi-proveedor

Este plan es independiente del trabajo de UX vigente en `.cursor/plan-activo.md`.
Su objetivo es permitir que cada organización configure un proveedor de IA y
genere análisis a partir de los indicadores cualitativos y cuantitativos del
Termómetro de Equipo.

## Objetivo funcional

Desde el dashboard, una persona autorizada podrá:

1. elegir un proveedor soportado;
2. ingresar su endpoint, modelo y credencial;
3. validar la configuración sin guardar la clave en el navegador;
4. seleccionar el alcance del análisis (instancia actual, histórico o ambos);
5. generar un resultado estructurado con hallazgos, fortalezas, riesgos y
   acciones sugeridas;
6. revisar, editar y guardar el resultado como plan de acción.

La IA no reemplaza el cálculo del índice. Los valores cuantitativos deben salir
de `dashboard.service` / `historico.service`; las respuestas cualitativas deben
ser anonimizadas y agregadas antes de enviarse al proveedor.

## Alcance recomendado del MVP

- Proveedores: OpenAI-compatible, Azure OpenAI y Ollama/endpoint compatible.
- Configuración por usuario u organización, nunca global en el frontend.
- Credenciales cifradas o almacenadas en un secret manager; nunca en Mongo en
  texto plano ni en `localStorage`.
- Un contrato interno único: `chatCompletion(messages, options)`.
- Salida JSON validada con esquema: `resumen`, `fortalezas`, `alertas`,
  `recomendaciones`, `nivelConfianza` y `fuentes`.
- Persistencia de auditoría mínima: proveedor, modelo, fecha, usuario, alcance,
  versión del prompt y hash del dataset; no guardar el secreto ni respuestas
  individuales identificables.

## Diseño técnico

### API

Agregar las capas `routes → controllers → services → models` respetando
`arquitectura-api`:

- `ai-provider.model.ts`: proveedor, endpoint, modelo, estado, propietario y
  referencia al secreto.
- `ai-provider.service.ts`: CRUD seguro, validación de endpoint y prueba de
  conexión.
- `ai-analysis.service.ts`: arma el contexto desde los servicios de dashboard
  e histórico, aplica anonimización, llama al adaptador y valida la respuesta.
- `providers/`: adaptadores `openai-compatible`, `azure-openai` y `ollama`.
- Rutas sugeridas:
  - `GET/POST/PUT/DELETE /ai/providers`
  - `POST /ai/providers/:id/test`
  - `POST /ai/analyses`
  - `GET /ai/analyses/:id`

Actualizar `packages/shared` con los DTOs, estados y el contrato de salida en
el mismo cambio.

### Web

Usar el hook dedicado `apps/web/src/hooks/useIA.ts` para aislar estado,
mutaciones y errores. Las pantallas sólo deben consumir sus métodos, sin llamar
directamente a axios. Separar después en dos superficies:

- configuración de proveedor (administración);
- generación y revisión del análisis (dashboard).

No incorporar cambios de layout o copy al flujo de responder mientras esté
activo el plan de UX.

## Fases de implementación

1. **Contrato y seguridad:** completado en primera iteración: DTOs, permisos,
   validación de salida y timeout.
2. **Abstracción de proveedores:** en progreso: adaptador OpenAI-compatible
   implementado; Azure y Ollama quedan como adaptadores compatibles siguientes.
3. **Configuración:** completado para MVP: endpoints protegidos, validación,
   cifrado AES-256-GCM, prueba, actualización y eliminación de credenciales.
4. **Contexto de indicadores:** completado para MVP: índice, secciones,
   indicadores, participación e histórico se envían como snapshot.
5. **Análisis:** completado para MVP: salida JSON validada, timeout,
   trazabilidad, persistencia y manejo de error del proveedor.
6. **Integración UI:** completado para MVP: configuración y panel de análisis
   usando `useIA`, con estados de carga/error y revisión humana.
7. **QA y observabilidad:** pendiente: tests automatizados de adaptadores,
   anonimización, prompt injection, rate limit y flujo E2E.

## Criterios de aceptación

- Cambiar de proveedor no cambia el contrato ni el código del dashboard.
- Ningún secreto aparece en logs, respuestas HTTP, bundles o almacenamiento web.
- Un proveedor inválido o caído produce un error recuperable y no borra datos.
- El análisis cita los indicadores que lo originaron y distingue datos
  cuantitativos de cualitativos.
- La fórmula del índice 0–100 permanece intacta.
- La persona revisa y confirma cualquier acción antes de guardarla.
- Hay pruebas para prompt injection en respuestas cualitativas, datos vacíos,
  timeout, rate limit y salida JSON inválida.

## Decisiones pendientes antes de construir

- alcance de multi-tenancy (usuario, equipo u organización);
- proveedor de secretos disponible en despliegue;
- qué campos cualitativos se permiten y cómo se anonimizan;
- presupuesto, límites de tokens y retención de historiales;
- si se habilitará un proveedor local como opción predeterminada.

## Rama

Se intentó crear una rama aislada, pero `.git` está disponible sólo para
lectura en este entorno (`Permission denied` al crear el lock de la referencia).
El plan y el hook quedan en archivos nuevos sin tocar el trabajo de UX. Crear
la rama antes de continuar con la implementación:

```bash
git switch -c codex/ia-multi-proveedor
```
