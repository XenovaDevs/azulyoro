# Vista de llaves de playoffs

- [x] Modelar rondas, series de ida/vuelta, ganadores y conexiones confirmadas sin mezclar Apertura/Clausura.
- [x] Reemplazar las cards de eliminatorias por un cuadro conectado con equipos, resultados, fechas y penales; mantener navegación al detalle.
- [x] Verificar filtros, datos parciales, móvil, build/lint y pruebas de regresión.
- [x] Commit y push a main; entrega por autodeploy sin inspección del VPS.

## Diseño

Columnas de rondas en orden de avance, cruces compactos con dos filas de equipos y conectores. Desplazamiento horizontal/vertical dentro del cuadro en móvil. Resultados de ambas mangas alineados por equipo, global únicamente cuando se conocen ambas, y fechas en horario argentino. Se dibujan conexiones sólo entre enfrentamientos confirmados por los participantes de rondas consecutivas. No se cortan series por paginación.

## Verificación

Lint, TypeScript y build de producción aprobados (141 páginas). Pasaron las 20 pruebas de competiciones, series y distribución del cuadro.

Verificación en Chrome: cuadro de prueba local con 7 cruces, 6 conexiones y 7 fechas, sin cards; filtros por Boca y estado; desplazamiento contenido en móvil de 390 px; traducciones español e inglés sin errores de consola. También se verificaron series de Sudamericana con datos del proveedor, fechas de ida/vuelta, globales y penales. Los datos de prueba quedaron únicamente en herramientas locales ignoradas por Git.

Entrega: commit y push a main para activar el autodeploy existente.
