# ARKA WOOD — Web + Postulaciones

Proyecto web de ARKA WOOD preparado para **GitHub + Cloudflare Pages**. Mantiene el diseño existente y añade autenticación Discord, formulario completo de Moderación, D1 para control de duplicados/contador y entrega privada por webhook.

## Moderación v7

- Discord OAuth2 obligatorio.
- La cuenta debe pertenecer al servidor `1526622720123736295`.
- Las 28 preguntas continúan siendo obligatorias.
- Los campos extensos usan textareas grandes con crecimiento automático.
- Ninguna cuenta Discord puede registrar una segunda postulación.
- El estado de envío se registra en Cloudflare D1 mediante el binding `applications_db`.
- Tras el envío se abre una página de confirmación con un contador de `32 + registros`.
- Si la sesión Discord sigue activa, el avatar aparece también en la parte superior de la página principal.

## Discord

Moderación envía **2 embeds** de 14 preguntas. Cada pregunta ocupa su propio field e incluye categoría, número, texto de la pregunta y vista de la respuesta. El mismo webhook adjunta un `.txt` con las respuestas íntegras para conservar contenido que supere los límites visuales de Discord.

Webhooks previstos:

- `DISCORD_WEBHOOK_MODERATION`
- `DISCORD_WEBHOOK_BUILDERS`
- `DISCORD_WEBHOOK_MARKETING`

Las URL de webhook son Secrets y nunca deben subirse a GitHub.

## Base de datos D1

Antes de aceptar envíos reales:

1. crea una base D1;
2. ejecuta `migrations/0001_staff_applications.sql`;
3. enlázala al proyecto Pages con el nombre exacto `applications_db`;
4. vuelve a desplegar.

La base no almacena las respuestas del formulario: mantiene identidad Discord y metadatos mínimos de la solicitud para evitar duplicados y calcular el contador.

Consulta `CLOUDFLARE-SETUP.md` para el procedimiento completo.

## Build

```text
Build command: npm run build
Build output directory: dist
Root directory: /
```

La carpeta `/functions` se conserva fuera de `/dist`.

## Rendimiento v7

- Logos convertidos a WebP y redimensionados al tamaño real de uso.
- Miniaturas y fondos WebP recomprimidos para reducir transferencia.
- Lazy loading en imágenes fuera del primer viewport y dimensiones explícitas para evitar saltos de layout.
- Animaciones decorativas diferidas y reducidas; se eliminan partículas de las páginas de formulario.
- Carrusel pausado cuando está fuera de pantalla.
- Pointer/scroll animations agrupadas con requestAnimationFrame.
- El formulario usa delegación de eventos, guardado local con debounce y evita reconstruir sidebar/stepper en cada tecla.
- Sesión y estado D1 se consultan en paralelo.
- `_headers` añade caché para recursos estáticos en Cloudflare Pages.


## Ramas activas

- Moderación → `DISCORD_WEBHOOK_MODERATION`
- Builders → `DISCORD_WEBHOOK_BUILDERS`
- Marketing / Management → `DISCORD_WEBHOOK_MARKETING`

Las tres usan Discord OAuth, pertenencia obligatoria al servidor y el mismo bloqueo por Discord User ID para impedir postulaciones duplicadas. Administración continúa cerrada porque no se ha proporcionado todavía un cuestionario para esa rama.
