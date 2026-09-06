# Correcciones del usuario

## 2026-09-05 — Cobertura y exactitud deportiva

- Validar todas las competiciones de Boca por temporada, con grupos y eliminatorias, además del calendario del equipo.
- Conservar la identidad Apertura/Clausura y comprobar que cada tabla corresponde a una fase; nunca unir filas o sumar tablas por nombres parciales.
- Verificar puntos, partidos jugados y orden con resultados reales; comprobar el paso de en vivo a final y todas las capas de caché.
- Una pantalla que renderiza no demuestra la exactitud de los datos: probar empates, actualizaciones repetidas y exclusión de playoffs.

## 2026-09-05 — Entrega mediante autodeploy

- El usuario confirma que la entrega se realiza con push: el proyecto tiene autodeploy.
- Después de verificar los cambios, hacer commit y push; no pedir acceso SSH ni convertir la inspección del VPS en un requisito adicional de entrega.

## 2026-09-05 — Presentación de playoffs

- Mostrar las eliminatorias en un cuadro de llaves conectado por rondas, con resultados y fecha de cada encuentro; no reutilizar las cards del fixture en esa sección.
- Conservar ida/vuelta, global y penales cuando existan. No inventar cruces ni clasificados cuando los datos estén incompletos.

## 2026-09-06 — Comodidad de las llaves e idioma

- Un cuadro que cabe dentro de un scroll no alcanza: ofrecer navegación por ronda y acceso a Boca, texto legible y controles táctiles de al menos 44 px.
- Traducir también las etiquetas del proveedor en rondas, filtros y tablas; revisar la pantalla completa en español.
- Verificar las interacciones a 375, 768, 1024 y 1440 px, sin obligar a recorrer un lienzo gigante para encontrar el cruce actual.
