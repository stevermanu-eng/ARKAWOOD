-- v8.36: user_profiles.visible_roles is added idempotently by prepareCommunityDb().
-- Keeping this migration as a harmless checkpoint avoids duplicate-column failures
-- on D1 databases that received the automatic schema upgrade before migrations run.
SELECT 1;
