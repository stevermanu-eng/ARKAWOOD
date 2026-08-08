CREATE TABLE IF NOT EXISTS staff_applications (
  application_id TEXT PRIMARY KEY,
  branch TEXT NOT NULL CHECK (branch IN ('moderation', 'builders', 'marketing')),
  discord_user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar TEXT,
  started_at TEXT,
  submitted_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted')),
  webhook_message_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_staff_applications_status
  ON staff_applications(status);

CREATE INDEX IF NOT EXISTS idx_staff_applications_branch
  ON staff_applications(branch);
