# Revisión UX del dashboard

## Objetivo

Facilitar la selección de una ronda y la lectura del clima del equipo, manteniendo índice, participación, histórico y plan de acción.

## Trabajo y verificación

- [x] Corregir la estructura del menú: ubicar el panel móvil debajo del encabezado, permitir cerrarlo con Escape o al elegir ronda, y hacer que elegir un equipo contraído expanda el panel.
- [x] Recuperar el equipo de la ronda seleccionada y distinguir fallos de carga de la ausencia de rondas.
- [x] Ajustar la composición y el contraste del resumen; evitar mostrar un índice o estado de clima sin respuestas.
- [x] Moderar el diseño de las arañas y conservar nombres y valores completos en las listas asociadas.
- [x] Compilar el proyecto completo.
- [x] Verificar visualmente en escritorio y móvil: menú abierto y cerrado, navegación, nombres largos y gráficos. Revisados menú expandido/contraído y móvil a 390 px, cierre con Escape y detalle «Identificación con los valores de la organización» completo junto al gráfico.
- [ ] Probar con datos los estados de error, sin respuestas, participación parcial y ronda seleccionada después de recargar. Verificados ronda inexistente, 4 de 5 respuestas, aviso 4 de 3 y selección tras recargar; no hay rondas sin respuestas en los datos disponibles.

La verificación visual sigue pendiente si el navegador integrado no está disponible; compilar no prueba el diseño ni las interacciones.
