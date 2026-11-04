# Security Policy

## Estado del proyecto

Termómetro de Equipo es un proyecto open source en estado MVP/beta. No debe considerarse una plataforma enterprise auditada ni utilizarse con información sensible en producción sin una configuración y revisión de seguridad adecuadas.

## Sistema y alcance

El repositorio contiene una API Express/TypeScript, una aplicación React/Vite y contratos compartidos. La API administra usuarios, equipos, feedbacks, planes de acción, contexto de equipo y conexiones con proveedores de IA.

Los activos principales son credenciales de usuarios, API keys de proveedores, feedbacks, resultados, contexto operativo y tokens de sesión.

## Límites de confianza

- La interfaz web y cualquier cliente HTTP son no confiables.
- Los textos de feedback y contexto son datos, no instrucciones para la IA.
- El backend es responsable de autenticación, autorización, cifrado y selección de contexto.
- Las API keys nunca deben exponerse al frontend.
- Los secretos del despliegue deben configurarse fuera del repositorio mediante variables seguras o un secret manager.

## Invariantes de seguridad

- `JWT_SECRET` y `AI_CREDENTIAL_SECRET` deben existir y tener al menos 32 caracteres.
- Las rutas privadas deben requerir autenticación válida.
- Las mutaciones de equipos y contexto deben verificar pertenencia/autorización.
- Las API keys no deben aparecer en respuestas, logs, bundles ni `localStorage`.
- Los endpoints IA personalizados no deben alcanzar redes privadas o locales salvo una excepción explícita y controlada.
- El contexto enviado a la IA debe estar limitado por estado, vigencia y presupuesto.
- Los feedbacks deben conservar las reglas de anonimato y privacidad del producto.
- Los resultados de IA requieren revisión humana antes de convertirse en acciones.

## Configuración de producción

Configurar como secretos del entorno de ejecución:

```env
MONGO_URI=...
JWT_SECRET=...
AI_CREDENTIAL_SECRET=...
INTEGRATION_ENCRYPTION_KEY=...
```

No copiar estos valores al frontend ni commitear un `.env` real. Para desarrollo local, `npm run dev` ejecuta `npm run setup:dev`, que genera secretos locales si faltan o son demasiado cortos. Ese mecanismo no reemplaza un secret manager en producción.

## API keys de usuarios

Los usuarios pueden ingresar su propia API key desde la interfaz. El backend la cifra en reposo y la descifra únicamente para llamar al proveedor configurado. La clave no debe devolverse al navegador ni registrarse en logs.

## Reporte de vulnerabilidades

No publicar credenciales, datos de clientes ni pruebas destructivas en issues públicos. Reportar vulnerabilidades de forma privada al propietario del repositorio con pasos de reproducción, impacto, versión afectada y evidencia mínima necesaria.

## Limitaciones conocidas

Antes de un uso empresarial deben completarse pruebas de integración con MongoDB, rate limiting, recuperación de contraseña, roles de miembros, política de retención de datos, monitoreo, revisión de dependencias y validación con un secret manager.

## Fuera de alcance

No se consideran vulnerabilidades los resultados interpretativos de la IA claramente marcados como sugerencias y sujetos a revisión humana. Sí es reportable cualquier exposición de secretos, bypass de autorización, pérdida de aislamiento entre equipos o envío no controlado de datos a terceros.
