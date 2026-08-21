-- ARKA WOOD v8.26.0 — checkpoint de roles de Discord.
-- functions/_lib/communityStore.js incorpora user_roles y roles_synced_at de forma
-- idempotente. Mantener ALTER TABLE aquí provocaba "duplicate column" en bases D1
-- que ya habían recibido el auto-upgrade antes de ejecutar migraciones históricas.
SELECT 1;
