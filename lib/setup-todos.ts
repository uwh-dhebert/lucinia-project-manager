import postgres from 'postgres';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS project_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES project_todos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  link_url TEXT,
  completed BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  story_id UUID,
  item_type VARCHAR(50) DEFAULT 'custom',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_todos_project_id ON project_todos(project_id);
CREATE INDEX IF NOT EXISTS idx_project_todos_parent_id ON project_todos(parent_id);
CREATE INDEX IF NOT EXISTS idx_project_todos_story_id ON project_todos(story_id);

GRANT ALL ON project_todos TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
`;

export async function ensureProjectTodosTable(): Promise<{ created: boolean; message: string }> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  const db = postgres(databaseUrl, { ssl: 'require', max: 1 });

  try {
    await db.unsafe(MIGRATION_SQL);
    return { created: true, message: 'Project todos table is configured' };
  } finally {
    await db.end();
  }
}

export function isTodosTableMissingError(message?: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('could not find the table') ||
    lower.includes('schema cache') ||
    lower.includes('does not exist') ||
    lower.includes('project_todos')
  );
}