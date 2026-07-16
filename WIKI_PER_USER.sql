-- Wiki: per-user ownership + Row Level Security
--
-- Supersedes WIKI_RESTRUCTURE_NO_RLS.sql, which left the wiki tables with no owner
-- column and RLS disabled -- meaning every authenticated user read, edited and deleted
-- the same single global wiki.
--
-- Ownership lives on `topics` only. `subjects` and `content_items` inherit it through
-- the topicId / subjectId foreign keys, the same way `links` inherit from `link_groups`
-- in UPDATE_LINKS_STRUCTURE.sql.
--
-- Safe to re-run.
--
-- Run in: Supabase Dashboard -> SQL Editor -> New Query

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Ownership column on topics
-- ---------------------------------------------------------------------------

ALTER TABLE topics ADD COLUMN IF NOT EXISTS "userId" UUID;

-- Backfill: the wiki was global, so nothing records who authored what.
-- All pre-existing content is assigned to this user.
UPDATE topics
SET "userId" = '97e8e307-85d0-48c8-93f5-b2849b5c6e6e'
WHERE "userId" IS NULL;

ALTER TABLE topics ALTER COLUMN "userId" SET NOT NULL;

-- Tie ownership to the auth user, so deleting an account reaps its wiki.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'topics_userId_fkey'
  ) THEN
    ALTER TABLE topics
      ADD CONSTRAINT "topics_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "topics_userId_idx" ON topics("userId");

-- ---------------------------------------------------------------------------
-- 2. Slugs are unique per user, not globally
--
-- A global UNIQUE(slug) would stop user B from creating a "getting-started"
-- topic merely because user A already had one -- a collision error that leaks
-- the existence of another user's content.
-- ---------------------------------------------------------------------------

ALTER TABLE topics DROP CONSTRAINT IF EXISTS topics_slug_key;
ALTER TABLE topics DROP CONSTRAINT IF EXISTS "topics_userId_slug_key";
ALTER TABLE topics ADD CONSTRAINT "topics_userId_slug_key" UNIQUE ("userId", slug);

-- ---------------------------------------------------------------------------
-- 3. Privileges
--
-- The app talks to Postgres as `authenticated` (publishable key + user session
-- cookie). `anon` has no business reading the wiki at all.
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON topics, subjects, content_items TO authenticated;
REVOKE ALL ON topics, subjects, content_items FROM anon;

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
--
-- NOTE: DATABASE_SETUP.sql previously enabled RLS on these tables but never
-- created a single policy. RLS with zero policies denies everything, which is
-- why setup appeared "broken" and RLS got switched off instead of fixed.
-- Enabling it *with* policies is the actual fix.
--
-- auth.uid() is wrapped in a scalar subquery so Postgres evaluates it once per
-- query (initPlan) rather than once per row.
-- ---------------------------------------------------------------------------

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Force RLS for the table owner too, so nothing silently bypasses it.
ALTER TABLE topics FORCE ROW LEVEL SECURITY;
ALTER TABLE subjects FORCE ROW LEVEL SECURITY;
ALTER TABLE content_items FORCE ROW LEVEL SECURITY;

-- topics: owned directly
DROP POLICY IF EXISTS "Users can view their own topics" ON topics;
CREATE POLICY "Users can view their own topics"
  ON topics FOR SELECT
  USING ("userId" = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own topics" ON topics;
CREATE POLICY "Users can insert their own topics"
  ON topics FOR INSERT
  WITH CHECK ("userId" = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own topics" ON topics;
CREATE POLICY "Users can update their own topics"
  ON topics FOR UPDATE
  USING ("userId" = (SELECT auth.uid()))
  WITH CHECK ("userId" = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own topics" ON topics;
CREATE POLICY "Users can delete their own topics"
  ON topics FOR DELETE
  USING ("userId" = (SELECT auth.uid()));

-- subjects: owned via their topic
DROP POLICY IF EXISTS "Users can view subjects in their topics" ON subjects;
CREATE POLICY "Users can view subjects in their topics"
  ON subjects FOR SELECT
  USING ("topicId" IN (SELECT id FROM topics WHERE "userId" = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can insert subjects in their topics" ON subjects;
CREATE POLICY "Users can insert subjects in their topics"
  ON subjects FOR INSERT
  WITH CHECK ("topicId" IN (SELECT id FROM topics WHERE "userId" = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can update subjects in their topics" ON subjects;
CREATE POLICY "Users can update subjects in their topics"
  ON subjects FOR UPDATE
  USING ("topicId" IN (SELECT id FROM topics WHERE "userId" = (SELECT auth.uid())))
  WITH CHECK ("topicId" IN (SELECT id FROM topics WHERE "userId" = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can delete subjects in their topics" ON subjects;
CREATE POLICY "Users can delete subjects in their topics"
  ON subjects FOR DELETE
  USING ("topicId" IN (SELECT id FROM topics WHERE "userId" = (SELECT auth.uid())));

-- content_items: owned via subject -> topic
DROP POLICY IF EXISTS "Users can view content in their subjects" ON content_items;
CREATE POLICY "Users can view content in their subjects"
  ON content_items FOR SELECT
  USING ("subjectId" IN (
    SELECT s.id FROM subjects s
    JOIN topics t ON t.id = s."topicId"
    WHERE t."userId" = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Users can insert content in their subjects" ON content_items;
CREATE POLICY "Users can insert content in their subjects"
  ON content_items FOR INSERT
  WITH CHECK ("subjectId" IN (
    SELECT s.id FROM subjects s
    JOIN topics t ON t.id = s."topicId"
    WHERE t."userId" = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update content in their subjects" ON content_items;
CREATE POLICY "Users can update content in their subjects"
  ON content_items FOR UPDATE
  USING ("subjectId" IN (
    SELECT s.id FROM subjects s
    JOIN topics t ON t.id = s."topicId"
    WHERE t."userId" = (SELECT auth.uid())
  ))
  WITH CHECK ("subjectId" IN (
    SELECT s.id FROM subjects s
    JOIN topics t ON t.id = s."topicId"
    WHERE t."userId" = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Users can delete content in their subjects" ON content_items;
CREATE POLICY "Users can delete content in their subjects"
  ON content_items FOR DELETE
  USING ("subjectId" IN (
    SELECT s.id FROM subjects s
    JOIN topics t ON t.id = s."topicId"
    WHERE t."userId" = (SELECT auth.uid())
  ));

COMMIT;

-- ---------------------------------------------------------------------------
-- Verify: every wiki table should report rowsecurity = true and 4 policies.
-- ---------------------------------------------------------------------------

SELECT
  c.relname          AS table_name,
  c.relrowsecurity   AS rls_enabled,
  count(p.polname)   AS policy_count
FROM pg_class c
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE c.relname IN ('topics', 'subjects', 'content_items')
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;

-- Every topic must now have an owner (expect 0 rows).
SELECT id, title, slug FROM topics WHERE "userId" IS NULL;
