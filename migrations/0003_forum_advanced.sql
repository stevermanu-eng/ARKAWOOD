-- ARKA WOOD v8.17.0
-- Esta migración documenta el esquema avanzado. Las Pages Functions también
-- autocrean/actualizan estas tablas cuando detectan una D1 enlazada.

CREATE TABLE IF NOT EXISTS forum_replies (
  reply_id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_forum_replies_post_created
  ON forum_replies(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author
  ON forum_replies(discord_user_id, created_at DESC);

-- En instalaciones que ya tengan forum_posts, las columnas adicionales son
-- incorporadas de forma idempotente por functions/_lib/communityStore.js.
