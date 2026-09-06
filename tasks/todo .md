# Corrección de competiciones y posiciones — 2026-09-05

Actualización 2026-09-06: [revisión responsive](responsive-audit.md) completada con 115 comprobaciones de tamaño en navegador, correcciones de navegación y componentes, 33 pruebas y build aprobados.

Trabajo actual: [estadísticas del partido](match-statistics.md), incluidos posesión, remates y tarjetas, con sincronización y actualización en vivo.

Actualización 2026-09-06: completada la mejora de comodidad, adaptación móvil e idioma de las llaves. Plan y evidencia de las 29 pruebas, build y revisión en navegador en [playoffs-ux.md](playoffs-ux.md).

- [x] Diagnosticar datos publicados, agrupación de torneos, sincronización y cachés.
- [x] Sincronizar las competiciones de Boca y sus fixtures completos, grupos y eliminatorias; conservar datos ante errores del proveedor.
- [x] Separar Apertura/Clausura y tabla anual sin duplicar equipos ni sumar playoffs; ordenar cada tabla y actualizar resultados sin doble conteo.
- [x] Publicar contratos de temporada, fases, resultados, penales y fecha de actualización.
- [x] Mostrar competiciones, grupos, eliminatorias, resultados y próximos encuentros en la interfaz bilingüe, con actualización automática.
- [x] Verificar pruebas de regresión, build/lint y navegación real; revisar el diff y documentar limitaciones comprobadas.
- [x] Publicar por el flujo Git del proyecto y verificar el despliegue real.
- [ ] Completar la carga real de otros equipos y tablas internacionales en producción; revisar logs del sincronizador en el VPS (acceso solicitado).

## Criterios

Los datos se sirven desde Postgres. No se consultan proveedores durante la navegación. Las competiciones se descubren según la participación real de Boca en cada temporada. Se conservan las fases originales y no se deduce una tabla anual sumando tablas que puedan representar los mismos partidos. Los resultados se reconcilian solamente cuando la cobertura de fixtures permite hacerlo sin contar partidos dos veces. Las eliminatorias muestran resultados y penales, sin aportar puntos a las tablas de liga.

## Revisión

Diagnóstico publicado: 60 filas en cuatro grupos distintos (`Apertura - Group A/B`, `Clausura - Group A/B`), mezclados por la interfaz. El empate Gimnasia M. 2–2 Boca del 5 de septiembre ya figuraba finalizado, pero la tabla conservaba 10 puntos/7 PJ. Los ocho resultados de Clausura dan 11 puntos/8 PJ, 2G/5E/1P, GF9/GC10. El proveedor actualiza posiciones con menor frecuencia que los resultados.

La reconciliación compara el prefijo de partidos ya contabilizado contra PJ/G/E/P/GF/GC del proveedor antes de sumar resultados pendientes. Conserva ajustes de puntos, excluye eliminatorias y evita doble conteo. La tabla anual sólo combina las fases explícitas Apertura y Clausura de la liga argentina cuando tienen un único registro por equipo y los mismos participantes.

Verificación: 49 pruebas .NET aprobadas (incluidas cinco pruebas HTTP), seis regresiones de frontend aprobadas y lint sin errores. Modelo EF sin cambios pendientes después de generar la migración de fechas del proveedor, prórrogas y penales. Build final de Next aprobado: compilación, TypeScript y 57 páginas estáticas; páginas deportivas dinámicas.

Revisión final: paginación estable por fecha e ID externo para partidos simultáneos; GET de eventos/alineaciones sirve únicamente datos almacenados, evitando llamadas al proveedor por cada visita cuando no hay detalles. El detalle de marcador usa no-store para mostrar el cierre y los penales sin esperar la caché.

Navegador Chrome, escritorio/móvil y rutas es/en: cada zona de Clausura tiene 15 equipos distintos; Boca muestra 11 puntos/8 PJ y la anual 41 puntos/24 PJ. Selector de Copa Argentina muestra fixtures de otros equipos y penales; el detalle de esos encuentros responde 200. Se corrigió también un error de hidratación causado por espacios Unicode del formateo de fechas. Última carga es/en sin errores de consola.

La verificación visual utiliza un backend aislado en memoria con una copia de datos públicos (52 fixtures y 60 filas) y un único encuentro sintético claramente identificado para probar penales; no modifica datos reales. La cobertura completa de otros equipos requiere la primera sincronización del proveedor tras desplegar. Una clave local respondió 403; esa respuesta no se tomó como evidencia del estado del proveedor en producción. Los fallos del proveedor conservan datos y quedan registrados.

Producción: commit de código `a367af8` publicado en main. GitHub Actions `33996517881` terminó en success. `/es/posiciones` responde 200 y muestra Clausura con dos zonas de 15 equipos, Boca 11 puntos/8 PJ; la anual muestra 41 puntos/24 PJ. Consola del navegador sin errores. Los selectores muestran Liga, Libertadores, Sudamericana, Copa Argentina y amistosos para 2026.

Pendiente comprobado tras desplegar: el overview 2026 aún devuelve sólo los fixtures antiguos de Boca (Liga 33, Libertadores 6, Sudamericana 6, Copa Argentina 4), cero encuentros de otros equipos y ninguna tabla internacional. No se afirma que la carga completa esté funcionando en producción. El dashboard Hangfire responde 401; falta acceso a logs del VPS para identificar la causa real de la ingestión pendiente. La corrección de posiciones está verificada; la cobertura completa de datos sigue abierta.
