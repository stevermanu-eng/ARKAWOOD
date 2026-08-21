-- ARKA WOOD v8.21.0
-- Notificaciones persistentes del foro. Las columnas sociales de forum_posts y
-- forum_replies se incorporan de forma idempotente en communityStore.js para
-- funcionar tanto en D1 nuevas como en bases ya desplegadas sin duplicar ALTER.

CREATE TABLE IF NOT EXISTS forum_notifications (
  notification_id TEXT PRIMARY KEY,
  recipient_discord_id TEXT NOT NULL,
  actor_discord_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  post_id TEXT,
  reply_id TEXT,
  message TEXT NOT NULL DEFAULT '',
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_forum_notifications_recipient
  ON forum_notifications(recipient_discord_id, read_at, created_at DESC);
