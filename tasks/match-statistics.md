# Estadísticas del partido

- [x] Incorporar estadísticas por equipo desde el proveedor, persistencia y carga automática de partidos anteriores.
- [x] Exponer consulta y actualización en vivo, sin reemplazar datos ausentes por ceros.
- [x] Mostrar comparación local/visitante: posesión, remates, tarjetas, faltas, córners, pases y demás estadísticas disponibles, en ES/EN y móvil.
- [x] Verificar sincronización, API, interfaz, estados vacíos y actualización en vivo; ejecutar pruebas/build.
- [x] Commit y push a main para autodeploy.

## Diseño

Datos de estadísticas por equipo del proveedor, no suma de jugadores. Valores numéricos con null para desconocidos; conservar cero real y porcentajes. Local y visitante siempre alineados al partido. Comparación accesible con barras y valores legibles, cerca del marcador; mensajes distintos para partido programado, estadísticas no informadas y errores de carga. SSE debe refrescar también la posesión y remates hasta el cierre. Carga anterior automática para que no se limite a nuevos partidos.

## Revisión

60 pruebas .NET y 33 de frontend aprobadas. Lint, TypeScript y build de producción aprobados (141 páginas). Migración AddFixtureTeamStatistics generada; EF no detecta cambios pendientes de modelo. La API aplica las migraciones al iniciar.

Se guardan hasta 18 métricas oficiales por equipo. GET no-store y SSE incluyen la misma comparación local/visitante. Las pruebas cubren valores nulos/cero, porcentajes, decimales con cultura española, actualización repetida y conservación ante errores; alineación por equipo, endpoint ausente y snapshot final.

La cola existente procesa ocho partidos anteriores de Boca cada 30 minutos, priorizando los nunca consultados de forma explícita también en PostgreSQL. Se revisitan finales recientes y datos históricos de más de siete días, con esperas entre intentos para no bloquear la cola con competiciones sin cobertura. Los partidos anteriores se completarán progresivamente con las ejecuciones del proveedor.

Chrome: 18 métricas expandibles; posesión en vivo 62/38 a 64/36 sin recargar, cierre del partido conservando estadísticas; partido programado, ausencia de datos, error HTTP y botón de reintento. Vistas de 320/375/768/1440 px sin desbordes, español/inglés y temas claro/oscuro. Sin errores de consola. Prueba local con datos sintéticos y servidor SSE aislado, sin alterar datos publicados.

Entrega por commit y push a main; autodeploy existente.
