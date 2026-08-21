-- v8.42: social links are added idempotently by prepareCommunityDb().
-- This checkpoint is intentionally harmless on databases that auto-upgraded first.
SELECT 1;
