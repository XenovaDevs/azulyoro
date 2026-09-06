# Revisión responsive del sitio

- [x] Revisar páginas públicas, navegación, deportes, formularios y contenido en 320/375/768/1024/1440 px.
- [x] Corregir desbordes, navegación móvil ausente, controles pequeños y campos que causan zoom en iOS.
- [x] Verificar llaves, estadísticas, tablas y formaciones, incluyendo contenido largo y ES/EN.
- [x] Ejecutar lint, pruebas y build; documentar límites y preparar la publicación por push a main.

## Criterios

Sin desplazamiento horizontal de página; tablas o lienzos amplios pueden desplazarse dentro de una región identificada. Navegación principal disponible en móvil, controles cómodos, campos de al menos 16 px en pantallas pequeñas, textos y nombres sin taparse. Mantener el diseño azul y oro y los flujos actuales. Revisar en navegador y corregir únicamente problemas comprobados o estructurales claros.

## Resultados

Revisión completada el 2026-09-06 con la skill UI/UX y verificación en Chromium mediante Playwright. Se conserva la identidad visual existente.

- Navegación principal móvil disponible mediante menú desplegable con seis enlaces, cierre al navegar y con Escape; menú de escritorio a partir de lg.
- Controles táctiles de al menos 44 px en los componentes revisados, campos de 16 px en móvil, etiquetas y textos largos adaptables.
- Marcadores, incidencias y formaciones ajustados para 320 px. Tablas con desplazamiento interno accesible por teclado y sin bloquear el desplazamiento vertical de la página.
- Formularios públicos, avisos, artículos, contenido legal, perfil y administración con anchos flexibles y ajuste de contenido. Tablas y bloques preformateados del contenido enriquecido se desplazan dentro de su contenedor.

Validación: 19 rutas públicas y cuatro variantes de detalle (partido con estadísticas y formación, jugador, estadio y copa con llaves), en cinco anchos: 115 comprobaciones sin desbordamiento horizontal de página. Incluye inicio, partidos, resultados, fixture, posiciones, plantel, en vivo, noticias, fichajes, newsletter, ingreso, registro, páginas legales y rutas EN de inicio, posiciones y registro. Se verificaron además enlaces del menú, Escape, cierre tras navegar, controles de formularios, cambio de formación, cuadro completo al 75 %, vista por ronda y menú en orientación horizontal de 812 × 375 px. Capturas revisadas de menú, registro y formación a 320 px, guardadas como artefactos locales ignorados por Git.

Checks finales aprobados: lint, las 33 pruebas de frontend, build de producción y revisión del diff sin errores de whitespace. La comprobación usa tamaños de viewport en Chromium; no constituye una prueba en dispositivos físicos o Safari. Perfil autenticado y administración fueron revisados por código, sin iniciar sesión ni modificar datos privados. El sitio local consultó únicamente datos públicos del API de producción.
