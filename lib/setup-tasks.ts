import postgres from 'postgres';

// The `tasks` table backs the standalone task list. Access model: the creator
// (owner_id) and the assignee (assignee_id) can both see and edit a task —
// assigning IS sharing. RLS enforces that at the database layer so a leaked
// query can't reach tasks that are neither yours nor assigned to you.
const MIGRATION_SQL = `
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

-- anon has no business here; only the authenticated app role and admin scripts.
REVOKE ALL ON tasks FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;
GRANT ALL ON tasks TO service_role;

DROP POLICY IF EXISTS tasks_select ON tasks;
CREATE POLICY tasks_select ON tasks FOR SELECT
  USING (owner_id = (SELECT auth.uid()) OR assignee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS tasks_insert ON tasks;
CREATE POLICY tasks_insert ON tasks FOR INSERT
  WITH CHECK (owner_id = (SELECT auth.uid()));

-- Owner or assignee may update; the owner stays the owner (WITH CHECK).
DROP POLICY IF EXISTS tasks_update ON tasks;
CREATE POLICY tasks_update ON tasks FOR UPDATE
  USING (owner_id = (SELECT auth.uid()) OR assignee_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()) OR assignee_id = (SELECT auth.uid()));

-- Only the creator can delete a task.
DROP POLICY IF EXISTS tasks_delete ON tasks;
CREATE POLICY tasks_delete ON tasks FOR DELETE
  USING (owner_id = (SELECT auth.uid()));

NOTIFY pgrst, 'reload schema';
`;

export async function ensureTasksTable(): Promise<{ created: boolean; message: string }> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  const db = postgres(databaseUrl, { ssl: 'require', max: 1 });

  try {
    await db.unsafe(MIGRATION_SQL);
    return { created: true, message: 'Tasks table is configured' };
  } finally {
    await db.end();
  }
}

export function isTasksTableMissingError(message?: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('could not find the table') ||
    lower.includes('schema cache') ||
    lower.includes('does not exist') ||
    lower.includes("relation \"tasks\"") ||
    lower.includes('tasks')
  );
}
