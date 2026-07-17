import postgres from 'postgres';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS project_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_summaries_project_id ON project_summaries(project_id);

GRANT ALL ON project_summaries TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
`;

export async function ensureProjectSummaryTable(): Promise<{ created: boolean; message: string }> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  const db = postgres(databaseUrl, { ssl: 'require', max: 1 });

  try {
    await db.unsafe(MIGRATION_SQL);
    return { created: true, message: 'Project summaries table is configured' };
  } finally {
    await db.end();
  }
}

export function isSummaryTableMissingError(message?: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('could not find the table') ||
    lower.includes('schema cache') ||
    lower.includes('does not exist') ||
    lower.includes('project_summaries')
  );
}