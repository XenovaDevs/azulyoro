# Comodidad de llaves e idioma

- [x] Rediseñar navegación con UI/UX Pro Max: por ronda, acceso a Boca y cuadro completo con zoom.
- [x] Localizar etiquetas deportivas del proveedor en español y mantener inglés coherente.
- [x] Verificar móvil/tablet/escritorio, teclado, temas, filtros y series de ida/vuelta.
- [x] Ejecutar pruebas, lint y build; commit y push para autodeploy.

## Diseño

Mantener azul y oro y las llaves con marcadores. Vista inicial por ronda, sin desplazamiento en dos ejes, con selector y anterior/siguiente. Conexiones confirmadas al siguiente cruce como navegación. Vista de cuadro completo opcional con zoom y salto a ronda/Boca. Fechas legibles, zonas táctiles de 44 px y estado visible del cruce. No cambiar cálculo deportivo ni inventar resultados.

Se aplicaron las pautas de UI/UX Pro Max sobre accesibilidad, objetivos táctiles, navegación, contraste y adaptación. La instalación local contiene archivos de referencia en lugar de las carpetas scripts/data; el generador no está disponible. Se usó el SKILL.md y se conservó el sistema visual del proyecto.

## Revisión

29 pruebas aprobadas: competiciones, orden y conexiones de llaves, series, selección inicial/próximo cruce de Boca y etiquetas del proveedor. Lint y TypeScript aprobados. Build de producción aprobado, 141 páginas generadas.

Chrome a 320, 375, 768, 1024 y 1440 px: página y llaves sin desbordes, controles/fechas de al menos 44 px en tamaño normal, sin cards del calendario dentro de eliminatorias. Navegación anterior/siguiente y conexión al siguiente cruce comprobadas. Cuadro completo de prueba con 7 cruces y 6 conexiones; zoom 50/75/100 %, acceso a Boca y foco por teclado. Temas claro/oscuro y preferencia de movimiento reducido verificados.

Sudamericana con datos públicos: fechas de ida/vuelta, global y penales; filtro de estado conserva la serie completa. Nombres largos no recortan fechas ni marcadores en el cuadro. Español e inglés sin errores de consola tras recargar el servidor con las nuevas traducciones. Los datos y capturas de prueba permanecen en herramientas locales ignoradas.

Entrega por commit y push a main para el autodeploy existente.
