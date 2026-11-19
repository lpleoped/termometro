# Persistencia y paridad

La aplicación de escritorio y la instalación con Mongo no mantienen dos implementaciones de negocio. Comparten contratos, servicios, validadores y pruebas. Cambia el adaptador que implementa cada repositorio.

```text
HTTP / UI
   ↓
servicios + reglas + autorización
   ↓ contratos de repositorio
   ├─ JsonStorage (escritorio y corrida local: schemaVersion + migraciones)
   └─ MongoStorage (web con Mongo: backfills y migraciones)
```

Las reglas de negocio, los cálculos, las validaciones de entrada y la autorización viven en servicios o funciones puras. Esos servicios no importan modelos de Mongoose ni el almacén JSON: usan el contrato del repositorio.

## Cómo se cambia un campo o un comportamiento

1. Actualizar el contrato canónico en `packages/shared` o el contrato de dominio del repositorio. La forma persistida se comprueba con el esquema Zod de `apps/api/src/domain/persisted-schemas.ts`.
2. Decidir compatibilidad, valor por defecto y versión.
3. Implementar JSON y Mongo bajo el mismo método del repositorio.
4. Agregar la migración para las instalaciones que ya existen.
5. Ejecutar la prueba de conformidad contra ambos adaptadores.
6. Probar el servicio y el endpoint una sola vez, contra el contrato.

Una propiedad nueva es opcional o trae migración y valor por defecto, para que una instalación ya escrita siga siendo legible.

## Compatibilidad

- Campo nuevo: opcional, o con un default seguro.
- Campo renombrado: leer el nombre viejo y el nuevo durante la transición; escribir el nuevo; borrar el viejo solo en una migración posterior.
- Campo eliminado: ignorarlo al leer y quitarlo en una migración, nunca durante una lectura normal.
- Cambio de significado: nueva versión del contrato. El nombre anterior no se reutiliza.
- Fórmula: una sola función determinista compartida. El cálculo no se duplica en Mongo, en JSON ni en el frontend.

Los archivos JSON llevan `schemaVersion` y migraciones explícitas. Mongo documenta el backfill cuando el cambio no es compatible hacia atrás. Un cambio incompatible sube la versión del contrato y actualiza los dos adaptadores antes de cambiar el servicio que los consume.

## Estado actual

Hay repositorios espejo para usuarios, equipos, evaluaciones, rondas y respuestas. Acciones, contexto, configuración de IA, análisis e integraciones usan `featureRepository` (`JsonFeatureRepository` / `MongoFeatureRepository`), con contratos en `domain/feature-records.ts`. El dashboard y el histórico consumen esos repositorios, incluidos los adjuntos de aprendizaje.

JSON tiene un manifest `formatVersion: 2`, sobres versionados, validación, escritura atómica, locks y backups. Mongo conserva sus modelos detrás del mismo contrato.

El registro de migraciones del formato local está en `apps/api/src/storage/migrations.ts`. Las exportaciones portables de `JsonStorage` llevan manifest y checksums. Esos respaldos no exportan claves de proveedores ni secretos de integración. El escritorio guarda los secretos de la instalación en `installation-secrets.bin`.

La conformidad de repositorios está en `apps/api/src/repositories/repository-conformance.ts`. `npm run test:parity -w @termometro/api` la ejecuta contra JSON y contra Mongo, y omite Mongo si no hay una instancia. Esa suite también cubre el recorrido HTTP de features, el backup v2 y la restauración.
