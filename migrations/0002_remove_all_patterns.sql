-- One-off, at the owner's request (2026-10-02): empty the site of its patterns
-- so it starts fresh with articles published from ContentOps.
-- Only the patterns table is cleared; subscribers are untouched.
-- The removed sample patterns are all in seed/seed.sql (npm run db:seed:remote).
DELETE FROM patterns;
