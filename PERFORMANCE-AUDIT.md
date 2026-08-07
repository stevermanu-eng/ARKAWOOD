# Auditoría de rendimiento — ARKA WOOD v7

## Cuellos de botella detectados

1. Los dos PNG principales medían aproximadamente 2.3 MB en conjunto aunque se mostraban a tamaños muy inferiores.
2. Las miniaturas de postulaciones eran 1254×1254 aunque cada tarjeta las presenta a una fracción de ese tamaño.
3. El formulario cargaba `script.js` además de `moderation-form.js`, creando partículas animadas que no aportaban a la interacción.
4. Al escribir una sola tecla el formulario recalculaba todas las categorías, reconstruía el sidebar y el stepper, volvía a instalar listeners y escribía sin debounce en `localStorage`.
5. Los efectos de puntero consultaban `getBoundingClientRect()` en cada `pointermove` y escribían estilos a la misma frecuencia que el dispositivo generaba eventos.
6. El carrusel mantenía su intervalo incluso lejos del viewport.
7. Existían filtros de composición costosos en superficies fijas (`backdrop-filter`, filtros sobre fondos y `background-attachment: fixed`).
8. La pantalla de Moderación hacía dos consultas de red consecutivas antes de mostrar las preguntas: sesión y estado de postulación.

## Cambios aplicados

- Recursos gráficos recomprimidos y redimensionados.
- `loading="lazy"`, `decoding="async"`, `fetchpriority` y dimensiones explícitas según corresponda.
- Eliminación del overlay de ruido SVG de pantalla completa.
- Partículas solo en la portada y creadas en tiempo ocioso; menor cantidad en equipos modestos.
- Rayo/tilt/parallax actualizados como máximo una vez por frame.
- `content-visibility:auto` en bloques inferiores de páginas largas.
- Eliminación de `backdrop-filter` en superficies fijas principales y del fondo duplicado de Moderación.
- Delegación de eventos en el formulario y navegación.
- `localStorage` con debounce de 320 ms y guardado inmediato al ocultar/cerrar la página.
- Sidebar/stepper solo se reconstruyen cuando cambia el estado de completitud de una categoría.
- Autogrow de textarea agrupado por animation frame.
- Consultas de sesión/D1 paralelas.
- Caché de Cloudflare Pages mediante `_headers`.

El binding D1 utilizado por esta versión es exactamente `applications_db`.
