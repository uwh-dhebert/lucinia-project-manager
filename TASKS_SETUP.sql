-- Standalone Task List
-- =============================================================================
-- Backs the /tasks page. A task belongs to its creator (owner_id) and may be
-- assigned to one other user (assignee_id). Assigning a task IS how it is
-- shared: the assignee gains read/write access. RLS enforces the owner-or-
-- assignee access model at the database layer.
--
-- The app talks to Postgres as `authenticated`; `service_role` bypasses RLS for
-- admin scripts; `anon` should reach this table not at all.
--
-- Safe to re-run. Run in: Supabase Dashboard -> SQL Editor -> New Query
-- (The app also self-heals this table on first use via lib/setup-tasks.ts.)

BEGIN;

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  assignee_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON tasks FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;
GRANT ALL ON tasks TO service_role;

DROP POLICY IF EXISTS tasks_select ON tasks;
CREATE POLICY tasks_select ON tasks FOR SELECT
  USING (owner_id = (SELECT auth.uid()) OR assignee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS tasks_insert ON tasks;
CREATE POLICY tasks_insert ON tasks FOR INSERT
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS tasks_update ON tasks;
CREATE POLICY tasks_update ON tasks FOR UPDATE
  USING (owner_id = (SELECT auth.uid()) OR assignee_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()) OR assignee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS tasks_delete ON tasks;
CREATE POLICY tasks_delete ON tasks FOR DELETE
  USING (owner_id = (SELECT auth.uid()));

COMMIT;

NOTIFY pgrst, 'reload schema';
