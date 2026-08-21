CREATE TABLE IF NOT EXISTS user_profiles (
  discord_user_id TEXT PRIMARY KEY,
  discord_username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  discord_avatar TEXT,
  minecraft_username TEXT,
  profile_photo TEXT,
  banner TEXT,
  bio TEXT NOT NULL DEFAULT '',
  birth_date TEXT,
  user_rank TEXT NOT NULL DEFAULT 'MIEMBRO',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS forum_posts (
  post_id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('actualizaciones','anuncios','modalidades','comunidad','informacion')),
  discord_user_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_forum_posts_category_created
  ON forum_posts(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author
  ON forum_posts(discord_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS profile_posts (
  post_id TEXT PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_profile_posts_author_created
  ON profile_posts(discord_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS profile_reports (
  report_id TEXT PRIMARY KEY,
  reporter_discord_id TEXT NOT NULL,
  reported_discord_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_profile_reports_target
  ON profile_reports(reported_discord_id, created_at DESC);
