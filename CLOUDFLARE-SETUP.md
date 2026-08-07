# ARKA WOOD — GitHub + Cloudflare + Discord + D1

## 1. Datos ya incorporados

- Discord Client ID: `1532912146604621924`
- Discord Guild ID: `1526622720123736295`
- Invite actual de la web: `https://discord.gg/HxEbRcQD7`
- OAuth scopes: `identify guilds.members.read`
- Contador público inicial: `32` postulaciones previas + las registradas en D1.

El acceso a las preguntas de Moderación solo se habilita si Discord confirma que la cuenta pertenece al Guild indicado.

## 2. Variables y Secrets de Cloudflare

### Variables

```text
DISCORD_CLIENT_ID=1532912146604621924
DISCORD_GUILD_ID=1526622720123736295
DISCORD_REDIRECT_URI=https://TU-DOMINIO/api/auth/callback
```

### Secrets

```text
DISCORD_CLIENT_SECRET=...
SESSION_SECRET=...
DISCORD_WEBHOOK_MODERATION=...
DISCORD_WEBHOOK_BUILDERS=...
DISCORD_WEBHOOK_MARKETING=...
```

No guardes ninguno de los Secrets en GitHub, HTML o JavaScript público.

## 3. NUEVO: base D1 obligatoria

La v6 usa Cloudflare D1 para dos funciones que no pueden depender del navegador:

1. impedir que un mismo Discord User ID envíe otra postulación;
2. calcular el contador `32 + postulaciones registradas` de la pantalla final.

### Crear D1 desde Cloudflare

1. En Cloudflare abre **Storage & Databases → D1**.
2. Crea una base llamada, por ejemplo, `arka-wood-applications`.
3. Abre su consola SQL.
4. Copia y ejecuta todo el contenido de:

```text
migrations/0001_staff_applications.sql
```

5. Vuelve a tu proyecto de Pages.
6. Ve a **Settings → Bindings → Add → D1 database**.
7. En **Variable name** escribe exactamente:

```text
applications_db
```

8. Selecciona la base `arka-wood-applications`.
9. Guarda y vuelve a desplegar el proyecto.

`applications_db` es un **binding**, no un Secret de texto.

La tabla NO guarda las 28 respuestas, el teléfono ni el correo. Guarda únicamente la identidad básica de Discord ya autorizada, el ID/fecha/rama de la postulación y datos técnicos mínimos para impedir duplicados y contar envíos. Las respuestas completas siguen llegando al canal privado mediante webhook.

## 4. Discord Developer Portal

En OAuth2 → Redirects registra exactamente:

```text
https://TU-DOMINIO/api/auth/callback
```

Para desarrollo local puedes registrar además:

```text
http://localhost:8788/api/auth/callback
```

## 5. Webhooks

Cada rama usa un canal distinto:

1. Moderación → `DISCORD_WEBHOOK_MODERATION`
2. Builders → `DISCORD_WEBHOOK_BUILDERS`
3. Marketing → `DISCORD_WEBHOOK_MARKETING`

En esta versión el formulario activo es Moderación.

## 6. Qué ocurre al enviar Moderación

1. Cloudflare comprueba de nuevo sesión Discord + pertenencia al servidor.
2. Valida las 28 preguntas obligatorias y el consentimiento final.
3. Comprueba D1 y bloquea el envío si ese Discord User ID ya tiene una postulación.
4. Reserva el Discord User ID en D1 para evitar dos envíos simultáneos.
5. Envía la solicitud al webhook privado de Moderación.
6. Discord recibe **2 embeds** con **14 preguntas por embed**.
7. Cada pregunta es un `field`: `CATEGORÍA N · PREGUNTA NN`, seguido de la pregunta en negrita y una vista de la respuesta con `-#`.
8. El mismo mensaje adjunta un `.txt` con las 28 respuestas completas.
9. Cuando Discord confirma el mensaje, D1 marca la solicitud como enviada.
10. La web redirige a `postulacion-enviada.html`, actualiza el contador y muestra las indicaciones de seguimiento.

Discord limita el total combinado de texto de los embeds. Por eso las 28 preguntas siempre aparecen como fields en los 2 embeds, pero una respuesta extremadamente larga puede verse abreviada dentro del embed. El archivo `.txt` del mismo mensaje conserva el texto completo.

## 7. GitHub → Cloudflare Pages

En Cloudflare Pages:

```text
Build command: npm run build
Build output directory: dist
Root directory: /
```

La carpeta `functions/` debe permanecer en la raíz del repositorio.

## 8. Desarrollo local

```bash
cp .dev.vars.example .dev.vars
npm run build
npx wrangler pages dev dist --port 8788
```

Para probar D1 localmente debes enlazar también una base D1 a `applications_db` mediante Wrangler.

## 9. Archivos importantes nuevos

```text
migrations/0001_staff_applications.sql
functions/_lib/applicationStore.js
functions/api/applications/me.js
functions/api/applications/stats.js
postulacion-enviada.html
submission-success.js
```


## Postulaciones habilitadas

Esta versión habilita Moderación, Builders y Marketing / Management. Cada rama necesita su Secret de webhook correspondiente. No es necesario crear nuevas tablas D1: todas comparten `applications_db` y el bloqueo de una postulación por Discord User ID.
