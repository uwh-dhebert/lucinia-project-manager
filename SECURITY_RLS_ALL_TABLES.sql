-- Security: Row Level Security on every remaining project / user-owned table
-- =============================================================================
-- Fixes the audit's CRITICAL finding: most tables had RLS DISABLED, so the only
-- protection was .eq() filtering in route code, and three tables were GRANTed to
-- `anon` -- letting an unauthenticated caller read/write them through the Supabase
-- Data API (`/rest/v1/<table>`), bypassing every route check.
--
-- Modeled on WIKI_PER_USER.sql. The app talks to Postgres as `authenticated`
-- (publishable key + user session cookie); `service_role` bypasses RLS for admin
-- scripts; `anon` should reach none of these tables.
--
-- Ownership model:
--   * Project family  -> access = own the project OR be a member of it.
--   * User-owned       -> access = the row's "userId" is you.
--
-- Live column names were confirmed from the route code (they differ from the
-- stale DATABASE_SETUP.sql): the project-family child tables use snake_case
-- project_id, while project_members / generated_documents / chat_* /
-- story_recommendations use camelCase "projectId" / "userId".
--
-- Safe to re-run.
-- Run in: Supabase Dashboard -> SQL Editor -> New Query

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Access helper functions
--
-- These are SECURITY DEFINER so they run as the table owner and are exempt from
-- RLS on projects / project_members (the tables are ENABLEd, not FORCEd, so the
-- owner bypasses them). That breaks what would otherwise be mutual recursion:
-- a projects policy that reads project_members, whose policy reads projects, ...
--
-- auth.uid() is wrapped in a scalar subquery so it is evaluated once per query.
-- search_path is pinned to defeat search_path hijacking of a SECURITY DEFINER fn.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_project_owner(pid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = pid
      AND p."ownerId" = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_project(pid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = pid
      AND (
        p."ownerId" = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM project_members m
          WHERE m."projectId" = p.id
            AND m."userId" = (SELECT auth.uid())
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_project_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_project(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_project(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Privileges: authenticated can use these tables; anon cannot.
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON
  projects,
  project_members,
  project_stories,
  project_notes,
  project_design_docs,
  project_todos,
  project_summaries,
  generated_documents,
  chat_conversations,
  chat_messages,
  story_recommendations
TO authenticated;

REVOKE ALL ON
  projects,
  project_members,
  project_stories,
  project_notes,
  project_design_docs,
  project_todos,
  project_summaries,
  generated_documents,
  chat_conversations,
  chat_messages,
  story_recommendations
FROM anon;

-- ---------------------------------------------------------------------------
-- 3. projects -- owner-or-member read/update, owner-only create/delete
-- ---------------------------------------------------------------------------

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_select ON projects;
CREATE POLICY projects_select ON projects FOR SELECT
  USING (public.can_access_project(id));

DROP POLICY IF EXISTS projects_insert ON projects;
CREATE POLICY projects_insert ON projects FOR INSERT
  WITH CHECK ("ownerId" = (SELECT auth.uid()));

DROP POLICY IF EXISTS projects_update ON projects;
CREATE POLICY projects_update ON projects FOR UPDATE
  USING (public.can_access_project(id))
  WITH CHECK (public.can_access_project(id));

DROP POLICY IF EXISTS projects_delete ON projects;
CREATE POLICY projects_delete ON projects FOR DELETE
  USING ("ownerId" = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- 4. project_members -- any member may list the roster; only the owner may
--    add/change members; owner or the member themselves may remove a row.
-- ---------------------------------------------------------------------------

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_members_select ON project_members;
CREATE POLICY project_members_select ON project_members FOR SELECT
  USING (public.can_access_project("projectId"));

DROP POLICY IF EXISTS project_members_insert ON project_members;
CREATE POLICY project_members_insert ON project_members FOR INSERT
  WITH CHECK (public.is_project_owner("projectId"));

DROP POLICY IF EXISTS project_members_update ON project_members;
CREATE POLICY project_members_update ON project_members FOR UPDATE
  USING (public.is_project_owner("projectId"))
  WITH CHECK (public.is_project_owner("projectId"));

DROP POLICY IF EXISTS project_members_delete ON project_members;
CREATE POLICY project_members_delete ON project_members FOR DELETE
  USING (public.is_project_owner("projectId") OR "userId" = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. Project-family child tables -- access inherited from the parent project.
--    Generated with a loop so every table gets the identical 4 policies against
--    its own project-id column.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('project_stories',     'project_id'),
      ('project_notes',       'project_id'),
      ('project_design_docs', 'project_id'),
      ('project_todos',       'project_id'),
      ('project_summaries',   'project_id'),
      ('generated_documents', 'projectId')
    ) AS t(tbl, col)
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.tbl);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.tbl || '_select', r.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (public.can_access_project(%I))',
      r.tbl || '_select', r.tbl, r.col);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.tbl || '_insert', r.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (public.can_access_project(%I))',
      r.tbl || '_insert', r.tbl, r.col);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.tbl || '_update', r.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE USING (public.can_access_project(%I)) WITH CHECK (public.can_access_project(%I))',
      r.tbl || '_update', r.tbl, r.col, r.col);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.tbl || '_delete', r.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE USING (public.can_access_project(%I))',
      r.tbl || '_delete', r.tbl, r.col);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6. User-owned tables -- the row's "userId" must be the caller.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['chat_conversations', 'chat_messages', 'story_recommendations']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING ("userId" = (SELECT auth.uid()))',
      t || '_select', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT WITH CHECK ("userId" = (SELECT auth.uid()))',
      t || '_insert', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE USING ("userId" = (SELECT auth.uid())) WITH CHECK ("userId" = (SELECT auth.uid()))',
      t || '_update', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE USING ("userId" = (SELECT auth.uid()))',
      t || '_delete', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 7. project_priorities -- drop the vestigial table. Priorities live as columns
--    (priorityZone / priorityOrder / responsible) on `projects`, and no code
--    references a project_priorities table. It had RLS on with zero policies
--    (deny-all), so this removes dead weight without changing any behavior.
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS project_priorities;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Post-apply verification (run separately; read-only, rolls back).
-- ---------------------------------------------------------------------------

-- (a) Every target table reports RLS enabled with 4 policies (projects/members
--     included).
SELECT
  c.relname        AS table_name,
  c.relrowsecurity AS rls_enabled,
  count(p.polname) AS policy_count
FROM pg_class c
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE c.relname IN (
  'projects', 'project_members', 'project_stories', 'project_notes',
  'project_design_docs', 'project_todos', 'project_summaries',
  'generated_documents', 'chat_conversations', 'chat_messages',
  'story_recommendations'
)
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;

-- (b) anon holds no privileges on any target table (expect 0 rows).
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
  AND table_name IN (
    'projects', 'project_members', 'project_stories', 'project_notes',
    'project_design_docs', 'project_todos', 'project_summaries',
    'generated_documents', 'chat_conversations', 'chat_messages',
    'story_recommendations'
  );

-- (c) A non-member authenticated user sees 0 rows of a project they don't belong
--     to. Replace the UUIDs, run inside a transaction, and ROLLBACK.
--
-- BEGIN;
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims = '{"sub":"<OTHER_USER_ID>","role":"authenticated"}';
-- SELECT count(*) AS visible_projects   FROM projects        WHERE id = '<PROJECT_ID>';
-- SELECT count(*) AS visible_stories    FROM project_stories WHERE project_id = '<PROJECT_ID>';
-- SELECT count(*) AS visible_notes      FROM project_notes   WHERE project_id = '<PROJECT_ID>';
-- ROLLBACK;
