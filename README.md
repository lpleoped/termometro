# Termómetro de Equipo

Diagnóstico de **clima / estado de equipos**: evaluaciones Likert por secciones ponderadas, índice 0–100, participación, histórico y plan de acción. El tono de lo escrito, cuando hay comentarios suficientes, es una señal agregada. No diagnostica emociones ni equivale a una lectura de reunión.

Monorepo open source (API + web + desktop + shared).

## Licencia

Licensed under the [Apache License, Version 2.0](LICENSE).

```
Copyright 2024-2026 Leonardo Pedreira
```

Atribución completa: [`NOTICE`](NOTICE), [`COPYRIGHT`](COPYRIGHT).  
Origen y titularidad: [docs/ORIGEN_Y_TITULARIDAD.md](docs/ORIGEN_Y_TITULARIDAD.md).

Este repositorio no se presenta como producto oficial de la empresa titular del código de ese período.

## Origen y titularidad

Idea y primera implementación de Leonardo Pedreira en **2024**, en otro repositorio y en tiempo personal, con herramientas de IA e IDEs con IA integrada de uso exclusivamente personal. Bajo el contrato vigente en ese período, el código pertenecía a esa empresa. La idea y la implementación se mostraron ante un sector de LATAM de esa empresa. El CTO de esa empresa autorizó la publicación open source para que eso mostrado pudiera tener valor, con la condición de no incluir personas, clientes ni material que comprometa a la empresa.

## Estructura

```
apps/api        → API (Express + TS + Mongo / JSON local)
apps/web        → UI (React + Vite + TS)
apps/desktop    → Empaquetado instalable (Electron)
packages/shared → Tipos y contratos compartidos
```

## Estado y seguridad

Beta local. Se usa con `npm run local` o con la app de escritorio. Los datos de esa modalidad quedan en esa computadora. No hay un servicio hospedado para registrarse por una URL pública.

Las API keys de proveedores de IA se cargan por la interfaz y se almacenan cifradas en el backend. No deben ir al frontend, a `localStorage` ni al repositorio. Los secretos de desarrollo van en variables de entorno. Detalle: [SECURITY.md](SECURITY.md).

## Cómo probarlo

La entrada pública es este repositorio. La beta se corre en esta computadora con `npm run local`, como se detalla más abajo. Los datos quedan ahí.

## Instalador de Windows

El `.exe` es una beta, no el camino para conocer el producto. Sin certificado de firma, Windows puede avisar que el editor es desconocido y la actualización automática no se enciende. El tag sigue pudiendo construir el instalador.

- Instaladores: https://github.com/lpleoped/termometro/releases
- Proceso: [RELEASE.md](RELEASE.md)
- Push a `main` corre CI; solo un tag publica el instalador

## Correr en local

**Requisitos:** Node ≥ 20. Para la web local, MongoDB en `mongodb://localhost:27017/termometro-de-equipo`.

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

npm run setup:dev # genera secretos locales si faltan
npm run seed      # atajo local opcional; no es la cuenta para conocer el producto
npm run dev       # web local: ingreso y cuentas de Mongo
npm run build && npm run start  # la misma web, ya compilada
npm run local     # experiencia de una sola computadora, sin Mongo
```

Para conocer el producto, `npm run local` abre una instalación vacía y la cuenta se crea en el primer arranque.

## Contribuir

¿Querés contribuir al proyecto? Leé la [guía de contribución](CONTRIBUTING.md) para aprender cómo configurar el proyecto, enviar cambios y entender el flujo de trabajo.

## Seguridad

Si descubrís una vulnerabilidad de seguridad, **no la reportes en issues públicos**. Leé nuestra [política de seguridad](SECURITY.md) para saber cómo reportar de forma responsable.
