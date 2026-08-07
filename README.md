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
## Política de Privacidad

- Nueva página pública: `politica-privacidad.html`.
- Usa `assets/privacy-background.webp`, optimizado a partir del fondo legal suministrado.
- El contenido parte del documento revisado proporcionado para ARKA WOOD.
- La numeración quedó normalizada a **24 títulos y 135 artículos consecutivos**; también se corrigieron los prefijos de subapartados asociados a los artículos renumerados.
- `index.html` y `postulaciones.html` enlazan ahora a la Política de Privacidad desde el footer.
- Los formularios de staff enlazan la política desde la confirmación final de tratamiento de datos.
- El texto corregido se conserva en `docs/politica-privacidad-corregida.txt`.



## Documentos legales

- `politica-privacidad.html`: Política de Privacidad.
- `terminos-compra.html`: Términos y Condiciones de Compra.
- `terminos-network.html`: Términos y Condiciones de la Network / servidor.

Las versiones normalizadas de las minutas se conservan en `docs/`.


## Wiki (v0.8.6)

`/wiki/` reúne la identidad pública de ARKA WOOD, los tres reinos, las reglas resumidas de Minecraft, los criterios generales de Staff y los tres documentos legales. El encabezado y el footer de todas las páginas de la Wiki conservan el mismo contenido visible de Home.

La ruta `/wiki/auditoria-staff.html` está protegida mediante Discord OAuth y requiere el rol `1531538149967396964`. La comprobación se realiza del lado de Cloudflare y se renueva periódicamente.

Las rutas `/discord` y `/support` redirigen al Discord oficial mediante `_redirects`.
