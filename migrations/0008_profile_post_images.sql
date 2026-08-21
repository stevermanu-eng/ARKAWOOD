-- v8.44: profile post images are added idempotently by prepareCommunityDb().
-- This checkpoint is intentionally harmless on databases that auto-upgraded first.
SELECT 1;
